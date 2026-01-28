/* global TrelloPowerUp */

// version forces to reset board's data
// pevious tests don't interfere with new logic
const DATA_VERSION = 2; 

window.TrelloPowerUp.initialize({
  'card-badges': function(t) {
    return Promise.all([
      t.card('idList', 'dateLastActivity'),
      t.get('card', 'shared', 'listTracker')
    ])
    .then(function(results) {
      const card = results[0];
      const storedData = results[1];
      const now = Date.now();
      const currentListId = card.idList;

      // 1. CHECK: Is this a "Legacy" card that hasn't moved yet?
      // Or is it data from an old version of our code?
      // If so, we treat it as having NO data.
      let data = storedData;
      if (data && data.version !== DATA_VERSION) {
        data = null; // Force reset
      }

      // --- SCENARIO A: No valid data (First time seeing this card) ---
      if (!data) {
        // Logic: Is this a BRAND NEW card? Or an OLD card?
        // We check if the last activity was within the last 2 minutes (120000ms).
        const lastActivity = new Date(card.dateLastActivity).getTime();
        const isBrandNew = (now - lastActivity) < (2 * 60 * 1000);

        if (isBrandNew) {
          // It's a new card -> Start Timer Immediately
          return t.set('card', 'shared', 'listTracker', {
            listId: currentListId,
            entryDate: now,
            version: DATA_VERSION
          })
          .then(function() {
             return [{ text: 'New', color: 'green' }];
          });
        } else {
          // Old card -> 'Legacy' (Hidden)
          // ID save detect if it moves later.
          return t.set('card', 'shared', 'listTracker', {
            listId: currentListId,
            isLegacy: true, // This flag tells us to hide the badge
            version: DATA_VERSION
          })
          .then(function() {
             return []; // RETURN NOTHING (Invisible)
          });
        }
      }

      // --- SCENARIO B: Card has MOVED lists ---
      if (data.listId !== currentListId) {
        // If card moved! Nil if legacy or new
        // Reset timer and show the badge.
        return t.set('card', 'shared', 'listTracker', {
          listId: currentListId,
          entryDate: now,
          version: DATA_VERSION
        })
        .then(function() {
          return [{ text: 'Just moved', color: 'green' }];
        });
      }

      // --- SCENARIO C: Card sitting still ---
      
      // If marked as Legacy, keep hidden.
      if (data.isLegacy) {
        return [];
      }

      // Otherwise, show timer normally.
      const msInList = now - data.entryDate;
      return [{
        text: formatTime(msInList),
        color: getBadgeColor(msInList), 
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

function getBadgeColor(ms) {
  const days = ms / (1000 * 60 * 60 * 24);
  
  if (days > 14) return 'red';    
  if (days > 3) return 'yellow';  
  return null; // Grey
}
