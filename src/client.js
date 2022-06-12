import crud from '@cocreate/crud-client';
// import input from '@cocreate/elements';
import action from '@cocreate/actions';
// 
// const config = window.config;
const CoCreateIndustry = {
	init: function() {
		
		crud.listen('createIndustry', function(data) {
			document.dispatchEvent(new CustomEvent('createIndustry', {
				detail: data
			}));
		});

		crud.listen('deleteIndustry', function(data) {
			document.dispatchEvent(new CustomEvent('deleteIndustry', {
				detail: data
			}));
		});

		crud.listen('runIndustry', function(data) {
			document.dispatchEvent(new CustomEvent('runIndustry', {
				detail: data
			}));
		});
		
	},
	
	createIndustry: function(btn) {
		let form = btn.closest("form");
		if (!form) return;
		
		let elements = form.querySelectorAll("[collection='industries'][name]");
		
		let data = {};
		//. get form data
		elements.forEach(el => {
			let name = el.getAttribute('name');
			let value = el.getValue(el) || el.getAttribute('value');
			if (!name || !value) return;
			if (el.getAttribute('data-type') == 'array') {
				value = [value];
			}
			data[name] = value;
		});

		let industry_id = btn.getAttribute('industry_id');
		if (!industry_id) {
			let el = btn.closest('[collection="industries"]')
			if (el)
				industry_id = el.getAttribute('document_id')
		}
		console.log('industry_id', industry_id)
		const room = config.organization_id;

		data['organization_id'] = config.organization_id;
		
		// return;
		crud.send('createIndustry', {
			apiKey: config.apiKey,
			organization_id: config.organization_id,
			db: config.organization_id,
			collection: 'industries',
			industry_id,
			data: data
		}, room);
	},

	deleteIndustry: function(btn) {
		let industry_id = btn.getAttribute('industry_id');
		if (!industry_id) {
			let el = btn.closest('[collection="industries"]')
			if (el)
				industry_id = el.getAttribute('document_id')
			else return;	
		}
		const room = config.organization_id;
				
		crud.send('deleteIndustry', {
			apiKey: config.apiKey,
			organization_id: config.organization_id,
			collection: 'industries',
			industry_id: industry_id,
		}, room);
	},
	
	runIndustry: function(btn) {
		const form = btn.closest('form');
		if (!form) return;
		
		const industrySelect = form.querySelector("cocreate-select[name='industry']");
		if (industrySelect) {
			const industry_id = industrySelect.selectedOptions[0].getAttribute('value');
			const newOrgId = industrySelect.getAttribute('document_id');
			
			if (industry_id && newOrgId) {
				crud.send('runIndustry', {
					apiKey: config.apiKey,
					organization_id: config.organization_id,
					industry_id: industry_id,
					newOrg_id: newOrgId,
					// db: config.organization_id
				});
			}
			
		}
	},
};

action.init({
	name: "runIndustry",
	endEvent: "runIndustry",
	callback: (btn, data) => {
		CoCreateIndustry.runIndustry(btn);
	},
});

action.init({
	name: "createIndustry",
	endEvent: "createdIndustry",
	callback: (btn, data) => {
		CoCreateIndustry.createIndustry(btn);
	},
});

action.init({
	name: "deleteIndustry",
	endEvent: "deleteIndustry",
	callback: (btn, data) => {
		CoCreateIndustry.deleteIndustry(btn);
	},
});

CoCreateIndustry.init();

export default CoCreateIndustry;