import crud from '@cocreate/crud-client';
import '@cocreate/element-prototype';
import action from '@cocreate/actions';
import { checkValue } from '@cocreate/utils';

const CoCreateIndustry = {
    init: function () {

        crud.listen('createIndustry', function (data) {
            document.dispatchEvent(new CustomEvent('createIndustry', {
                detail: data
            }));
        });

        crud.listen('deleteIndustry', function (data) {
            document.dispatchEvent(new CustomEvent('deleteIndustry', {
                detail: data
            }));
        });

        crud.listen('runIndustry', function (data) {
            document.dispatchEvent(new CustomEvent('runIndustry', {
                detail: data
            }));
        });

    },

    createIndustry: function (btn) {
        let form = btn.closest("form");
        if (!form) return;

        let elements = form.querySelectorAll("[array='industries'][key]");

        let data = {};
        elements.forEach(el => {
            let key = el.getAttribute('key');
            let value = el.getValue();
            if (!key || !value) return;
            data[key] = value;
        });

        let industry_id = btn.getAttribute('industry_id');
        if (!industry_id) {
            let el = btn.closest('[array="industries"]')
            if (el)
                industry_id = el.getAttribute('object')
        }
        console.log('industry_id', industry_id)

        data['organization_id'] = CoCreateConfig.organization_id;

        // return;
        crud.socket.send({
            method: 'createIndustry',
            key: CoCreateConfig.key,
            organization_id: CoCreateConfig.organization_id,
            db: CoCreateConfig.organization_id,
            array: 'industries',
            industry_id,
            data,
            broadcastBrowser: false
        });
    },

    deleteIndustry: function (btn) {
        let industry_id = btn.getAttribute('industry_id');
        if (!industry_id) {
            let el = btn.closest('[array="industries"]')
            if (el)
                industry_id = el.getAttribute('object')
            else return;
        }

        crud.socket.send({
            method: 'deleteIndustry',
            key: CoCreateConfig.key,
            organization_id: CoCreateConfig.organization_id,
            array: 'industries',
            industry_id: industry_id,
            broadcastBrowser: false
        });

        document.dispatchEvent(new CustomEvent('deletedIndustry', {
            detail: {}
        }));
    },

    deleteIndustries: function (btn) {
        const dataTemplateid = btn.getAttribute('template_id');
        if (!dataTemplateid) return;

        const selectedEls = document.querySelectorAll(`.selected[templateid="${dataTemplateid}"]`);

        selectedEls.forEach((el) => {
            let industry_id = el.getAttribute('object');

            if (checkValue(industry_id)) {
                crud.socket.send({
                    method: 'deleteIndustry',
                    key: CoCreateConfig.key,
                    organization_id: CoCreateConfig.organization_id,
                    array: 'industries',
                    industry_id: industry_id,
                });
            }
        });

        document.dispatchEvent(new CustomEvent('deletedIndustries', {
            detail: {}
        }));
    },


    runIndustry: function (btn) {
        const form = btn.closest('form');
        if (!form) return;

        const industrySelect = form.querySelector("cocreate-select[key='industry']");
        if (industrySelect) {
            const industry_id = industrySelect.selectedOptions[0].getAttribute('value');
            const newOrgId = industrySelect.getAttribute('object');

            if (industry_id && newOrgId) {
                console.log('config', CoCreateConfig)
                crud.socket.send({
                    method: 'runIndustry',
                    key: crud.socket.key,
                    organization_id: crud.socket.organization_id,
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
    callback: (data) => {
        CoCreateIndustry.runIndustry(data.element);
    },
});

action.init({
    name: "createIndustry",
    endEvent: "createdIndustry",
    callback: (data) => {
        CoCreateIndustry.createIndustry(data.element);
    },
});

action.init({
    name: "deleteIndustry",
    endEvent: "deletedIndustry",
    callback: (data) => {
        CoCreateIndustry.deleteIndustry(data.element);
    },
});

action.init({
    name: "deleteIndustries",
    endEvent: "deletedIndustries",
    callback: (data) => {
        CoCreateIndustry.deleteIndustries(data.element);
    },
});

CoCreateIndustry.init();

export default CoCreateIndustry;