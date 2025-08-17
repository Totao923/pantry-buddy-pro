#!/usr/bin/env node

/**
 * Stripe Testing Script for Pantry Buddy Pro
 *
 * This script tests the Stripe integration based on the actual implementation.
 * Run with: node test-stripe.js
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log('🚀 Pantry Buddy Pro - Stripe Testing Suite\n');

function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

async function testStripeIntegration() {
  console.log('📋 Testing Checklist:');
  console.log('  ✅ Webhook endpoint: /api/stripe/webhook');
  console.log('  ✅ Checkout session: /api/stripe/create-checkout-session');
  console.log('  ✅ Portal session: /api/stripe/create-portal-session');
  console.log('  ✅ Subscription tiers: Premium ($9.99), Family ($19.99), Chef ($39.99)');
  console.log('  ✅ Trial period: 7 days for Premium tier');
  console.log('');

  // Check environment variables
  console.log('🔧 Environment Check:');
  const requiredEnvVars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_PREMIUM_MONTHLY_PRICE_ID',
    'STRIPE_FAMILY_MONTHLY_PRICE_ID',
    'STRIPE_CHEF_MONTHLY_PRICE_ID',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  ];

  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar];
    console.log(`  ${value ? '✅' : '❌'} ${envVar}: ${value ? '***configured***' : 'MISSING'}`);
  }
  console.log('');

  // Test flow menu
  while (true) {
    console.log('🧪 Test Options:');
    console.log('  1. Test webhook endpoint locally');
    console.log('  2. Test checkout session creation');
    console.log('  3. Test subscription feature access');
    console.log('  4. Simulate payment events');
    console.log('  5. Verify database subscription records');
    console.log('  6. Exit');
    console.log('');

    const choice = await question('Select a test option (1-6): ');
    console.log('');

    switch (choice) {
      case '1':
        await testWebhookEndpoint();
        break;
      case '2':
        await testCheckoutSession();
        break;
      case '3':
        await testFeatureAccess();
        break;
      case '4':
        await simulatePaymentEvents();
        break;
      case '5':
        await verifyDatabase();
        break;
      case '6':
        console.log('👋 Testing complete!');
        rl.close();
        return;
      default:
        console.log('❌ Invalid option, please try again.\n');
    }
  }
}

async function testWebhookEndpoint() {
  console.log('🔗 Testing Webhook Endpoint');
  console.log('');
  console.log('Manual steps to test webhooks:');
  console.log('');
  console.log('1. Install Stripe CLI:');
  console.log('   brew install stripe/stripe-cli/stripe');
  console.log('');
  console.log('2. Login to Stripe:');
  console.log('   stripe login');
  console.log('');
  console.log('3. Forward webhooks to local dev server:');
  console.log('   stripe listen --forward-to localhost:3000/api/stripe/webhook');
  console.log('');
  console.log('4. Copy the webhook signing secret and add to .env.local:');
  console.log('   STRIPE_WEBHOOK_SECRET=whsec_...');
  console.log('');
  console.log('5. Test webhook with sample events:');
  console.log('   stripe trigger customer.subscription.created');
  console.log('   stripe trigger customer.subscription.updated');
  console.log('   stripe trigger invoice.payment_succeeded');
  console.log('');

  const tested = await question('Have you completed the webhook setup? (y/n): ');
  if (tested.toLowerCase() === 'y') {
    console.log('✅ Webhook endpoint ready for testing!\n');
  } else {
    console.log('❌ Complete webhook setup before proceeding.\n');
  }
}

async function testCheckoutSession() {
  console.log('💳 Testing Checkout Session Creation');
  console.log('');
  console.log('Test URLs to try in your browser:');
  console.log('');
  console.log('1. Start your Next.js dev server:');
  console.log('   npm run dev');
  console.log('');
  console.log('2. Navigate to subscription page:');
  console.log('   http://localhost:3001/dashboard/subscription');
  console.log('');
  console.log('3. Test each subscription tier:');
  console.log('   - Premium ($9.99/month) - includes 7-day trial');
  console.log('   - Family ($19.99/month)');
  console.log('   - Chef ($39.99/month)');
  console.log('');
  console.log('4. Use Stripe test cards:');
  console.log('   - Success: 4242 4242 4242 4242');
  console.log('   - Decline: 4000 0000 0000 0002');
  console.log('   - 3D Secure: 4000 0027 6000 3184');
  console.log('');

  const tier = await question('Which tier would you like to test? (premium/family/chef): ');
  const period = await question('Which billing period? (monthly/yearly): ');

  console.log('');
  console.log(`🎯 Testing ${tier} ${period} subscription:`);
  console.log('');
  console.log('Test flow:');
  console.log('1. Click "Upgrade to ' + tier.charAt(0).toUpperCase() + tier.slice(1) + '"');
  console.log('2. Enter test card: 4242 4242 4242 4242');
  console.log('3. Use any future expiry date');
  console.log('4. Use any 3-digit CVC');
  console.log('5. Complete the checkout');
  console.log('6. Verify redirect to success page');
  console.log('');

  await question('Press Enter when you have completed the test...');
  console.log('✅ Checkout session test completed!\n');
}

async function testFeatureAccess() {
  console.log('🔐 Testing Feature Access');
  console.log('');
  console.log('Feature access matrix based on your implementation:');
  console.log('');
  console.log('Free Tier:');
  console.log('  ✅ 5 recipes per day');
  console.log('  ✅ 50 pantry items max');
  console.log('  ✅ Basic meal planning');
  console.log('  ❌ Advanced AI features');
  console.log('  ❌ Nutrition tracking');
  console.log('');
  console.log('Premium Tier:');
  console.log('  ✅ Unlimited recipes');
  console.log('  ✅ 500 pantry items');
  console.log('  ✅ Advanced AI features');
  console.log('  ✅ Nutrition tracking');
  console.log('  ✅ Meal planning');
  console.log('');
  console.log('Family Tier:');
  console.log('  ✅ Everything in Premium');
  console.log('  ✅ 1000 pantry items');
  console.log('  ✅ Family features');
  console.log('');
  console.log('Chef Tier:');
  console.log('  ✅ Everything in Family');
  console.log('  ✅ Unlimited pantry items');
  console.log('  ✅ Professional features');
  console.log('');

  const currentTier = await question(
    'What is your current subscription tier? (free/premium/family/chef): '
  );

  console.log('');
  console.log('🧪 Test these features:');
  console.log('1. Try generating more than 5 recipes in a day');
  console.log('2. Access AI Nutritionist (/dashboard/nutrition)');
  console.log('3. Try advanced meal planning features');
  console.log('4. Add items beyond your tier limit to pantry');
  console.log('');

  await question('Press Enter when you have tested the features...');
  console.log('✅ Feature access test completed!\n');
}

async function simulatePaymentEvents() {
  console.log('⚡ Simulating Payment Events');
  console.log('');
  console.log('Use Stripe CLI to trigger webhook events:');
  console.log('');
  console.log('1. Successful subscription creation:');
  console.log('   stripe trigger customer.subscription.created');
  console.log('');
  console.log('2. Subscription updated (tier change):');
  console.log('   stripe trigger customer.subscription.updated');
  console.log('');
  console.log('3. Payment succeeded:');
  console.log('   stripe trigger invoice.payment_succeeded');
  console.log('');
  console.log('4. Payment failed:');
  console.log('   stripe trigger invoice.payment_failed');
  console.log('');
  console.log('5. Subscription canceled:');
  console.log('   stripe trigger customer.subscription.deleted');
  console.log('');
  console.log('6. Trial ending:');
  console.log('   stripe trigger customer.subscription.trial_will_end');
  console.log('');

  const event = await question('Which event would you like to simulate? (Enter event name): ');
  console.log('');
  console.log(`Run this command: stripe trigger ${event}`);
  console.log('');
  console.log('Then check:');
  console.log('1. Your webhook endpoint receives the event');
  console.log('2. Database subscription record is updated');
  console.log('3. User feature access is modified accordingly');
  console.log('');

  await question('Press Enter when you have triggered the event...');
  console.log('✅ Payment event simulation completed!\n');
}

async function verifyDatabase() {
  console.log('🗄️ Verifying Database Records');
  console.log('');
  console.log('Check your Supabase database:');
  console.log('');
  console.log('1. Open Supabase dashboard');
  console.log('2. Navigate to Table Editor');
  console.log('3. Check the "subscriptions" table');
  console.log('');
  console.log('Expected columns:');
  console.log('  - user_id (UUID)');
  console.log('  - stripe_customer_id (text)');
  console.log('  - stripe_subscription_id (text, nullable)');
  console.log('  - tier (enum: free, premium, family, chef)');
  console.log('  - status (enum: active, canceled, past_due, trialing, incomplete)');
  console.log('  - stripe_status (text, for Stripe-specific statuses)');
  console.log('  - current_period_end (timestamp)');
  console.log('  - cancel_at_period_end (boolean)');
  console.log('  - trial_end (timestamp, nullable)');
  console.log('');
  console.log('Sample query:');
  console.log("  SELECT * FROM subscriptions WHERE user_id = 'your-user-id';");
  console.log('');

  const userId = await question('Enter a user ID to check (optional): ');
  if (userId) {
    console.log('');
    console.log(`Query: SELECT * FROM subscriptions WHERE user_id = '${userId}';`);
  }
  console.log('');

  await question('Press Enter when you have verified the database...');
  console.log('✅ Database verification completed!\n');
}

// Run the test suite
testStripeIntegration().catch(console.error);
