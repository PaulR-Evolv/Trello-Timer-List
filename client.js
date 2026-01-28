/* global TrelloPowerUp */

const DATA_VERSION = 2; 

window.TrelloPowerUp.initialize({
  // A. Add the Settings Button capability
  'show-settings': function(t, options) {
    return t.popup({
      title: 'Timer Settings',
      url: './settings.html',
      height: 250 // Height of the popup
    });
  },

  'card-badges': function(t) {
    return Promise.all([
      t.card('idList', 'dateLastActivity'),
      t.get('card', 'shared', 'listTracker'),
      t.get('board', 'shared', 'timerSettings') // B. Fetch Settings
    ])
    .then(function(results) {
      const card = results[0];
      const storedData = results[1];
      const settings = results[2] || { warnDays: 3, alertDays: 14 }; // Default fallbacks
      const now = Date.now();
      const currentListId = card.idList;

      // ... [EXISTING LOGIC REMAINS THE SAME] ...
      
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
      
      // C. Pass settings to the helper function
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

// D. Updated to accept 'settings' object
function getBadgeColor(ms, settings) {
  const days = ms / (1000 * 60 * 60 * 24);
  
  // Use the user's settings instead of hardcoded 14 and 3
  if (days > settings.alertDays) return 'red';    
  if (days > settings.warnDays) return 'yellow';  
  return null; 
}
