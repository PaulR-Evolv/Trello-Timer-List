/* global TrelloPowerUp */

var t = TrelloPowerUp.iframe();

Promise.all([
  t.lists('all'),
  t.get('board', 'shared', 'timerSettings')
])
.then(function(results) {
  var lists = results[0];
  var settings = results[1] || {}; // Default to empty object if new

  var container = document.getElementById('list-container');
  var loading = document.getElementById('loading');

  lists.forEach(function(list) {
    // 1. Get saved config for this specific list (if any)
    var listConfig = settings[list.id];
    var isEnabled = listConfig ? true : false;
    
    // Default: Use saved values OR default to 3/14 if enabling for first time
    var warnVal = (listConfig && listConfig.warn) ? listConfig.warn : 3;
    var alertVal = (listConfig && listConfig.alert) ? listConfig.alert : 14;

    // 2. Build HTML Row
    var row = document.createElement('div');
    row.className = 'list-row';

    // Header (Checkbox + Name)
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

    // Settings Area (Inputs)
    var settingsDiv = document.createElement('div');
    settingsDiv.className = 'list-settings';
    if (isEnabled) settingsDiv.classList.add('active'); // Show if already checked
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

    // 3. Toggle Logic: Show/Hide inputs when unchecked
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
  
  // Resize popup to fit content
  t.sizeTo('#list-container').done();
});

// SAVE LOGIC
document.getElementById('save').addEventListener('click', function() {
  
  var newSettings = {};
  var rows = document.querySelectorAll('.list-row');

  rows.forEach(function(row) {
    var checkbox = row.querySelector('input[type="checkbox"]');
    
    if (checkbox.checked) {
      // Only save data if the box is checked
      var listId = checkbox.value;
      var warnInput = row.querySelector('.warn-input').value;
      var alertInput = row.querySelector('.alert-input').value;

      newSettings[listId] = {
        warn: parseInt(warnInput),
        alert: parseInt(alertInput)
      };
    }
  });

  // Save the Map object
  return t.set('board', 'shared', 'timerSettings', newSettings)
  .then(function() {
    t.closePopup();
  });
});
