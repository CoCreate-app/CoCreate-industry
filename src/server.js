class CoCreateIndustry {
    constructor(crud) {
        this.wsManager = crud.wsManager
        this.crud = crud
        this.init()
    }

    init() {
        if (this.wsManager) {
            this.wsManager.on('createIndustry', (socket, data) => this.createIndustry(socket, data));
            this.wsManager.on('deleteIndustry', (socket, data) => this.deleteIndustry(socket, data));
            this.wsManager.on('runIndustry', (socket, data) => this.runIndustry(socket, data));
        }
    }

    // TODO: perform action on primary db only and improve params names
    /**
     * Create industry
     **/
    async createIndustry(socket, data) {
        try {
            let { organization_id, db, industry_id } = data;
            const self = this;

            let orgDocument = await this.crud.readDocument({
                database: organization_id,
                collection: 'organizations',
                document: { _id: organization_id },
                organization_id
            })

            orgDocument = orgDocument.document[0]

            let subdomain = orgDocument && orgDocument.hosts ? orgDocument.hosts[0] : "";
            let update = {
                database: organization_id,
                collection: data.collection,
                document: {
                    ...data.data,
                    organization_data: {
                        subdomain,
                        organization_id,
                        key: orgDocument.key
                    }
                },
                organization_id
            }

            let insertResult;
            if (industry_id) {
                update.document._id = industry_id
                insertResult = await this.crud.updateDocument(update)

                await this.deleteIndustryDocuments(socket, data)
                console.log('deleting')
            } else {
                insertResult = await this.crud.createDocument(update);
                industry_id = `${insertResult.document[0]._id}`;
            }

            //. create inustryDocuments
            const exclusion_collections = ["users", "organizations", "industries", "industry_documents", "crdt-transactions", "metrics"];
            let collections = await this.crud.readCollection({ database: organization_id, organization_id })
            collections = collections.collection
            for (let i = 0; i < collections.length; i++) {
                let collection = collections[i].name;
                if (exclusion_collections.indexOf(collection) > -1) {
                    continue;
                }
                await self.createIndustryDocuments(collection, industry_id, organization_id, db);
            }

            //. update subdomain
            const response = {
                'db': data['db'],
                'collection': data.collection,
                'document_id': industry_id,
                'organization_id': organization_id,
                'industry_id': industry_id,
                'data': data.data,
                'metadata': data['metadata'],
            }

            self.wsManager.send(socket, 'createIndustry', response);
            self.broadcast('createDocument', socket, response)

        } catch (error) {
            console.log(error)
        }
    }

    async createIndustryDocuments(collectionName, industryId, organizationId, targetDB) {
        try {
            const query = {
                database: organizationId,
                collection: collectionName,
                organization_id: organizationId
            }

            // TODO: support for opening cursor with crud?
            // const documentCursor = collection.find(query);
            // await documentCursor.forEach(async (document) => {

            const documents = await this.crud.readDocument(query);
            for (let document of documents.document) {
                let documentId = document['_id'].toString();

                delete document['_id'];

                let Data = {
                    database: targetDB,
                    collection: 'industry_documents',
                    document: {
                        industry_data: {
                            document_id: documentId,
                            industry_id: industryId,
                            collection: collectionName
                        }
                    },
                    filter: {
                        query: [
                            { name: "industry_data.document_id", value: documentId, operator: '$eq' },
                            { name: "industry_data.industry_id", value: industryId, operator: '$eq' },
                            { name: "industry_data.collection", value: collectionName, operator: '$eq' }
                        ]
                    },
                    organization_id: organizationId,
                    upsert: true
                }

                this.crud.updateDocument(Data)
            }
        }
        catch (e) {
            console.log(e)
        }
    }

    async deleteIndustry(socket, data) {
        try {
            const self = this;
            this.crud.deleteDocument({ ...data, collection: 'industries', document: { _id: data["industry_id"] } }).then((data) => {
                let response = { document_id: data["industry_id"], ...data }
                self.broadcast('deleteDocument', socket, response)
            })

            await this.deleteIndustryDocuments(socket, data)
            this.wsManager.send(socket, 'deleteIndustry', { ...response });
        } catch (error) {
            console.log(error)
        }
    }

    async deleteIndustryDocuments(socket, data) {
        try {
            const self = this;
            let Data = {
                collection: 'industry_documents',
                filter: {
                    query: [
                        { name: "industry_data.industry_id", value: data.industry_id, operator: '$eq' },
                    ]
                },
                organization_id: data['organization_id']
            }

            this.crud.deleteDocument(Data).then((data) => {
                self.broadcast('deleteDocument', socket, data)
            })
        } catch (error) {
            console.log(error)
        }
    }

    /**
     * Run Industry logic
     **/
    async runIndustry(socket, data) {
        const { industry_id, newOrg_id, organization_id } = data

        let industry = await this.crud.readDocument({ collection: 'industries', document: { _id: industry_id }, organization_id })
        industry = industry.document[0]

        let error = null;

        if (!industry._id) {
            error = "Can't get industry"
        } else {
            let newOrgDocument = await this.crud.readDocument({ collection: 'organizations', document: { _id: newOrg_id }, organization_id })
            newOrgDocument = newOrgDocument.document[0]
            if (!newOrgDocument) {
                error = "Can't get organization";
            } else {
                let new_subdomain = newOrgDocument && newOrgDocument.hosts ? newOrgDocument.hosts[0] : "";
                await this.createEmptyDocumentsFromIndustry(
                    industry_id,
                    newOrgDocument,
                    industry.organization_data || {},
                    new_subdomain
                );
                this.wsManager.send(socket, 'runIndustry', {
                    error: false,
                    message: "successfuly",
                    industry_id
                })
                return;
            }
        }
        if (error) {
            this.wsManager.send(socket, 'runIndustry', {
                error: true,
                message: error,
            })
        }


    }

    async createEmptyDocumentsFromIndustry(industry_id, newOrg, orgData, new_subdomain) {
        const newOrgId = newOrg._id.toString();
        const newOrgKey = newOrg.key;

        const { subdomain, key, organization_id } = orgData;

        const self = this;
        let idPairs = [];

        let data = await this.crud.readDocument({ collection: 'industry_documents', filter: { query: [{ name: "industry_data.industry_id", value: industry_id, operator: '$eq' }] }, organization_id })

        // TODO: support for opening cursor with crud?
        // let documentCursor = industryDocumentsCollection.find({"industry_data.industry_id" : industry_id})		
        // while(await documentCursor.hasNext()) {
        // 	let document = await documentCursor.next();
        for (let document of data.document) {
            const { collection, document_id } = document.industry_data || {}
            if (!collection || !document_id) {
                continue;
            }

            document['_id'] = this.crud.ObjectId()
            document['organization_id'] = newOrgId;

            delete document['db'];
            delete document['database'];
            delete document['collection'];
            delete document['industry_data'];

            //. replace subdomain
            for (let field in document) {
                if (field != '_id' && field != 'organization_id') {
                    if (document_id && document['_id']) {
                        document[field] = self.replaceContent(document[field], document_id, document['_id']);
                    }
                    if (subdomain && new_subdomain) {
                        document[field] = self.replaceContent(document[field], subdomain, new_subdomain);
                    }
                    if (newOrgId && organization_id) {
                        document[field] = self.replaceContent(document[field], organization_id, newOrgId);
                    }
                    if (newOrgKey && key) {
                        document[field] = self.replaceContent(document[field], key, newOrgKey);
                    }
                }
            }

            await this.crud.createDocument({ collection, document, organization_id: newOrgId })
        }
        return
    }

    replaceContent(content, src, target) {
        const type = typeof content
        if (type == 'string') {
            content = content.replace(new RegExp(src, 'g'), target);
        } else if (type == "object") {
            for (let key in content) {
                if (content[key] && typeof content[key] == 'string') {
                    content[key] = content[key].replace(new RegExp(src, 'g'), target);
                }
            }
        }
        return content
    }

    broadcast(component, socket, response) {
        this.wsManager.broadcast(socket, component, response);
    }
}

module.exports = CoCreateIndustry;