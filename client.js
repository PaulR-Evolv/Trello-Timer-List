/* global TrelloPowerUp */

// Helper function to format milliseconds into readable text (e.g., "2d 5h")
function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return days + 'd ' + (hours % 24) + 'h';
  if (hours > 0) return hours + 'h ' + (minutes % 60) + 'm';
  if (minutes > 0) return minutes + 'm';
  return 'Just now';
}

// Helper to determine badge color based on duration
function getBadgeColor(ms) {
  const days = ms / (1000 * 60 * 60 * 24);
  
  if (days > 3) return 'red';    // Stagnant: Over 3 days
  if (days > 1) return 'yellow'; // Warning: Over 1 day
  return 'green';                // Fresh: Less than 1 day
}

window.TrelloPowerUp.initialize({
  // 'card-badges' allows us to display info on the front of the card
  'card-badges': function(t) {
    // 1. Fetch the Card's current List ID and our stored data
    return Promise.all([
      t.card('idList'),
      t.get('card', 'shared', 'listTracker')
    ])
    .then(function(results) {
      const currentListId = results[0].idList;
      const storedData = results[1];
      const now = Date.now();

      // 2. LOGIC: specific check for list changes
      
      // Case A: This is the first time the Power-Up has seen this card
      // OR the card has moved to a new list since we last checked.
      if (!storedData || storedData.listId !== currentListId) {
        
        // Create the new data object
        const newData = {
          listId: currentListId,
          entryDate: now
        };

        // Save it to the 'shared' scope so everyone sees the reset
        // We return the Promise so Trello waits for the save to finish
        return t.set('card', 'shared', 'listTracker', newData)
        .then(function() {
          return [{
            text: 'Just arrived',
            color: 'green'
          }];
        });
      }

      // Case B: The card is still in the same list. Calculate duration.
      const msInList = now - storedData.entryDate;

      return [{
        text: formatTime(msInList), // e.g., "2d 4h"
        color: getBadgeColor(msInList), // green, yellow, or red
        refresh: 60 // Optional: tells Trello to refresh this badge every 60 seconds
      }];
    });
  }
});
