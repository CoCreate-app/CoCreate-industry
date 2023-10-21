class CoCreateIndustry {
    constructor(crud) {
        this.wsManager = crud.wsManager
        this.crud = crud
        this.init()
    }

    init() {
        if (this.wsManager) {
            this.wsManager.on('createIndustry', (data) => this.createIndustry(data));
            this.wsManager.on('deleteIndustry', (data) => this.deleteIndustry(data));
            this.wsManager.on('runIndustry', (data) => this.runIndustry(data));
        }
    }

    // TODO: perform action on primary db only and improve params names
    /**
     * Create industry
     **/
    async createIndustry(data) {
        try {
            let { organization_id, db, industry_id } = data;
            const self = this;

            let orgObject = await this.crud.send({
                method: 'read.object',
                database: organization_id,
                array: 'organizations',
                object: { _id: organization_id },
                organization_id
            })

            orgObject = orgObject.object[0]

            let subdomain = orgObject && orgObject.host ? orgObject.host[0] : "";
            let update = {
                database: organization_id,
                array: data.array,
                object: {
                    ...data.data,
                    organization_data: {
                        subdomain,
                        organization_id,
                        key: orgObject.key
                    }
                },
                organization_id
            }

            let insertResult;
            if (industry_id) {
                update.method = 'update.object'
                update.object._id = industry_id
                insertResult = await this.crud.send(update)

                await this.deleteIndustryObjects(data)
                console.log('deleting')
            } else {
                update.method = 'create.object'
                insertResult = await this.crud.send(update);
                industry_id = `${insertResult.object[0]._id}`;
            }

            //. create inustryObjects
            const exclusion_arrays = ["users", "organizations", "industries", "industry_objects", "crdt-transactions", "metrics"];
            let arrays = await this.crud.send({ method: 'readCollection', database: organization_id, organization_id })
            arrays = arrays.array
            for (let i = 0; i < arrays.length; i++) {
                let array = arrays[i].name;
                if (exclusion_arrays.indexOf(array) > -1) {
                    continue;
                }
                await self.createIndustryObjects(array, industry_id, organization_id, db);
            }

            //. update subdomain
            const response = {
                'method': 'createIndustry',
                'storage': data['storage'],
                'array': data.array,
                'object': industry_id,
                'organization_id': organization_id,
                'industry_id': industry_id,
                'data': data.data,
                'metadata': data['metadata'],
            }
            self.wsManager.send(response);

            response.method = 'create.object'
            self.broadcast(response)

        } catch (error) {
            console.log(error)
        }
    }

    async createIndustryObjects(arrayName, industryId, organizationId, targetDB) {
        try {
            const query = {
                method: 'read.object',
                database: organizationId,
                array: arrayName,
                organization_id: organizationId
            }

            // TODO: support for opening cursor with crud?
            // const objectCursor = array.find(query);
            // await objectCursor.forEach(async (object) => {

            const objects = await this.crud.send(query);
            for (let object of objects.object) {
                let objectId = object['_id'].toString();

                delete object['_id'];

                let Data = {
                    method: 'update.object',
                    database: targetDB,
                    array: 'industry_objects',
                    object: {
                        industry_data: {
                            object: objectId,
                            industry_id: industryId,
                            array: arrayName
                        }
                    },
                    $filter: {
                        query: [
                            { key: "industry_data.object", value: objectId, operator: '$eq' },
                            { key: "industry_data.industry_id", value: industryId, operator: '$eq' },
                            { key: "industry_data.array", value: arrayName, operator: '$eq' }
                        ]
                    },
                    organization_id: organizationId,
                    upsert: true
                }

                this.crud.send(Data)
            }
        }
        catch (e) {
            console.log(e)
        }
    }

    async deleteIndustry(data) {
        try {
            const self = this;
            this.crud.send({ ...data, method: 'delete.object', array: 'industries', object: { _id: data["industry_id"] } }).then((data) => {
                let response = { object: data["industry_id"], ...data }
                self.broadcast(response)
            })

            await this.deleteIndustryObjects(data)
            this.wsManager.send({ ...response, method: 'deleteIndustry' });
        } catch (error) {
            console.log(error)
        }
    }

    async deleteIndustryObjects(data) {
        try {
            const self = this;
            let Data = {
                method: 'delete.object',
                array: 'industry_objects',
                $filter: {
                    query: [
                        { key: "industry_data.industry_id", value: data.industry_id, operator: '$eq' },
                    ]
                },
                organization_id: data['organization_id']
            }

            this.crud.send(Data).then((data) => {
                self.broadcast(data)
            })
        } catch (error) {
            console.log(error)
        }
    }

    /**
     * Run Industry logic
     **/
    async runIndustry(data) {
        const { industry_id, newOrg_id, organization_id } = data

        let industry = await this.crud.send({ method: 'read.object', array: 'industries', object: { _id: industry_id }, organization_id })
        industry = industry.object[0]

        let error = null;

        if (!industry._id) {
            error = "Can't get industry"
        } else {
            let newOrgObject = await this.crud.send({ method: 'read.object', array: 'organizations', object: { _id: newOrg_id }, organization_id })
            newOrgObject = newOrgObject.object[0]
            if (!newOrgObject) {
                error = "Can't get organization";
            } else {
                let new_subdomain = newOrgObject && newOrgobject.host ? newOrgObject.host[0] : "";
                await this.createEmptyObjectsFromIndustry(
                    industry_id,
                    newOrgObject,
                    industry.organization_data || {},
                    new_subdomain
                );
                this.wsManager.send({
                    method: 'runIndustry',
                    error: false,
                    message: "successfuly",
                    industry_id
                })
                return;
            }
        }
        if (error) {
            this.wsManager.send({
                method: 'runIndustry',
                error: true,
                message: error,
            })
        }


    }

    async createEmptyObjectsFromIndustry(industry_id, newOrg, orgData, new_subdomain) {
        const newOrgId = newOrg._id.toString();
        const newOrgKey = newOrg.key;

        const { subdomain, key, organization_id } = orgData;

        const self = this;
        let idPairs = [];

        let data = await this.crud.send({ method: 'read.object', array: 'industry_objects', $filter: { query: [{ key: "industry_data.industry_id", value: industry_id, operator: '$eq' }] }, organization_id })

        // TODO: support for opening cursor with crud?
        // let objectCursor = industryobjectsCollection.find({"industry_data.industry_id" : industry_id})		
        // while(await objectCursor.hasNext()) {
        // 	let object = await objectCursor.next();
        for (let object of data.object) {
            const { array, object } = object.industry_data || {}
            if (!array || !object) {
                continue;
            }

            object['_id'] = this.crud.ObjectId().toString();
            object['organization_id'] = newOrgId;

            delete object['storage'];
            delete object['database'];
            delete object['array'];
            delete object['industry_data'];

            //. replace subdomain
            for (let field in object) {
                if (field != '_id' && field != 'organization_id') {
                    if (object && object['_id']) {
                        object[field] = self.replaceContent(object[field], object, object['_id']);
                    }
                    if (subdomain && new_subdomain) {
                        object[field] = self.replaceContent(object[field], subdomain, new_subdomain);
                    }
                    if (newOrgId && organization_id) {
                        object[field] = self.replaceContent(object[field], organization_id, newOrgId);
                    }
                    if (newOrgKey && key) {
                        object[field] = self.replaceContent(object[field], key, newOrgKey);
                    }
                }
            }

            await this.crud.send({ method: 'create.object', array, object, organization_id: newOrgId })
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

    broadcast(response) {
        this.wsManager.send(response);
    }
}

module.exports = CoCreateIndustry;