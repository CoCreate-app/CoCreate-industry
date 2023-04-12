import crud from '@cocreate/crud-client';
import '@cocreate/element-prototype';
import action from '@cocreate/actions';

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
			let value = el.getValue();
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

		data['organization_id'] = CoCreateConfig.organization_id;
		
		// return;
		crud.socket.send('createIndustry', {
			apiKey: CoCreateConfig.apiKey,
			organization_id: CoCreateConfig.organization_id,
			db: CoCreateConfig.organization_id,
			collection: 'industries',
			industry_id,
			data,
			broadcastBrowser: false
		});
	},

	deleteIndustry: function(btn) {
		let industry_id = btn.getAttribute('industry_id');
		if (!industry_id) {
			let el = btn.closest('[collection="industries"]')
			if (el)
				industry_id = el.getAttribute('document_id')
			else return;	
		}
				
		crud.socket.send('deleteIndustry', {
			apiKey: CoCreateConfig.apiKey,
			organization_id: CoCreateConfig.organization_id,
			collection: 'industries',
			industry_id: industry_id,
			broadcastBrowser: false
		});

		document.dispatchEvent(new CustomEvent('deletedIndustry', {
			detail: {}
		}));
	},

	deleteIndustries: function(btn) {
		const dataTemplateid = btn.getAttribute('template_id');
		if (!dataTemplateid) return;

		const selectedEls = document.querySelectorAll(`.selected[templateid="${dataTemplateid}"]`);

		selectedEls.forEach((el) => {
			let industry_id = el.getAttribute('document_id');

			if (crud.checkValue(industry_id)) {
				crud.socket.send('deleteIndustry', {
					apiKey: CoCreateConfig.apiKey,
					organization_id: CoCreateConfig.organization_id,
					collection: 'industries',
					industry_id: industry_id,
				});
			}
		});

		document.dispatchEvent(new CustomEvent('deletedIndustries', {
			detail: {}
		}));
	},

	
	runIndustry: function(btn) {
		const form = btn.closest('form');
		if (!form) return;
		
		const industrySelect = form.querySelector("cocreate-select[name='industry']");
		if (industrySelect) {
			const industry_id = industrySelect.selectedOptions[0].getAttribute('value');
			const newOrgId = industrySelect.getAttribute('document_id');
			
			if (industry_id && newOrgId) {
				console.log('config', CoCreateConfig)
				crud.socket.send('runIndustry', {
					apiKey: crud.socket.config.apiKey,
					organization_id: crud.socket.config.organization_id,
					industry_id: industry_id,
					newOrg_id: newOrgId,
					broadcastBrowser: false
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
	endEvent: "deletedIndustry",
	callback: (btn, data) => {
		CoCreateIndustry.deleteIndustry(btn);
	},
});

action.init({
	name: "deleteIndustries",
	endEvent: "deletedIndustries",
	callback: (btn, data) => {
		CoCreateIndustry.deleteIndustries(btn);
	},
});

CoCreateIndustry.init();

export default CoCreateIndustry;