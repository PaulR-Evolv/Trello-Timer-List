/* global TrelloPowerUp */

var t = TrelloPowerUp.iframe();

// Request Trello to give us 1. The Lists on the board, 2. The Saved Settings
Promise.all([
  t.lists('all'),
  t.get('board', 'shared', 'timerSettings')
])
.then(function(results) {
  var lists = results[0];
  var settings = results[1];

  // A. Set default inputs
  if (settings) {
    document.getElementById('warnDays').value = settings.warnDays;
    document.getElementById('alertDays').value = settings.alertDays;
  }

  // B. Generate Checkboxes for Lists
  var container = document.getElementById('list-container');
  var loading = document.getElementById('loading');
  
  // Decide which lists are checked. 
  // If settings.activeLists is undefined (first run), we default to ALL checked.
  var activeLists = (settings && settings.activeLists) ? settings.activeLists : null;

  lists.forEach(function(list) {
    var div = document.createElement('div');
    div.className = 'checkbox-row';
    
    var checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = list.id;
    checkbox.id = 'list_' + list.id;
    
    // Check the box if:
    // 1. We have no saved settings yet (default to true)
    // 2. OR the list ID is found in the saved array
    if (!activeLists || activeLists.includes(list.id)) {
      checkbox.checked = true;
    }

    var label = document.createElement('label');
    label.htmlFor = 'list_' + list.id;
    label.textContent = list.name;
    label.style.marginTop = "0"; // Override default label style

    div.appendChild(checkbox);
    div.appendChild(label);
    container.appendChild(div);
  });

  // Show the container, hide loading text
  loading.style.display = 'none';
  container.style.display = 'block';
});

// C. Save Logic
document.getElementById('save').addEventListener('click', function() {
  var warnDays = document.getElementById('warnDays').value;
  var alertDays = document.getElementById('alertDays').value;

  // Find all checked boxes
  var checkedBoxes = document.querySelectorAll('#list-container input:checked');
  var activeListIds = Array.from(checkedBoxes).map(function(box) {
    return box.value;
  });

  return t.set('board', 'shared', 'timerSettings', {
    warnDays: parseInt(warnDays),
    alertDays: parseInt(alertDays),
    activeLists: activeListIds // Save the array of allowed IDs
  })
  .then(function() {
    t.closePopup();
  });
});
