import { NextApiRequest, NextApiResponse } from 'next';
import { stripe } from '../../../lib/stripe/stripe';
import { SubscriptionService } from '../../../lib/services/subscriptionService';
import Stripe from 'stripe';
import { buffer } from 'micro';

// Disable Next.js body parsing for webhooks
export const config = {
  api: {
    bodyParser: false,
  },
};

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = await buffer(req);
    const signature = req.headers['stripe-signature'] as string;

    if (!webhookSecret) {
      console.error('Missing STRIPE_WEBHOOK_SECRET environment variable');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    console.log(`Received webhook: ${event.type}`);

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Checkout session completed:', session.id);

        // The subscription is created automatically by Stripe
        // We'll handle it in the customer.subscription.created event
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await SubscriptionService.handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await SubscriptionService.handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Payment succeeded for invoice:', invoice.id);

        // If this is a subscription invoice, the subscription.updated event will handle it
        if ((invoice as any).subscription) {
          console.log('Subscription payment succeeded:', (invoice as any).subscription);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Payment failed for invoice:', invoice.id);

        // Handle failed payment - could send email notification
        if ((invoice as any).subscription) {
          console.log('Subscription payment failed:', (invoice as any).subscription);
          // The subscription status will be updated via subscription.updated event
        }
        break;
      }

      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Trial ending soon for subscription:', subscription.id);

        // Could send email notification about trial ending
        // Implementation depends on your email service
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({
      error: 'Webhook handler failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
