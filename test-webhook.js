/**
 * Webhook Testing Script
 *
 * This script helps test webhook event handling by making direct API calls.
 * Run in browser console or Node.js environment.
 */

// Test webhook endpoint availability
async function testWebhookEndpoint() {
  try {
    const response = await fetch('/api/stripe/webhook', {
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

    console.log('Webhook endpoint status:', response.status);

    if (response.status === 400) {
      console.log('✅ Webhook endpoint is working (signature validation failed as expected)');
    } else {
      console.log('❌ Unexpected response from webhook endpoint');
    }
  } catch (error) {
    console.error('❌ Webhook endpoint test failed:', error);
  }
}

// Test checkout session creation
async function testCheckoutSession(tier = 'premium', period = 'monthly') {
  try {
    const response = await fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tier,
        period,
        returnUrl: window.location.href,
      }),
    });

    const data = await response.json();

    if (response.ok && data.url) {
      console.log('✅ Checkout session created successfully');
      console.log('Checkout URL:', data.url);
      return data.url;
    } else {
      console.error('❌ Checkout session creation failed:', data);
    }
  } catch (error) {
    console.error('❌ Checkout session test failed:', error);
  }
}

// Test portal session creation (requires existing subscription)
async function testPortalSession() {
  try {
    const response = await fetch('/api/stripe/create-portal-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        returnUrl: window.location.href,
      }),
    });

    const data = await response.json();

    if (response.ok && data.url) {
      console.log('✅ Portal session created successfully');
      console.log('Portal URL:', data.url);
      return data.url;
    } else {
      console.error('❌ Portal session creation failed:', data);
    }
  } catch (error) {
    console.error('❌ Portal session test failed:', error);
  }
}

// Check subscription status
async function checkSubscriptionStatus() {
  try {
    // This would typically be called from a protected API endpoint
    console.log(
      '💡 To check subscription status, check the AuthProvider context or database directly'
    );

    // Example of what to look for in localStorage/context
    const authData = localStorage.getItem('supabase.auth.token');
    if (authData) {
      console.log('✅ User is authenticated');
    } else {
      console.log('❌ User not authenticated');
    }
  } catch (error) {
    console.error('❌ Subscription status check failed:', error);
  }
}

// Test feature access
async function testFeatureAccess(feature = 'advanced_ai') {
  try {
    const response = await fetch('/api/usage/feature-check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        feature,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`✅ Feature '${feature}' access:`, data.hasAccess ? 'ALLOWED' : 'DENIED');
      console.log('Subscription tier:', data.tier);
    } else {
      console.error('❌ Feature access check failed:', data);
    }
  } catch (error) {
    console.error('❌ Feature access test failed:', error);
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Running Stripe Integration Tests...\n');

  console.log('1. Testing webhook endpoint...');
  await testWebhookEndpoint();
  console.log('');

  console.log('2. Testing checkout session creation...');
  await testCheckoutSession();
  console.log('');

  console.log('3. Testing portal session creation...');
  await testPortalSession();
  console.log('');

  console.log('4. Checking subscription status...');
  await checkSubscriptionStatus();
  console.log('');

  console.log('5. Testing feature access...');
  await testFeatureAccess();
  console.log('');

  console.log('✅ All tests completed!');
}

// Browser-friendly exports
if (typeof window !== 'undefined') {
  window.testWebhookEndpoint = testWebhookEndpoint;
  window.testCheckoutSession = testCheckoutSession;
  window.testPortalSession = testPortalSession;
  window.checkSubscriptionStatus = checkSubscriptionStatus;
  window.testFeatureAccess = testFeatureAccess;
  window.runAllTests = runAllTests;

  console.log('🧪 Stripe test functions loaded. Available functions:');
  console.log('  - testWebhookEndpoint()');
  console.log('  - testCheckoutSession(tier, period)');
  console.log('  - testPortalSession()');
  console.log('  - checkSubscriptionStatus()');
  console.log('  - testFeatureAccess(feature)');
  console.log('  - runAllTests()');
}

// Node.js exports
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testWebhookEndpoint,
    testCheckoutSession,
    testPortalSession,
    checkSubscriptionStatus,
    testFeatureAccess,
    runAllTests,
  };
}
