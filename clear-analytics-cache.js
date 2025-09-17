// Clear analytics cache and force fresh data
console.log('🧹 Clearing analytics cache...');

// Clear analytics cache
localStorage.removeItem('analytics-anonymous');
localStorage.removeItem('analytics-anonymous-timestamp');

// Clear sample receipt data to force regeneration with better debugging
localStorage.removeItem('userReceipts');

console.log('✅ Analytics cache cleared. Refresh the page to regenerate data.');
console.log('🔍 Check browser console for debug output when you visit the analytics page.');
