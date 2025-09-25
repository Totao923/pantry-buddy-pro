// Simple test script to verify spending analytics
const fetch = require('node-fetch');

async function testSpendingAnalytics() {
  try {
    console.log('🧪 Testing spending analytics...');

    // Test creating a receipt with user ID from the dev server logs
    const testUserId = '21fc3c81-a66a-4cf3-be35-c2b70a900864'; // User from dev server
    const response = await fetch(`http://localhost:3001/api/test-receipts?userId=${testUserId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const result = await response.json();
    console.log('📊 Test receipt result:', result);

    if (result.success) {
      console.log('✅ Test receipt created successfully!');
      console.log('🔍 Now check the analytics dashboard to see if spending data appears');
    } else {
      console.error('❌ Test receipt failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testSpendingAnalytics();
