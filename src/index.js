import crud from '@cocreate/crud-client';
import input from '@cocreate/input'
import action from '@cocreate/action'
import CoCreateSelect from '@cocreate/select'

const CoCreateIndustry = {
	masterDB: '5ae0cfac6fb8c4e656fdaf92', // '5ae0cfac6fb8c4e656fdaf92' /** masterDB **/,
	init: function() {
		
		if (config.organization_Id) {
			this.masterDB = config.organization_Id;
		}
		const self = this;

		crud.socket.listen('createIndustry', function(data) {
			document.dispatchEvent(new CustomEvent('createIndustry', {
				detail: data
			}))
		})

		crud.socket.listen('runIndustry', function(data) {
			document.dispatchEvent(new CustomEvent('runIndustry', {
				detail: data
			}))
		})
		
	},
	
	createIndustry: function(btn) {
		let form = btn.closest("form");
		if (!form) return;
		
		let elements = form.querySelectorAll("[data-collection='industries'][name]");
		
		let data = {};
		//. get form data
		elements.forEach(el => {
			let name = el.getAttribute('name')
			let value = input.getValue(el) || el.getAttribute('value')
			if (!name || !value) return;
			if (el.getAttribute('data-type') == 'array') {
				value = [value];
			}
			data[name] = value;
		})
		
		const room = config.organization_Id;

		data['organization_id'] = config.organization_Id;
		
		// return;
		crud.socket.send('createIndustryNew', {
			apiKey: config.apiKey,
			organization_id: config.organization_Id,
			db: this.masterDB,
			collection: 'industries',
			data: data
		}, room);
	},
	
	runIndustry: function(btn) {
		const form = btn.closest('form')
		if (!form) return;
		
		const industrySelect = form.querySelector("cocreate-select[name='industry']")
		if (industrySelect) {
			const industry_id = industrySelect.selectedOptions[0].getAttribute('value')
			console.log('industryID-1', industry_id)
			const newOrgId = industrySelect.getAttribute('data-document_id');
			
			if (industry_id && newOrgId) {
				crud.socket.send('runIndustry', {
					apiKey: config.apiKey,
					organization_id: config.organization_Id,
					industry_id: industry_id,
					new_organization_id: newOrgId,
					db: this.masterDB
				})
			}
			
		}
	},
}

CoCreateIndustry.init();

action.init({
	action: "runIndustry",
	endEvent: "runIndustry",
	callback: (btn, data) => {
		CoCreateIndustry.runIndustry(btn)
	},
})
action.init({
	action: "createIndustry",
	endEvent: "createdIndustry",
	callback: (btn, data) => {
		CoCreateIndustry.createIndustry(btn)
	},
})


export default CoCreateIndustry;