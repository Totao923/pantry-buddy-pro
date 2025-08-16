#!/usr/bin/env node

/**
 * Test manual user upgrade
 */

async function testManualUpgrade() {
  console.log('🧪 Testing manual user upgrade...\n');

  const userId = '21fc3c81-a66a-4cf3-be35-c2b70a900864'; // Real user ID from database

  try {
    const response = await fetch('http://localhost:3001/api/debug/upgrade-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId,
        tier: 'premium',
      }),
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Manual upgrade successful!');
      console.log('Result:', result);
      console.log('\n🎯 Now test:');
      console.log('1. Refresh your app');
      console.log('2. Check if premium features are unlocked');
      console.log('3. Verify subscription status shows "Premium"');
    } else {
      console.log('❌ Manual upgrade failed:');
      console.log('Error:', result);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

console.log('ℹ️  To test:');
console.log('1. Get your user ID from your app');
console.log('2. Update the userId variable in this script');
console.log('3. Run the test');
console.log('');

testManualUpgrade();
