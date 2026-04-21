/* global TrelloPowerUp */

// 🛑 REPLACE THESE TWO VARIABLES 🛑
const API_KEY = 'b36e4759553b9eabfac5e8241760ac4e'; 
const GOOGLE_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwGOoi02DRFx2I4Lb0Bv1zU-wYUbQkFfmkrFmb15l_tb-AHK9mSuctmTP5lgkITbYwa/exec'; 

// We must inject the API_KEY directly into the iframe initialization
var t = TrelloPowerUp.iframe({
  appKey: API_KEY,
  appName: 'Time In List'
});

// --- UI RENDERING & SAVING ---
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
    var isEnabled = !!listConfig;
    var warnVal = (listConfig && listConfig.warn) ? listConfig.warn : 3;
    var alertVal = (listConfig && listConfig.alert) ? listConfig.alert : 14;

    var row = document.createElement('div');
    row.className = 'list-row';
    
    var header = document.createElement('div');
    header.className = 'list-header';
    var checkbox = document.createElement('input');
    checkbox.type = 'checkbox'; checkbox.id = 'cb_' + list.id;
    checkbox.value = list.id; checkbox.checked = isEnabled;
    var label = document.createElement('label');
    label.htmlFor = 'cb_' + list.id; label.textContent = list.name;
    header.appendChild(checkbox); header.appendChild(label);

    var settingsDiv = document.createElement('div');
    settingsDiv.className = 'list-settings';
    if (isEnabled) settingsDiv.classList.add('active'); 
    settingsDiv.innerHTML = `
      <div class="setting-input"><label>Yellow (Days)</label><input type="number" class="warn-input" value="${warnVal}" min="1"></div>
      <div class="setting-input"><label>Red (Days)</label><input type="number" class="alert-input" value="${alertVal}" min="1"></div>
    `;

    checkbox.addEventListener('change', function() {
      if (this.checked) settingsDiv.classList.add('active');
      else settingsDiv.classList.remove('active');
    });

    row.appendChild(header); row.appendChild(settingsDiv);
    container.appendChild(row);
  });

  loading.style.display = 'none';
  container.style.display = 'block';
});

document.getElementById('save').addEventListener('click', function() {
  var newSettings = {};
  var rows = document.querySelectorAll('.list-row');
  rows.forEach(function(row) {
    var checkbox = row.querySelector('input[type="checkbox"]');
    if (checkbox.checked) {
      newSettings[checkbox.value] = {
        warn: parseInt(row.querySelector('.warn-input').value),
        alert: parseInt(row.querySelector('.alert-input').value)
      };
    }
  });
  return t.set('board', 'shared', 'timerSettings', newSettings)
  .then(function() { t.closePopup(); });
});


// --- EXPORT TO GOOGLE SHEETS ---
function getDaysInList(card) {
  if (!card.pluginData || card.pluginData.length === 0) return "No Data";
  for (let i = 0; i < card.pluginData.length; i++) {
    try {
      let parsed = JSON.parse(card.pluginData[i].value);
      if (parsed && parsed.listTracker) {
        if (parsed.listTracker.isLegacy) return "Ignored (Legacy)";
        let msInList = Date.now() - parsed.listTracker.entryDate;
        return (msInList / (1000 * 60 * 60 * 24)).toFixed(2);
      }
    } catch(e) { }
  }
  return "0.00";
}

document.getElementById('exportBtn').addEventListener('click', function() {
  var statusDiv = document.getElementById('exportStatus');
  statusDiv.style.display = 'block';
  statusDiv.innerText = 'Requesting Trello permission...';

  t.getRestApi().authorize({ scope: 'read' })
  .then(function(token) {
    statusDiv.innerText = 'Extracting board data...';
    return t.board('id').then(function(board) {
      const listUrl = `https://api.trello.com/1/boards/${board.id}/lists?key=${API_KEY}&token=${token}`;
      const cardUrl = `https://api.trello.com/1/boards/${board.id}/cards?pluginData=true&key=${API_KEY}&token=${token}`;
      
      return Promise.all([
        fetch(listUrl).then(r => r.json()),
        fetch(cardUrl).then(r => r.json())
      ]);
    });
  })
  .then(function(results) {
    statusDiv.innerText = 'Beaming to Google Sheets...';
    const lists = results[0];
    const cards = results[1];

    const listMap = {};
    lists.forEach(l => listMap[l.id] = l.name);

    // EXPANDABLE DATA COLUMNS
    const COLUMNS = [
      { header: "Card Name",           extract: card => card.name },
      { header: "Current List",        extract: card => listMap[card.idList] || "Unknown List" },
      { header: "Time in List (Days)", extract: card => getDaysInList(card) },
      { header: "Card Link",           extract: card => card.shortUrl }
    ];

    const headers = COLUMNS.map(col => col.header);
    const rows = cards.map(card => COLUMNS.map(col => col.extract(card) || ""));

    return fetch(GOOGLE_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ headers: headers, rows: rows })
    });
  })
  .then(function() {
    statusDiv.innerText = 'Successfully synced to Google Sheets!';
    statusDiv.style.color = 'green';
    setTimeout(() => { statusDiv.style.display = 'none'; statusDiv.style.color = '#0052cc'; }, 4000);
  })
  .catch(function(err) {
    console.error(err);
    statusDiv.innerText = 'Export failed. Check console.';
    statusDiv.style.color = 'red';
  });
});
