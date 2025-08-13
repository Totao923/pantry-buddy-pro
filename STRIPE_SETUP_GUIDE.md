# 🚀 Stripe Integration Setup Guide

Your Pantry Buddy app has a complete Stripe integration already built! Follow this guide to get it running.

## ✅ What's Already Built

- 🎯 **3 Subscription Tiers**: Premium ($9.99), Family ($19.99), Chef ($39.99)
- 🔧 **Complete API**: Checkout, webhooks, customer portal
- 💳 **Payment Flow**: Full subscription management
- 📊 **Database Integration**: Supabase subscriptions table
- 🎨 **UI Components**: Subscription page and pricing cards

## 🔧 Setup Steps

### 1. Get Stripe API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers > API Keys**
3. Copy your **Publishable key** (`pk_test_...`)
4. Copy your **Secret key** (`sk_test_...`)

### 2. Create Products in Stripe

Go to **Products** in Stripe Dashboard and create:

| Product | Monthly Price | Yearly Price | Copy Price ID |
| ------- | ------------- | ------------ | ------------- |
| Premium | $9.99         | $95.88       | `price_...`   |
| Family  | $19.99        | $191.76      | `price_...`   |
| Chef    | $39.99        | $383.52      | `price_...`   |

### 3. Update Environment Variables

Add these to your `.env.local` file:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here

# Stripe Price IDs (from step 2)
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_premium_monthly_id_here
STRIPE_PREMIUM_YEARLY_PRICE_ID=price_premium_yearly_id_here
STRIPE_FAMILY_MONTHLY_PRICE_ID=price_family_monthly_id_here
STRIPE_FAMILY_YEARLY_PRICE_ID=price_family_yearly_id_here
STRIPE_CHEF_MONTHLY_PRICE_ID=price_chef_monthly_id_here
STRIPE_CHEF_YEARLY_PRICE_ID=price_chef_yearly_id_here

# Webhook Secret (from step 4)
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### 4. Set up Webhooks

1. Go to **Developers > Webhooks** in Stripe Dashboard
2. Click **"Add endpoint"**
3. **Endpoint URL**: `https://yourdomain.com/api/stripe/webhook`
4. **Select these events**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.trial_will_end`
5. Copy the **webhook secret** (`whsec_...`) and add to `.env.local`

### 5. Test Locally

For local testing, use Stripe CLI:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to your local app
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### 6. Test the Flow

1. Start your app: `npm run dev`
2. Go to: `http://localhost:3000/dashboard/subscription`
3. Click on a subscription plan
4. Use test card: `4242 4242 4242 4242`
5. Complete checkout
6. Check webhook events in Stripe CLI

## 🎯 Key Features

### Subscription Management

- ✅ Create subscriptions with 7-day trial (Premium)
- ✅ Handle subscription updates and cancellations
- ✅ Customer portal for self-service
- ✅ Automatic webhook processing

### Payment Features

- ✅ Secure Stripe Checkout
- ✅ Monthly and yearly billing
- ✅ Promotional codes support
- ✅ Failed payment handling

### Database Integration

- ✅ Automatic subscription sync with Supabase
- ✅ Feature access control
- ✅ User subscription status tracking

## 🔒 Security Features

- ✅ Webhook signature verification
- ✅ Server-side API key protection
- ✅ Supabase Row Level Security
- ✅ User authentication required

## 📱 User Experience

### Subscription Page

- Navigate to `/dashboard/subscription`
- View all available plans
- Compare features
- Start subscription flow

### Customer Portal

- Manage billing details
- View invoices
- Cancel subscriptions
- Update payment methods

## 🚀 Go Live Checklist

When ready for production:

1. **Switch to Live Mode** in Stripe Dashboard
2. **Get Live API Keys** (starts with `pk_live_` and `sk_live_`)
3. **Create Live Products** with same pricing
4. **Update Environment Variables** with live keys
5. **Set up Live Webhooks** pointing to production URL
6. **Test with Real Card** (small amount)

## 🛟 Troubleshooting

### Common Issues:

- **401 Errors**: Check API keys are correct
- **Webhook Failures**: Verify webhook secret matches
- **Product Not Found**: Ensure price IDs are correct
- **Database Errors**: Check Supabase connection

### Debug Tools:

- Stripe Dashboard > Logs
- Stripe CLI webhook monitoring
- Browser developer console
- App server logs

## 💡 Next Steps

After setup, you can:

- Customize subscription tiers and pricing
- Add more webhook events
- Implement usage-based billing
- Add email notifications
- Create custom billing portal

Your Stripe integration is production-ready! 🎉
