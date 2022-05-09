const { ObjectId } = require("mongodb");

class CoCreateIndustry {
	constructor(wsManager, dbClient) {
		this.wsManager = wsManager
		this.dbClient = dbClient
		this.init()
	}
	
	init() {
		if (this.wsManager) {
			this.wsManager.on('createIndustry',	(socket, data, socketInfo) => this.createIndustry(socket, data, socketInfo));
			this.wsManager.on('deleteIndustry',	(socket, data, socketInfo) => this.deleteIndustry(socket, data, socketInfo));
			this.wsManager.on('runIndustry', (socket, data, socketInfo) => this.runIndustry(socket, data));
		}
	}
		
	/**
	 * Create industry
	 **/
	async createIndustry(socket, data, socketInfo) {
		try {
			let {organization_id, db, industry_id} = data;
			const self = this;
			const collection = this.dbClient.db(organization_id).collection(data.collection);
			
			let orgDocument = await this.dbClient.db(db).collection('organizations').findOne({_id: ObjectId(organization_id)});
			let subdomain = orgDocument && orgDocument.domains ? orgDocument.domains[0] : "";

			let insertResult;	
			if (data.industry_id){
				industry_id = data.industry_id;
				let update = {};
				update['$set'] = data.data;

				update.$set['organization_data'] = {
					subdomain: subdomain,
					apiKey: orgDocument.apiKey,
					organization_id: organization_id
				}
		
				update['$set'].organization_id = db || organization_id;

				let projection = {}
				Object.keys(update['$set']).forEach(x => {
					projection[x] = 1
				})

				const query = {"_id": new ObjectId(industry_id) };
				insertResult = await collection.findOneAndUpdate(query, update, {
					returnOriginal : false,
					upsert: true,
					projection: projection
				});
				await this.deleteIndustryDocuments(socket, data, socketInfo)
				console.log('deleting')
			}
			else {
				let update = data.data;
				update.organization_data = {
					subdomain: subdomain,
					apiKey: orgDocument.apiKey,
					organization_id: organization_id
				}
		
				update.organization_id = db || organization_id;
				insertResult = await collection.insertOne(data.data);
				industry_id = `${insertResult.insertedId}`;
			}

			//. create inustryDocuments
			const srcDB = this.dbClient.db(organization_id);
			let collections = []
			const exclusion_collections = ["users", "organizations", "industries", "industry_documents", "crdt-transactions", "metrics"];
			collections = await srcDB.listCollections().toArray()
			collections = collections.map(x => x.name)

			for (let i = 0; i < collections.length; i++) {
				let collection = collections[i];
				if (exclusion_collections.indexOf(collection) > -1) {
					continue;
				}
				await self.createIndustryDocuments(collection, industry_id, organization_id, db);
			}
			
			//. update subdomain
			const response  = {
				'db': data['db'],
				'collection': data.collection,
				'document_id': industry_id,
				'organization_id': organization_id,
				'industry_id': industry_id,
				'data': data.data,
				'metadata': data['metadata'],
			}
			self.wsManager.send(socket, 'createIndustry', response, data['organization_id']);
			self.broadcast('createDocument', socket, response, socketInfo)
			
		} catch (error) {
			console.log(error)
		}
	}

	async createIndustryDocuments(collectionName, industryId, organizationId, targetDB) {
		try{
			const industryDocumentsCollection = this.dbClient.db(targetDB).collection('industry_documents');
			const collection = this.dbClient.db(organizationId).collection(collectionName);

			const  query = {
				'organization_id': organizationId
			}

			const documentCursor = collection.find(query);
			await documentCursor.forEach(async (document) => {
				var documentId = document['_id'].toString();
	
				delete document['_id'];
				
				document['industry_data'] = {
					document_id: documentId,
					industry_id: industryId,
					collection: collectionName,
				}

				industryDocumentsCollection.update(
					{
						"industry_data.document_id" : {$eq: documentId},
						"industry_data.industry_id" : {$eq: industryId},
						"industry_data.collection"	: {$eq: collectionName},
					},
					{ 
						$set: document
					},
					{
						upsert: true
					}
				);
			})
		}
		catch (e) {
			console.log(e)
		}
	}
	
	async deleteIndustry(socket, data, socketInfo) {
		try {
			const self = this;
			const db = this.dbClient.db(data['organization_id']);

			const collection = db.collection("industries");
			collection.deleteOne({
				"_id": new ObjectId(data["industry_id"])
			}, function(error, result) {
				if (!error) {
					let response = { document_id: data["industry_id"], ...data }
					self.broadcast('deleteDocument', socket, response, socketInfo)
				} else {
					self.wsManager.send(socket, 'ServerError', error, null, socketInfo);
				}
			})

			await this.deleteIndustryDocuments(socket, data, socketInfo)
			this.wsManager.send(socket, 'deleteIndustry', { ...response}, data['organization_id'], socketInfo);
		} catch (error) {
			console.log(error)
		}
	}

