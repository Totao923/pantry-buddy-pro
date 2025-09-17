// Test script to verify spending analytics functionality
console.log('=== Spending Analytics Verification ===');

// Check localStorage for receipts
const receipts = JSON.parse(localStorage.getItem('userReceipts') || '[]');
console.log('📊 Receipt Data Check:');
console.log('- Total receipts:', receipts.length);
console.log(
  '- Total spent:',
  receipts.reduce((sum, r) => sum + r.totalAmount, 0)
);
console.log('- Stores:', [...new Set(receipts.map(r => r.storeName))]);

// Check categories
const categories = {};
const stores = {};
receipts.forEach(receipt => {
  receipt.items.forEach(item => {
    const category = item.category || 'other';
    categories[category] = (categories[category] || 0) + item.price;
  });
  stores[receipt.storeName] = (stores[receipt.storeName] || 0) + receipt.totalAmount;
});

console.log('📈 Category Breakdown:');
Object.entries(categories).forEach(([category, amount]) => {
  console.log(`- ${category}: $${amount.toFixed(2)}`);
});

console.log('🏪 Store Breakdown:');
Object.entries(stores).forEach(([store, amount]) => {
  console.log(`- ${store}: $${amount.toFixed(2)}`);
});

// Test trends calculation
const now = new Date();
const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
const recentReceipts = receipts.filter(r => new Date(r.receiptDate) >= thirtyDaysAgo);

console.log('📅 Recent Trends (30 days):');
console.log('- Recent receipts:', recentReceipts.length);
console.log(
  '- Recent spending:',
  recentReceipts.reduce((sum, r) => sum + r.totalAmount, 0)
);

console.log('✅ Spending analytics verification complete');
