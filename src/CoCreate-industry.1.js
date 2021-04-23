initIndustry();

initSocketsForIndustry();

CoCreate.socket.listen('buildIndustry', function(data) {
  buildIndustry(data);
})

function initIndustry() {
  var industryBtn = document.querySelector('.industryBtn');
  if (industryBtn) initIndustryBtn(industryBtn);
  
}

function initSocketsForIndustry() {
  CoCreate.socket.listen('createDocument', function(data) {
    createdIndustryDocument(data);
  })
}

function createdIndustryDocument(data) {
  console.log(data);
  
  if (data['collection'] != 'industries' || data.result.length == 0) return;
  
  var form_id = data['element'];
  
  var form = document.querySelector("form[data-form_id='" + form_id + "']");
  
  if (form) {
    
    var button = form.querySelector('.submitBtn');
    
    if (button && button.classList.contains('industryCreateBtn')) {
      let industryId = data['document_id'];
      
       var json = {
        "apiKey": config.apiKey,
        "securityKey": config.securityKey,
        "organization_id": config.organization_Id,
        "industry_id": industryId
      }
      
      CoCreate.socket.send('createIndustry', json);
    }
    
  }
}

function initIndustryBtn(btn) {
  var form = btn.form;
  
  if (!form) return;
  
  btn.addEventListener('click', function(e) {
    
    console.log('industryBtn');
    
    var industryField = form.querySelector("div[name='industry']");
    
    if (industryField) {
      // var industry_id = CoCreateSelect.getSelectValue(industryField);
      var industry_id = getSelectValue(industryField);
      var newOrgId = industryField.getAttribute('data-document_id');
      
      console.log(industry_id, newOrgId);
      
      if (industry_id && newOrgId) {
        var json = {
          "apiKey": config.apiKey,
          "securityKey": config.securityKey,
          "organization_id": config.organization_Id,
          "industry_id": industry_id,
          "new_organization_id": newOrgId
        }
        
        CoCreate.socket.send('buildIndustry', json);
      }
    }
  })
}

function buildIndustry(data) {
  console.log(data);
  
  var industryBtn = document.querySelector('.industryBtn');
  
  if (industryBtn) {
    var form = industryBtn.form;
    
    if (!form) return;
    
    
    var industryField = form.querySelector("div[name='industry']");
    
    if (industryField) {
      // var industry_id = CoCreateSelect.getSelectValue(industryField);
      var industry_id = getSelectValue(industryField);
      var newOrgId = industryField.getAttribute('data-document_id');
      
      if (industry_id == data['industry_id'] && newOrgId) {
        var apiKeyInput = form.querySelector("input[name='apiKey']");
        var securityKeyInput = form.querySelector("input[name='securityKey']");
        
        if (apiKeyInput && securityKeyInput) {
          
          localStorage.setItem('apiKey', apiKeyInput.value);
          localStorage.setItem('securityKey', securityKeyInput.value);
          localStorage.setItem('organization_id', newOrgId);
          
          CoCreate.crud.updateDocument({
            'collection': 'organizations',
            'document_id': newOrgId,
            'data': {
              adminUI_id: data['adminUI_id'],
              builderUI_id: data['builderUI_id']
            },
            'metadata': ''
          })
          
          
          var aTag = industryBtn.querySelector('a');
          
          if (aTag) CoCreate.logic.setLinkProcess(aTag)
          
  
        }
      }
    }
    
  }
  
  if (data['adminUI_id']) {
    localStorage.setItem('adminUI_id', data['adminUI_id']);
  }
  
  if (data['builderUI_id']) {
    localStorage.setItem('builderUI_id', data['builderUI_id']);
  }
}

// function initIndustryCreateBtn(btn) {
  
//   var form = btn.form;
//   if (form) {
//     btn.addEventListener('click', function(e) {
//       e.preventDefault();
      
//       var industryName = '';
    
//       var input = form.querySelector("[name='industry_name']");
//       if (input) industryName = input.value;
      
//       var json = {
//         "apiKey": config.apiKey,
//         "securityKey": config.securityKey,
//         "organization_id": config.organization_Id,
//         "name": industryName
//       }
      
//       CoCreate.socket.send('createIndustry', json);
//     })  
//   }
  
// }