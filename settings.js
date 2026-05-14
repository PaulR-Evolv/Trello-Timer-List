/* global TrelloPowerUp */

// 🛑 REPLACE THESE TWO VARIABLES WITH YOUR OWN 🛑
const API_KEY = 'b36e4759553b9eabfac5e8241760ac4e'; 
const GOOGLE_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwGOoi02DRFx2I4Lb0Bv1zU-wYUbQkFfmkrFmb15l_tb-AHK9mSuctmTP5lgkITbYwa/exec'; 

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
        let totalMins = Math.floor(msInList / (1000 * 60));
        let d = Math.floor(totalMins / (24 * 60));
        let h = Math.floor((totalMins % (24 * 60)) / 60);
        let m = totalMins % 60;
        
        return `${d}d ${h}h ${m}m`;
      }
    } catch(e) { }
  }
  return "0d 0h 0m";
}

document.getElementById('exportBtn').addEventListener('click', function() {
  
  // 🛑 CACHE BREAKER ALERT
  alert("SUCCESS! Dual-Export to 'Trello Lists' is active!");

  var statusDiv = document.getElementById('exportStatus');
  statusDiv.style.display = 'block';
  statusDiv.innerText = 'Requesting Trello permission...';

  t.getRestApi().authorize({ scope: 'read' })
  .then(function(token) {
    statusDiv.innerText = 'Extracting board data...';
    
    return t.board('id').then(function(board) {
      const listUrl = `https://api.trello.com/1/boards/${board.id}/lists?key=${API_KEY}&token=${token}`;
      const cardUrl = `https://api.trello.com/1/boards/${board.id}/cards?pluginData=true&customFieldItems=true&key=${API_KEY}&token=${token}`;
      const customFieldUrl = `https://api.trello.com/1/boards/${board.id}/customFields?key=${API_KEY}&token=${token}`;
      
      return Promise.all([
        fetch(listUrl).then(r => r.json()),
        fetch(cardUrl).then(r => r.json()),
        fetch(customFieldUrl).then(r => r.json()) 
      ]);
    });
  })
  .then(function(results) {
    statusDiv.innerText = 'Translating data...';
    const lists = results[0];
    const cards = results[1];
    const customFieldsBlueprint = results[2]; 

    const listMap = {};
    lists.forEach(l => listMap[l.id] = l.name);

    // 🚨 THE TWO-COLUMN LIST GENERATOR: Creates the [1, "List A"] array!
    const listNamesArray = lists.map((l, index) => [index + 1, l.name]);

    const getCustomField = (card, fieldName) => {
      const fieldBlueprint = customFieldsBlueprint.find(cf => cf.name === fieldName);
      if (!fieldBlueprint || !card.customFieldItems) return "";

      const item = card.customFieldItems.find(i => i.idCustomField === fieldBlueprint.id);
      if (!item) return "";

      if (fieldBlueprint.type === "list" && item.idValue) {
        const option = fieldBlueprint.options.find(opt => opt.id === item.idValue);
        return option && option.value ? option.value.text : "";
      }

      if (item.value) {
        if (item.value.text) return item.value.text;
        if (item.value.number) return item.value.number;
        if (item.value.date) return new Date(item.value.date).toLocaleDateString();
        if (item.value.checked === 'true' || item.value.checked === true) return "Checked";
      }
      return "";
    };

    const COLUMNS = [
      { header: "Card Name",           extract: card => card.name },
      { header: "Current List",        extract: card => listMap[card.idList] || "Unknown List" },
      { header: "Time in List",        extract: card => getDaysInList(card) },
      { header: "Editor",              extract: card => getCustomField(card, "Editor") },
      { header: "Video Reviewer",      extract: card => getCustomField(card, "Video Reviewer") },
      { header: "Card Link",           extract: card => card.shortUrl }
    ];

    statusDiv.innerText = 'Beaming to Google Sheets...';
    const headers = COLUMNS.map(col => col.header);
    
    const allRows = cards.map(card => COLUMNS.map(col => col.extract(card) || ""));
    
    const rows = allRows.filter(row => {
      const timeValue = String(row[2]); 
      return !timeValue.includes("No Data") && !timeValue.includes("Legacy");
    });

    // 🚨 SENDING THE DUAL-PACKAGE: Adds "trelloLists" to the end of the payload
    return fetch(GOOGLE_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ headers: headers, rows: rows, trelloLists: listNamesArray })
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
