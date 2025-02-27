import crud from "@cocreate/crud-client";
import "@cocreate/element-prototype";
import Actions from "@cocreate/actions";
import { checkValue } from "@cocreate/utils";

const CoCreateIndustry = {
	createIndustry: async function (action) {
		let btn = action.element;
		let form = action.form;
		if (!form) return;

		let elements = form.querySelectorAll("[array='industries'][key]");

		let data = {};
		for (let i = 0; i < elements.length; i++) {
			let key = elements[i].getAttribute("key");
			let value = await elements[i].getValue();
			if (!key || !value) return;
			data[key] = value;
		}

		let industry_id = btn.getAttribute("industry_id");
		if (!industry_id) {
			let el = btn.closest('[array="industries"]');
			if (el) industry_id = el.getAttribute("object");
		}
		console.log("industry_id", industry_id);

		data["organization_id"] = CoCreateConfig.organization_id;

		// return;
		let response = await crud.socket.send({
			method: "createIndustry",
			key: CoCreateConfig.key,
			organization_id: CoCreateConfig.organization_id,
			db: CoCreateConfig.organization_id,
			array: "industries",
			industry_id,
			data,
			broadcastBrowser: false
		});

		action.element.dispatchEvent(
			new CustomEvent("createIndustry", {
				detail: response
			})
		);
	},

	deleteIndustry: function (action) {
		let btn = action.element;

		let industry_id = btn.getAttribute("industry_id");
		if (!industry_id) {
			let el = btn.closest('[array="industries"]');
			if (el) industry_id = el.getAttribute("object");
			else return;
		}

		let response = crud.socket.send({
			method: "deleteIndustry",
			key: CoCreateConfig.key,
			organization_id: CoCreateConfig.organization_id,
			array: "industries",
			industry_id: industry_id,
			broadcastBrowser: false
		});

		action.element.dispatchEvent(
			new CustomEvent("deletedIndustry", {
				detail: response
			})
		);
	},

	deleteIndustries: function (action) {
		let btn = action.element;
		const dataTemplateid = btn.getAttribute("template_id");
		if (!dataTemplateid) return;

		const selectedEls = document.querySelectorAll(
			`.selected[templateid="${dataTemplateid}"]`
		);

		selectedEls.forEach((el) => {
			let industry_id = el.getAttribute("object");

			if (checkValue(industry_id)) {
				let response = crud.socket.send({
					method: "deleteIndustry",
					key: CoCreateConfig.key,
					organization_id: CoCreateConfig.organization_id,
					array: "industries",
					industry_id: industry_id
				});
			}
		});

		action.element.dispatchEvent(
			new CustomEvent("deletedIndustries", {
				detail: response
			})
		);
	},

	runIndustry: function (action) {
		let form = action.form;
		if (!form) return;

		const organization_id = async () => {
			return await crud.socket.organization_id();
		};
		const industrySelect = form.querySelector(
			"cocreate-select[key='industry']"
		);
		if (industrySelect) {
			const industry_id =
				industrySelect.selectedOptions[0].getAttribute("value");
			const newOrgId = industrySelect.getAttribute("object");

			if (industry_id && newOrgId) {
				console.log("config", CoCreateConfig);
				let response = crud.socket.send({
					method: "runIndustry",
					key: crud.socket.key,
					organization_id,
					industry_id: industry_id,
					newOrg_id: newOrgId,
					broadcastBrowser: false
					// db: config.organization_id
				});

				action.element.dispatchEvent(
					new CustomEvent("runIndustry", {
						detail: response
					})
				);
			}
		}
	}
};

Actions.init(
	{
		name: "runIndustry",
		endEvent: "runIndustry",
		callback: (action) => {
			CoCreateIndustry.runIndustry(action);
		}
	},
	{
		name: "createIndustry",
		endEvent: "createdIndustry",
		callback: (action) => {
			CoCreateIndustry.createIndustry(action);
		}
	},
	{
		name: "deleteIndustry",
		endEvent: "deletedIndustry",
		callback: (action) => {
			CoCreateIndustry.deleteIndustry(action);
		}
	},
	{
		name: "deleteIndustries",
		endEvent: "deletedIndustries",
		callback: (action) => {
			CoCreateIndustry.deleteIndustries(action);
		}
	}
);

CoCreateIndustry.init();

export default CoCreateIndustry;
