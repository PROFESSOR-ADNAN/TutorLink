import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import Button from './ui/Button';

/**
 * Unlike Stripe's embedded CardElement, Chapa's checkout is a full redirect
 * — the student leaves TutorLink, pays on Chapa's hosted page (bank
 * transfer, telebirr, CBE Birr, or card), then gets redirected back.
 * There's no card form to render here at all.
 *
 * <ChapaCheckout bookingId={booking._id} amount={booking.payment.amount} />
 */
export default function ChapaCheckout({ bookingId, amount }) {
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    try {
      const { checkoutUrl } = await api.post(`/payments/initialize/${bookingId}`);
      window.location.href = checkoutUrl;
    } catch (err) {
      toast.error(err.message || 'Could not start payment');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-canvas-100 rounded-xl p-4 text-sm text-ink-600">
        You'll be taken to Chapa's secure checkout page to pay by bank transfer, telebirr,
        CBE Birr, or card. You'll be brought back here automatically once it's done.
      </div>

      <div className="flex items-center justify-between py-3 border-t border-canvas-300">
        <span className="text-sm text-ink-600">Total</span>
        <span className="text-xl font-serif text-ink-900">{amount} ETB</span>
      </div>

      <Button onClick={handlePay} loading={loading} className="w-full py-3 text-base justify-center">
        {loading ? 'Redirecting…' : `Pay ${amount} ETB with Chapa`}
      </Button>
    </div>
  );
}
