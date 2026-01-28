/* global TrelloPowerUp */

var t = TrelloPowerUp.iframe();

// 1. Load existing settings when the popup opens
t.get('board', 'shared', 'timerSettings')
.then(function(settings) {
  if (settings) {
    document.getElementById('warnDays').value = settings.warnDays;
    document.getElementById('alertDays').value = settings.alertDays;
  }
});

// 2. Listen for the "Save" button click
document.getElementById('save').addEventListener('click', function() {
  var warnDays = document.getElementById('warnDays').value;
  var alertDays = document.getElementById('alertDays').value;

  // Save to Trello Board Storage
  return t.set('board', 'shared', 'timerSettings', {
    warnDays: parseInt(warnDays),
    alertDays: parseInt(alertDays)
  })
  .then(function() {
    // Close the popup after saving
    t.closePopup();
  });
});