	async deleteIndustryDocuments(socket, data, socketInfo) {
		try {
			const self = this;
			const db = this.dbClient.db(data['organization_id']);

			const collection = db.collection('industry_documents');
			const query = {
				"industry_data.industry_id": data.industry_id
			};
			// let response;
			collection.deleteMany(query, function(error, result) {
				if (!error) {
					let response = { ...data }
					self.broadcast('deleteDocument', socket, response, socketInfo)
				} else {
					self.wsManager.send(socket, 'ServerError', error, null, socketInfo);
				}
			})
			// this.wsManager.send(socket, 'deleteIndustry', { ...response}, data['organization_id'], socketInfo);
		} catch (error) {
			console.log(error)
		}
	}

	/**
	 * Run Industry logic
	 **/
	 async runIndustry(socket, data) {
		const {industry_id, newOrg_id} = data
		const db = data.organization_id;
		let industryDocumentsCollection = this.dbClient.db(db).collection('industry_documents');


		let industry = await this.dbClient.db(db).collection('industries').findOne({_id: ObjectId(industry_id)});
		let error = null;

		if (!industry._id) {
			error = "Can't get industry"
		} else {
			let newOrgDocument = await this.dbClient.db(db).collection('organizations').findOne({_id: ObjectId(newOrg_id)});
			
			if (!newOrgDocument) {
				error = "Can't get organization";
			} else {
				let new_subdomain = newOrgDocument && newOrgDocument.domains ? newOrgDocument.domains[0] : "";
				
				const {idPairs} = await this.createEmptyDocumentsFromIndustry
				(
					industryDocumentsCollection, 
					industry_id, 
					newOrgDocument,
					industry.organization_data || {}, 
					new_subdomain
				);
				await this.updateDocumentsByIndustry(idPairs, newOrg_id)	
				this.wsManager.send(socket, 'runIndustry', {
					error: false,
					message: "successfuly",
					industry_id
				}, data['organization_id'])
				return;
			}
		}
		if (error) {
			this.wsManager.send(socket, 'runIndustry', {
				error: true,
				message: error,
			}, data['organization_id'])
		}


	}
	
	async createEmptyDocumentsFromIndustry(industryDocumentsCollection, industry_id, newOrg, orgData, new_subdomain) {
		const newOrgId = newOrg._id.toString();
		const newOrgApiKey = newOrg.apiKey;

		const {subdomain, apiKey, organization_id} = orgData;
		
		const newDB = this.dbClient.db(newOrgId);
		const self = this;
		let idPairs = [];
		
		let documentCursor = industryDocumentsCollection.find({"industry_data.industry_id" : industry_id})
		
		while(await documentCursor.hasNext()) {
			let document = await documentCursor.next();
			const {collection, document_id, industry_id} = document.industry_data || {}
			if (!collection || !document_id) {
				continue;
			}
			const collectionInstance = newDB.collection(collection);

			document['organization_id'] = newOrgId;
			
			delete document['_id'];
			delete document['industry_data'];
			
			//. replace subdomain
			for (let field in document) {
				if (field != '_id' && field != 'organization_id') {
					if (subdomain && new_subdomain) {
						document[field] = self.replaceContent(document[field], subdomain, new_subdomain);
					}
					
					if (newOrgId && organization_id) {
						document[field] = self.replaceContent(document[field], organization_id, newOrgId);
					}
					if (newOrgApiKey && apiKey) {
						document[field] = self.replaceContent(document[field], apiKey, newOrgApiKey);
					}
				}
			}

			let newDocument = await collectionInstance.insertOne(document);
			if (newDocument) {
				idPairs.push({
					new_id : `${newDocument.insertedId}`,
					old_id : document_id,
					collection_name: collection
				})
			}		
		}
		// console.log(idPairs);
		// console.log(idPairs.length);
		
		return {
			idPairs: idPairs
		}
	}
	
	async updateDocumentsByIndustry(idPairs, newOrgId) {
		const newDB = this.dbClient.db(newOrgId);
		
		for (let i = 0; i < idPairs.length; i++) {
			const {collection_name, new_id} = idPairs[i];
			const collection = newDB.collection(collection_name);
			
			let document = await collection.findOne({'_id': ObjectId(new_id)});
			
			for (let field in document) {
				if (field != '_id' && field != 'organization_id') {
					var newFieldValue = this.replaceId(document[field], idPairs);
					document[field] = newFieldValue;
				}
			}
			
			delete document['_id'];
			await collection.findOneAndUpdate({'_id': ObjectId(new_id)}, {$set: document});
		}
	}
	
	replaceId(fieldValue, idPairs) {
		const self = this;
		idPairs.forEach(({old_id, new_id}) => {
			fieldValue = self.replaceContent(fieldValue, old_id, new_id)
		})
		return fieldValue;
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

	broadcast(component, socket, response, socketInfo) {
		this.wsManager.broadcast(socket, response.namespace || response['organization_id'], response.room, component, response, socketInfo);
		process.emit('changed-document', response)
	}
}

module.exports = CoCreateIndustry;