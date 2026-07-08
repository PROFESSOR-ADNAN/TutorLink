import { useState } from 'react';
import toast from 'react-hot-toast';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import api from '../services/api';
import Button from './ui/Button';

/**
 * <CheckoutForm bookingId={booking._id} amountCents={booking.payment.amount} onSuccess={...} />
 * amountCents is only used for the displayed total — the actual charge
 * amount always comes from the backend's PaymentIntent, never the client.
 */
export default function CheckoutForm({ bookingId, amountCents, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);

  const handlePay = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setPaying(true);
    try {
      const { clientSecret } = await api.post(`/payments/create-payment-intent/${bookingId}`);

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: elements.getElement(CardElement) },
      });

      if (result.error) {
        toast.error(result.error.message);
      } else {
        toast.success('Payment successful! Booking confirmed 🎉');
        onSuccess();
      }
    } catch (err) {
      toast.error(err.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <div className="bg-canvas-100 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-ink-600 mb-3">Card Details</h4>
        <div className="bg-white border border-canvas-300 rounded-xl p-3">
          <CardElement
            options={{
              style: { base: { fontSize: '14px', color: '#111827', '::placeholder': { color: '#9ca3af' } } },
            }}
          />
        </div>
        <p className="text-xs text-ink-400 mt-2">Test card: 4242 4242 4242 4242 · Any future date · Any CVC</p>
      </div>

      <div className="flex items-center justify-between py-3 border-t border-canvas-300">
        <span className="text-sm text-ink-600">Total</span>
        <span className="text-xl font-serif text-ink-900">${(amountCents / 100).toFixed(2)}</span>
      </div>

      <Button type="submit" disabled={!stripe} loading={paying} className="w-full py-3 text-base justify-center">
        {paying ? 'Processing…' : `Pay $${(amountCents / 100).toFixed(2)}`}
      </Button>
    </form>
  );
}
