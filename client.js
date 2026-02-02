/* global TrelloPowerUp */

const DATA_VERSION = 2; 

window.TrelloPowerUp.initialize({
  'show-settings': function(t, options) {
    return t.popup({
      title: 'List Configuration',
      url: './settings.html',
      height: 400 // new UI
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
      const settings = results[2] || {}; // Default to empty object
      const now = Date.now();
      const currentListId = card.idList;

      // NEW LOGIC: PER-LIST CONFIG
      
      // Look up specific config for THIS list
      const listConfig = settings[currentListId];

      // If no config exists - assume disabled.
      if (!listConfig) {
        return []; // HIDE BADGE
      }

      // If exists, list is enabled.
      // We will use listConfig.warn and listConfig.alert later.
      // ----------------------------------------

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
      
      // Pass SPECIFIC list config to the helper
      return [{
        text: formatTime(msInList),
        color: getBadgeColor(msInList, listConfig), 
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

function getBadgeColor(ms, config) {
  const days = ms / (1000 * 60 * 60 * 24);
  
  // Use list-specific threshold
  if (days > config.alert) return 'red';    
  if (days > config.warn) return 'yellow';  
  return null; 
}
