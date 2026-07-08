import { loadStripe } from '@stripe/stripe-js';

const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY;

if (!STRIPE_PUBLIC_KEY && import.meta.env.DEV) {
  console.warn('VITE_STRIPE_PUBLIC_KEY is not set — payments will not work until it is configured.');
}

// loadStripe() should only ever be called once per page load — calling it
// repeatedly (e.g. once per page component) re-fetches Stripe.js and warns
// in the console. Any page that needs Stripe imports this singleton instead.
export const stripePromise = STRIPE_PUBLIC_KEY ? loadStripe(STRIPE_PUBLIC_KEY) : null;
