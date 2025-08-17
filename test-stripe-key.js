// Quick test to verify Stripe API key is working
// Run with: node test-stripe-key.js

require('dotenv').config({ path: '.env.local' });

async function testStripeKey() {
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeKey) {
    console.log('❌ STRIPE_SECRET_KEY not found in environment variables');
    return;
  }

  if (stripeKey.includes('here') || stripeKey.includes('your_key')) {
    console.log('❌ Stripe key appears to be a placeholder:', stripeKey.substring(0, 20) + '...');
    return;
  }

  console.log('✅ Stripe key found:', stripeKey.substring(0, 20) + '...');

  try {
    // Test the key by making a simple API call
    const Stripe = require('stripe');
    const stripe = new Stripe(stripeKey);

    console.log('🔄 Testing Stripe API connection...');

    // Try to retrieve account info (this will fail if key is invalid)
    const account = await stripe.accounts.retrieve();
    console.log('✅ Stripe API key is valid!');
    console.log('Account ID:', account.id);
    console.log('Account type:', account.type);
  } catch (error) {
    console.log('❌ Stripe API key test failed:');
    console.log('Error:', error.message);

    if (error.message.includes('Invalid API Key')) {
      console.log('\n💡 Fix: Make sure your .env.local has the correct Stripe secret key');
      console.log('   Get it from: https://dashboard.stripe.com/test/apikeys');
    }
  }
}

testStripeKey();
