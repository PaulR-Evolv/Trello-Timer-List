/* global TrelloPowerUp */

console.log("Power-Up: Script loaded successfully!");

window.TrelloPowerUp.initialize({
  'card-badges': function(t) {
    console.log("Power-Up: Calculating badges...");
    
    return Promise.all([
      t.card('idList'),
      t.get('card', 'shared', 'listTracker')
    ])
    .then(function(results) {
      const currentListId = results[0].idList;
      const storedData = results[1];
      const now = Date.now();

      console.log("Power-Up: Current List", currentListId);
      console.log("Power-Up: Stored Data", storedData);

      // If card is new or moved lists
      if (!storedData || storedData.listId !== currentListId) {
        console.log("Power-Up: Detected move/new card. Saving data...");
        const newData = {
          listId: currentListId,
          entryDate: now
        };
        return t.set('card', 'shared', 'listTracker', newData)
        .then(function() {
          return [{
            text: 'Just arrived',
            color: 'green'
          }];
        });
      }

      // If card is stationary
      const msInList = now - storedData.entryDate;
      console.log("Power-Up: Card is stationary. Time:", msInList);
      
      return [{
        text: formatTime(msInList),
        color: getBadgeColor(msInList), 
        refresh: 60 
      }];
    })
    .catch(function(error){
        console.error("Power-Up Error:", error);
    });
  }
});

// Helper functions (Copy these back in too)
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

function getBadgeColor(ms) {
  const days = ms / (1000 * 60 * 60 * 24);
  if (days > 3) return 'red';    
  if (days > 1) return 'yellow'; 
  return 'green';                
}
