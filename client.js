/* global TrelloPowerUp */

const DATA_VERSION = 2; 

window.TrelloPowerUp.initialize({
  'show-settings': function(t, options) {
    return t.popup({
      title: 'Timer Settings',
      url: './settings.html',
      height: 350 // Increased height for list view
    });
  },

  'card-badges': function(t) {
    return Promise.all([
      t.card('idList', 'dateLastActivity'),
      t.get('card', 'shared', 'listTracker'),
      t.get('board', 'shared', 'timerSettings')
    ])
    .then(function(results) {
      const card = results[0];
      const storedData = results[1];
      const settings = results[2] || { warnDays: 3, alertDays: 14, activeLists: null }; 
      const now = Date.now();
      const currentListId = card.idList;

      // --- NEW LOGIC: LIST EXCLUSION CHECK ---
      // If activeLists exists (user saved settings) AND current list is NOT in it:
      if (settings.activeLists && !settings.activeLists.includes(currentListId)) {
        return []; // HIDE BADGE completely
      }
      // ----------------------------------------

      // Standard logic continues...
      let data = storedData;
      if (data && data.version !== DATA_VERSION) { data = null; }

      // Scenario A: No Data
      if (!data) {
        const lastActivity = new Date(card.dateLastActivity).getTime();
        const isBrandNew = (now - lastActivity) < (2 * 60 * 1000);

        if (isBrandNew) {
          return t.set('card', 'shared', 'listTracker', {
            listId: currentListId, entryDate: now, version: DATA_VERSION
          }).then(() => [{ text: 'New', color: 'green' }]);
        } else {
          // If we are in an Active List but have no data, we mark legacy
          return t.set('card', 'shared', 'listTracker', {
            listId: currentListId, isLegacy: true, version: DATA_VERSION
          }).then(() => []);
        }
      }

      // Scenario B: Moved
      if (data.listId !== currentListId) {
        return t.set('card', 'shared', 'listTracker', {
          listId: currentListId, entryDate: now, version: DATA_VERSION
        }).then(() => [{ text: 'Just moved', color: 'green' }]);
      }

      // Scenario C: Stationary
      if (data.isLegacy) { return []; }

      const msInList = now - data.entryDate;
      
      return [{
        text: formatTime(msInList),
        color: getBadgeColor(msInList, settings), 
        refresh: 60 
      }];
    });
  }
});

// --- HELPER FUNCTIONS ---

function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return days + 'd';
  if (hours > 0) return hours + 'h';
  if (minutes > 0) return minutes + 'm';
  return 'now';
}

function getBadgeColor(ms, settings) {
  const days = ms / (1000 * 60 * 60 * 24);
  if (days > settings.alertDays) return 'red';    
  if (days > settings.warnDays) return 'yellow';  
  return null; 
}
