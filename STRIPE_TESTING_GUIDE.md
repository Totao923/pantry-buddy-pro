# Stripe Testing Guide - Pantry Buddy Pro

## 🚀 Quick Start Testing

### Prerequisites

1. Stripe account with test API keys configured
2. Stripe CLI installed locally
3. Webhook endpoint configured in Stripe Dashboard
4. Stripe products and prices created in dashboard

## 📋 Testing Checklist

### 1. Environment Setup ✅

**Required Environment Variables:**

```bash
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Price IDs (create these in Stripe Dashboard)
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_...
STRIPE_PREMIUM_YEARLY_PRICE_ID=price_...
STRIPE_FAMILY_MONTHLY_PRICE_ID=price_...
STRIPE_FAMILY_YEARLY_PRICE_ID=price_...
STRIPE_CHEF_MONTHLY_PRICE_ID=price_...
STRIPE_CHEF_YEARLY_PRICE_ID=price_...

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

**Subscription Tiers (from implementation):**

- Premium: $9.99/month, $95.88/year (7-day trial)
- Family: $19.99/month, $191.76/year
- Chef: $39.99/month, $383.52/year

### 2. Stripe CLI Setup

**Install Stripe CLI:**

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows/Linux - download from https://github.com/stripe/stripe-cli/releases
```

**Login and Configure:**

```bash
# Login to Stripe
stripe login

# Forward webhooks to local development
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

The CLI will output a webhook signing secret like:

```
whsec_1234567890abcdef...
```

Add this to your `.env.local` as `STRIPE_WEBHOOK_SECRET`.

### 3. Test Payment Flows

#### A. Premium Subscription ($9.99/month)

```bash
# Start your Next.js app
npm run dev

# Navigate to subscription page
# http://localhost:3001/dashboard/subscription

# Click "Upgrade to Premium"
# Use test card: 4242 4242 4242 4242
# Any future expiry date, any CVC
```

#### B. Family Subscription ($14.99/month)

```bash
# Same flow but select Family tier
# Test card: 4000 0000 0000 0002 (Visa debit)
```

#### C. Chef Subscription ($19.99/month)

```bash
# Same flow but select Chef tier
# Test card: 5555 5555 5555 4444 (Mastercard)
```

### 4. Test Card Numbers

**Successful Payments:**

- `4242 4242 4242 4242` - Visa
- `4000 0000 0000 0002` - Visa debit
- `5555 5555 5555 4444` - Mastercard
- `3782 822463 10005` - American Express

**Failed Payments:**

- `4000 0000 0000 0002` - Generic decline
- `4000 0000 0000 9995` - Insufficient funds
- `4000 0000 0000 0119` - Processing error

**3D Secure Authentication:**

- `4000 0027 6000 3184` - Requires authentication

### 5. Webhook Event Testing

#### Using Stripe CLI

```bash
# Listen for events
stripe listen --forward-to localhost:3001/api/stripe/webhook

# Trigger specific events for testing
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_succeeded
stripe trigger invoice.payment_failed
```

#### Expected Webhook Events Flow

**New Subscription:**

1. `checkout.session.completed` - User completes payment
2. `customer.subscription.created` - Subscription activated
3. `invoice.payment_succeeded` - First payment processed

**Monthly Renewal:**

1. `invoice.payment_succeeded` - Recurring payment
2. `customer.subscription.updated` - Status updated

**Cancellation:**

1. `customer.subscription.updated` - Status changed to cancel_at_period_end
2. `customer.subscription.deleted` - Subscription ended

### 6. Testing Scenarios

#### Scenario 1: Successful Premium Upgrade

```bash
# 1. User starts on Free tier
# 2. Navigate to /dashboard/subscription
# 3. Click "Upgrade to Premium"
# 4. Complete checkout with 4242 4242 4242 4242
# 5. Verify webhook events received
# 6. Check database for subscription record
# 7. Verify premium features unlocked
```

#### Scenario 2: Failed Payment

```bash
# 1. Use decline card 4000 0000 0000 0002
# 2. Verify payment failure handling
# 3. Check webhook events for payment_failed
# 4. Ensure user remains on current tier
```

#### Scenario 3: Subscription Cancellation

```bash
# 1. Create active subscription
# 2. Use Stripe CLI: stripe trigger customer.subscription.deleted
# 3. Verify user downgraded to Free tier
# 4. Check premium features are disabled
```

#### Scenario 4: Trial Period

```bash
# 1. Create subscription with trial
# 2. Use CLI: stripe trigger customer.subscription.trial_will_end
# 3. Verify trial ending notification
```

### 7. Database Verification

**Check Subscription Status:**

```sql
-- In Supabase SQL Editor
SELECT * FROM subscriptions WHERE user_id = 'your-user-id';
```

**Expected Fields:**

- `stripe_customer_id` - Customer ID from Stripe
- `stripe_subscription_id` - Subscription ID
- `tier` - premium/family/chef
- `status` - active/canceled/past_due
- `current_period_end` - Next billing date

### 8. Feature Access Testing

#### Premium Features to Test:

- [ ] Unlimited recipe generation (vs 5/day free limit)
- [ ] Advanced nutrition tracking
- [ ] AI nutritionist access
- [ ] Recipe scaling and customization
- [ ] Export recipes to PDF

#### Test Script:

```javascript
// In browser console on dashboard
// Check if premium features are accessible
const userTier = localStorage.getItem('userSubscriptionTier');
console.log('Current tier:', userTier);

// Try accessing premium features
// Should work for premium+ tiers, blocked for free
```

## 🔧 Debugging Common Issues

### Issue: Webhook Not Receiving Events

**Solution:**

```bash
# Check webhook endpoint is running
curl -X POST http://localhost:3001/api/stripe/webhook

# Verify webhook secret matches
echo $STRIPE_WEBHOOK_SECRET

# Check Stripe CLI connection
stripe listen --print-secret
```

### Issue: Payment Fails in Test Mode

**Solutions:**

- Use correct test card numbers
- Ensure in test mode (keys start with pk_test/sk_test)
- Check browser console for errors
- Verify CORS settings

### Issue: Database Not Updating

**Check:**

- Supabase connection
- Row Level Security policies
- Webhook handler logs
- Network connectivity

## 📊 Testing Checklist

### Core Payment Flow

- [ ] Create checkout session successfully
- [ ] Complete payment with test cards
- [ ] Receive webhook events
- [ ] Update database records
- [ ] Unlock premium features

### Subscription Management

- [ ] View current subscription
- [ ] Change subscription tier
- [ ] Cancel subscription
- [ ] Reactivate subscription
- [ ] Handle failed payments

### Edge Cases

- [ ] Network timeouts
- [ ] Invalid webhook signatures
- [ ] Database connection errors
- [ ] Rate limiting
- [ ] Duplicate events

## 🚨 Production Readiness

Before going live:

- [ ] Switch to live Stripe keys
- [ ] Configure production webhook endpoint
- [ ] Test with real (small amount) payments
- [ ] Set up monitoring and alerts
- [ ] Configure proper error handling
- [ ] Add user notification emails

## 📞 Support Resources

- **Stripe Documentation**: https://stripe.com/docs/testing
- **Webhook Testing**: https://stripe.com/docs/webhooks/test
- **Test Cards**: https://stripe.com/docs/testing#cards
- **Stripe CLI**: https://stripe.com/docs/stripe-cli

---

**Last Updated**: August 15, 2025
**Status**: Ready for testing
