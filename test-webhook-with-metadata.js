#!/usr/bin/env node

/**
 * Test webhook processing with proper metadata
 * This simulates what happens when a real user completes checkout
 */

async function testWebhookWithMetadata() {
  console.log('🧪 Testing webhook with proper metadata...\n');

  const userId = '21fc3c81-a66a-4cf3-be35-c2b70a900864';
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

  try {
    // Create a subscription with proper metadata (simulating checkout completion)
    console.log('1. Creating Stripe subscription with metadata...');

    const customer = await stripe.customers.create({
      email: 'test@example.com',
      metadata: {
        user_id: userId,
      },
    });

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [
        {
          price: 'price_1RwbbZCwdkB5okXQYBNF1vAU', // Premium monthly
        },
      ],
      metadata: {
        user_id: userId,
        tier: 'premium',
        period: 'monthly',
      },
    });

    console.log('✅ Created subscription:', subscription.id);
    console.log('✅ Customer:', customer.id);
    console.log('✅ Metadata included:', subscription.metadata);

    console.log('\n2. Webhook should have been triggered automatically');
    console.log('3. Check server logs for webhook processing');
    console.log('4. Check database to verify subscription was updated');

    // Wait a moment for webhook to process
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check database
    console.log('\n5. Checking database...');
    const response = await fetch(
      `https://seqxdksdbkuoemhdzayt.supabase.co/rest/v1/subscriptions?user_id=eq.${userId}`,
      {
        headers: {
          apikey:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcXhka3NkYmt1b2VtaGR6YXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MzY3MjUsImV4cCI6MjA2OTQxMjcyNX0.sliDL0mf5dNbtAA37pq0l4WxvXrVemguZ1A8trED038',
          Authorization:
            'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcXhka3NkYmt1b2VtaGR6YXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MzY3MjUsImV4cCI6MjA2OTQxMjcyNX0.sliDL0mf5dNbtAA37pq0l4WxvXrVemguZ1A8trED038',
        },
      }
    );

    const subscriptionData = await response.json();
    console.log('Database subscription data:', subscriptionData[0]);

    if (subscriptionData[0] && subscriptionData[0].stripe_subscription_id === subscription.id) {
      console.log('✅ SUCCESS: Webhook correctly updated database with real Stripe subscription!');
    } else {
      console.log('❌ WARNING: Database not updated or subscription ID mismatch');
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Load environment variables
require('dotenv').config({ path: '.env.local' });

testWebhookWithMetadata();
