#!/usr/bin/env node

/**
 * Script to automatically get Price IDs from your Stripe products
 */

require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');

async function getPriceIds() {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  console.log('🔍 Fetching your Stripe products and prices...\n');

  try {
    // Get all products
    const products = await stripe.products.list({ limit: 10 });

    console.log('📦 Found products:');
    for (const product of products.data) {
      console.log(`  - ${product.name} (${product.id})`);

      // Get prices for this product
      const prices = await stripe.prices.list({
        product: product.id,
        limit: 10,
      });

      console.log('    Prices:');
      for (const price of prices.data) {
        const amount = price.unit_amount / 100; // Convert from cents
        const interval = price.recurring?.interval || 'one-time';
        console.log(`      - $${amount}/${interval} → Price ID: ${price.id}`);
      }
      console.log('');
    }

    // Generate .env.local format
    console.log('📋 Copy these to your .env.local file:');
    console.log('');

    for (const product of products.data) {
      const prices = await stripe.prices.list({
        product: product.id,
        limit: 10,
      });

      const productName = product.name.toLowerCase();

      for (const price of prices.data) {
        const interval = price.recurring?.interval || 'one-time';
        const amount = price.unit_amount / 100;

        let envName = '';
        if (productName.includes('premium')) {
          envName =
            interval === 'month'
              ? 'STRIPE_PREMIUM_MONTHLY_PRICE_ID'
              : 'STRIPE_PREMIUM_YEARLY_PRICE_ID';
        } else if (productName.includes('family')) {
          envName =
            interval === 'month'
              ? 'STRIPE_FAMILY_MONTHLY_PRICE_ID'
              : 'STRIPE_FAMILY_YEARLY_PRICE_ID';
        } else if (productName.includes('chef')) {
          envName =
            interval === 'month' ? 'STRIPE_CHEF_MONTHLY_PRICE_ID' : 'STRIPE_CHEF_YEARLY_PRICE_ID';
        }

        if (envName) {
          console.log(`${envName}=${price.id}`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error fetching products:', error.message);
  }
}

getPriceIds();
