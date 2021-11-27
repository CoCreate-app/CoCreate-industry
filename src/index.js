import crud from '@cocreate/crud-client';
// import input from '@cocreate/elements';
import action from '@cocreate/actions';
// 
// const config = window.config;
const CoCreateIndustry = {
	// masterDB: '5ae0cfac6fb8c4e656fdaf92', // '5ae0cfac6fb8c4e656fdaf92' /** masterDB **/,
	init: function() {
		
		crud.listen('createIndustry', function(data) {
			document.dispatchEvent(new CustomEvent('createIndustry', {
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
		
		const room = config.organization_Id;

		data['organization_id'] = config.organization_Id;
		
		// return;
		crud.send('createIndustry', {
			apiKey: config.apiKey,
			organization_id: config.organization_Id,
			db: config.organization_Id,
			collection: 'industries',
			data: data
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
					organization_id: config.organization_Id,
					industry_id: industry_id,
					newOrg_id: newOrgId,
					// db: config.organization_Id
				});
			}
			
		}
	},
};

action.init({
	action: "runIndustry",
	endEvent: "runIndustry",
	callback: (btn, data) => {
		CoCreateIndustry.runIndustry(btn);
	},
});

action.init({
	action: "createIndustry",
	endEvent: "createdIndustry",
	callback: (btn, data) => {
		CoCreateIndustry.createIndustry(btn);
	},
});

CoCreateIndustry.init();

export default CoCreateIndustry;