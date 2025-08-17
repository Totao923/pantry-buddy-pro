#!/usr/bin/env node

/**
 * Script to create Stripe products and prices for Pantry Buddy
 */

require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');

async function setupStripeProducts() {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  console.log('🚀 Setting up Stripe products and prices for Pantry Buddy...\n');

  try {
    // Define the subscription tiers
    const tiers = [
      {
        name: 'Pantry Buddy Premium',
        description: 'Unlimited AI recipes, advanced features, and nutrition tracking',
        monthly: 9.99,
        yearly: 95.88,
      },
      {
        name: 'Pantry Buddy Family',
        description: 'Everything in Premium, plus family sharing for up to 6 members',
        monthly: 19.99,
        yearly: 191.76,
      },
      {
        name: 'Pantry Buddy Chef',
        description: 'Everything in Family, plus professional chef tools and features',
        monthly: 39.99,
        yearly: 383.52,
      },
    ];

    const priceIds = {};

    for (const tier of tiers) {
      console.log(`📦 Creating product: ${tier.name}`);

      // Create product
      const product = await stripe.products.create({
        name: tier.name,
        description: tier.description,
        type: 'service',
      });

      console.log(`   ✅ Product created: ${product.id}`);

      // Create monthly price
      const monthlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(tier.monthly * 100), // Convert to cents
        currency: 'usd',
        recurring: {
          interval: 'month',
        },
      });

      // Create yearly price
      const yearlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(tier.yearly * 100), // Convert to cents
        currency: 'usd',
        recurring: {
          interval: 'year',
        },
      });

      console.log(`   💰 Monthly price: $${tier.monthly}/month → ${monthlyPrice.id}`);
      console.log(`   💰 Yearly price: $${tier.yearly}/year → ${yearlyPrice.id}`);

      // Store price IDs
      const tierKey = tier.name.toLowerCase().includes('premium')
        ? 'premium'
        : tier.name.toLowerCase().includes('family')
          ? 'family'
          : 'chef';

      priceIds[`${tierKey}_monthly`] = monthlyPrice.id;
      priceIds[`${tierKey}_yearly`] = yearlyPrice.id;

      console.log('');
    }

    // Generate .env.local format
    console.log('🎯 SUCCESS! Copy these to your .env.local file:');
    console.log('');
    console.log(`STRIPE_PREMIUM_MONTHLY_PRICE_ID=${priceIds.premium_monthly}`);
    console.log(`STRIPE_PREMIUM_YEARLY_PRICE_ID=${priceIds.premium_yearly}`);
    console.log(`STRIPE_FAMILY_MONTHLY_PRICE_ID=${priceIds.family_monthly}`);
    console.log(`STRIPE_FAMILY_YEARLY_PRICE_ID=${priceIds.family_yearly}`);
    console.log(`STRIPE_CHEF_MONTHLY_PRICE_ID=${priceIds.chef_monthly}`);
    console.log(`STRIPE_CHEF_YEARLY_PRICE_ID=${priceIds.chef_yearly}`);
    console.log('');
    console.log('✅ All products and prices created successfully!');
  } catch (error) {
    console.error('❌ Error setting up products:', error.message);
  }
}

setupStripeProducts();
