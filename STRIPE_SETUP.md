# Stripe Setup Guide for Pantry Buddy Pro

This guide will walk you through setting up Stripe payments for your Pantry Buddy Pro application.

## 🚀 Quick Setup

### 1. Create a Stripe Account

1. Go to [stripe.com](https://stripe.com) and sign up for an account
2. Complete the business verification process
3. Note your account details for later configuration

### 2. Get Your API Keys

1. Navigate to the [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Copy your **Publishable key** and **Secret key**
3. For production, make sure to use the live keys (not test keys)

### 3. Environment Configuration

Add these to your `.env.local` file:

```env
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here

# Webhook secret (we'll get this in step 5)
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### 4. Create Products and Prices

You need to create products and prices in Stripe for each subscription tier:

#### In Stripe Dashboard:

1. Go to **Products** → **Add Product**
2. Create these products:

**Premium Plan**
- Name: "Pantry Buddy Pro - Premium"
- Description: "Unlimited AI recipes and advanced features"
- Pricing:
  - Monthly: $9.99/month (recurring)
  - Yearly: $95.88/year (recurring)

**Family Plan**  
- Name: "Pantry Buddy Pro - Family"
- Description: "Premium features for up to 6 family members"
- Pricing:
  - Monthly: $19.99/month (recurring)
  - Yearly: $191.76/year (recurring)

**Chef Plan**
- Name: "Pantry Buddy Pro - Chef"
- Description: "Professional features for serious home chefs"
- Pricing:
  - Monthly: $39.99/month (recurring)
  - Yearly: $383.52/year (recurring)

#### Copy Price IDs

After creating each price, copy the price ID (starts with `price_`) and add to your `.env.local`:

```env
# Stripe Price IDs
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_1234567890abcdef
STRIPE_PREMIUM_YEARLY_PRICE_ID=price_0987654321fedcba
STRIPE_FAMILY_MONTHLY_PRICE_ID=price_1111222233334444
STRIPE_FAMILY_YEARLY_PRICE_ID=price_4444333322221111
STRIPE_CHEF_MONTHLY_PRICE_ID=price_5555666677778888
STRIPE_CHEF_YEARLY_PRICE_ID=price_8888777766665555
```

### 5. Set Up Webhooks

1. Go to **Developers** → **Webhooks** in Stripe Dashboard
2. Click **Add endpoint**
3. Set endpoint URL to: `https://yourdomain.com/api/stripe/webhook`
4. Select these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `checkout.session.completed`
5. Copy the webhook signing secret and add to `.env.local`:

```env
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### 6. Configure Customer Portal

1. Go to **Settings** → **Billing** → **Customer Portal**
2. Enable the customer portal
3. Configure allowed operations:
   - ✅ Update payment method
   - ✅ Update billing address
   - ✅ View invoice history
   - ✅ Cancel subscription
   - ✅ Switch plans (configure allowed plan changes)

## 🧪 Testing

### Test Cards

Use these test cards for development:

- **Successful payment**: `4242 4242 4242 4242`
- **Declined payment**: `4000 0000 0000 0002`
- **Subscription with trial**: `4000 0000 0000 0341`

### Testing Webhooks

1. Install [Stripe CLI](https://stripe.com/docs/stripe-cli)
2. Login: `stripe login`
3. Forward webhooks to local development:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
4. The CLI will display a webhook signing secret for testing

## 🏭 Production Checklist

### Security

- [ ] Switch to live API keys in production
- [ ] Ensure webhook endpoint uses HTTPS
- [ ] Verify webhook signature validation is working
- [ ] Test subscription flows end-to-end
- [ ] Set up monitoring for failed payments

### Business Settings

- [ ] Configure business information in Stripe
- [ ] Set up tax calculation (if applicable)
- [ ] Configure email receipts
- [ ] Set up billing descriptor
- [ ] Configure subscription settings (grace periods, retry logic)

### Compliance

- [ ] Review Stripe's terms of service
- [ ] Ensure PCI compliance
- [ ] Configure data retention policies
- [ ] Set up required legal pages (terms, privacy policy)

## 📊 Monitoring

### Key Metrics to Track

1. **Conversion Rate**: Visitors → Trial → Paid
2. **Churn Rate**: Monthly/Annual cancellation rate
3. **Monthly Recurring Revenue (MRR)**
4. **Customer Lifetime Value (CLV)**
5. **Failed Payment Recovery Rate**

### Stripe Dashboard

Monitor these sections regularly:
- **Payments** → Failed payments
- **Billing** → Subscription metrics
- **Disputes** → Chargebacks and disputes
- **Radar** → Fraud prevention

## 🛠️ Troubleshooting

### Common Issues

**Webhook Not Receiving Events**
- Verify endpoint URL is correct and accessible
- Check webhook signing secret
- Ensure endpoint returns 200 status code
- Check Stripe webhook logs for delivery attempts

**Payment Failures**
- Review declined payment reasons
- Check if customers need to update payment methods
- Monitor retry logic and dunning management

**Subscription Sync Issues**
- Verify webhook events are being processed correctly
- Check database subscription status matches Stripe
- Implement reconciliation job for data consistency

### Testing Commands

```bash
# Test webhook locally
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Trigger test events
stripe trigger payment_intent.succeeded
stripe trigger customer.subscription.created

# View webhook logs
stripe logs tail
```

## 📝 Support

For Stripe-specific issues:
- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Support](https://support.stripe.com)
- [Stripe Discord Community](https://discord.gg/stripe)

For Pantry Buddy Pro integration issues:
- Check the webhook logs in your application
- Review error messages in browser developer tools
- Ensure all environment variables are set correctly

---

## 🎯 Quick Reference

### Environment Variables
```env
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_...
STRIPE_PREMIUM_YEARLY_PRICE_ID=price_...
STRIPE_FAMILY_MONTHLY_PRICE_ID=price_...
STRIPE_FAMILY_YEARLY_PRICE_ID=price_...
STRIPE_CHEF_MONTHLY_PRICE_ID=price_...
STRIPE_CHEF_YEARLY_PRICE_ID=price_...
```

### API Endpoints
- Checkout: `POST /api/stripe/create-checkout-session`
- Portal: `POST /api/stripe/create-portal-session`
- Webhook: `POST /api/stripe/webhook`

### Database Migration
Run the subscription table migration:
```sql
-- See: supabase/migrations/003_create_subscriptions_table.sql
```

This completes your Stripe integration setup! 🎉