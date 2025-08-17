#!/usr/bin/env node

/**
 * Test webhook functionality manually
 */

async function testWebhookEndpoint() {
  console.log('🧪 Testing webhook endpoint...\n');

  try {
    // Test webhook endpoint availability
    const response = await fetch('http://localhost:3001/api/stripe/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test-signature',
      },
      body: JSON.stringify({
        id: 'evt_test_webhook',
        object: 'event',
        type: 'test.event',
      }),
    });

    console.log('Webhook endpoint response:', response.status);
    const result = await response.text();
    console.log('Response body:', result);

    if (response.status === 400) {
      console.log('✅ Webhook endpoint is working (signature validation failed as expected)');
    } else {
      console.log('❌ Unexpected response from webhook endpoint');
    }
  } catch (error) {
    console.error('❌ Webhook endpoint test failed:', error.message);
  }
}

async function simulateSubscriptionEvent() {
  console.log('\n🔄 To test subscription updates:');
  console.log('1. Run: stripe listen --forward-to localhost:3001/api/stripe/webhook');
  console.log('2. In another terminal: stripe trigger customer.subscription.created');
  console.log('3. Check your server logs for webhook processing');
}

testWebhookEndpoint().then(() => simulateSubscriptionEvent());
