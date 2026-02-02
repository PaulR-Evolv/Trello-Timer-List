/* global TrelloPowerUp */

var t = TrelloPowerUp.iframe();

Promise.all([
  t.lists('all'),
  t.get('board', 'shared', 'timerSettings')
])
.then(function(results) {
  var lists = results[0];
  var settings = results[1] || {}; 

  var container = document.getElementById('list-container');
  var loading = document.getElementById('loading');

  lists.forEach(function(list) {
    var listConfig = settings[list.id];
    var isEnabled = listConfig ? true : false;
    
    var warnVal = (listConfig && listConfig.warn) ? listConfig.warn : 3;
    var alertVal = (listConfig && listConfig.alert) ? listConfig.alert : 14;

    var row = document.createElement('div');
    row.className = 'list-row';

    var header = document.createElement('div');
    header.className = 'list-header';
    
    var checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'cb_' + list.id;
    checkbox.value = list.id;
    checkbox.checked = isEnabled;

    var label = document.createElement('label');
    label.htmlFor = 'cb_' + list.id;
    label.textContent = list.name;

    header.appendChild(checkbox);
    header.appendChild(label);

    var settingsDiv = document.createElement('div');
    settingsDiv.className = 'list-settings';
    if (isEnabled) settingsDiv.classList.add('active'); 
    settingsDiv.id = 'settings_' + list.id;

    settingsDiv.innerHTML = `
      <div class="setting-input">
        <label>Yellow (Days)</label>
        <input type="number" class="warn-input" value="${warnVal}" min="1">
      </div>
      <div class="setting-input">
        <label>Red (Days)</label>
        <input type="number" class="alert-input" value="${alertVal}" min="1">
      </div>
    `;

    checkbox.addEventListener('change', function() {
      if (this.checked) {
        settingsDiv.classList.add('active');
      } else {
        settingsDiv.classList.remove('active');
      }
    });

    row.appendChild(header);
    row.appendChild(settingsDiv);
    container.appendChild(row);
  });

  loading.style.display = 'none';
  container.style.display = 'block';
  
  // REMOVED: t.sizeTo('#list-container').done(); 
  // We removed this so the popup stays 600px tall and lets the CSS scrollbar work.
});

document.getElementById('save').addEventListener('click', function() {
  
  var newSettings = {};
  var rows = document.querySelectorAll('.list-row');

  rows.forEach(function(row) {
    var checkbox = row.querySelector('input[type="checkbox"]');
    
    if (checkbox.checked) {
      var listId = checkbox.value;
      var warnInput = row.querySelector('.warn-input').value;
      var alertInput = row.querySelector('.alert-input').value;

      newSettings[listId] = {
        warn: parseInt(warnInput),
        alert: parseInt(alertInput)
      };
    }
  });

  return t.set('board', 'shared', 'timerSettings', newSettings)
  .then(function() {
    t.closePopup();
  });
});
