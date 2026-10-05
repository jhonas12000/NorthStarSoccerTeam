import { useState, type FormEvent } from 'react';

const suggestedAmounts = [25, 50, 100, 250];

type DonationAmount = number | 'custom';

export default function Donation() {
  const [selectedAmount, setSelectedAmount] = useState<DonationAmount>(50);
  const [customAmount, setCustomAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const paymentStatus = new URLSearchParams(window.location.search).get('payment');

  const handleCheckout = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');

    const amount = selectedAmount === 'custom' ? Number(customAmount) : selectedAmount;
    const amountCents = Math.round(amount * 100);

    if (!Number.isFinite(amount) || amountCents < 100 || amountCents > 1_000_000) {
      setErrorMessage('Choose a donation between $1 and $10,000.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountCents }),
      });
      const result = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !result.url) {
        throw new Error(result.error || 'Unable to start checkout. Please try again.');
      }

      window.location.assign(result.url);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to start checkout. Please try again.',
      );
      setIsSubmitting(false);
    }
  };

  return (
    <section id="support" className="bg-blue-950 px-2 py-12 text-white sm:px-6 md:py-20">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-300">
            Make a difference
          </p>
          <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">Support our team</h2>
          <p className="mx-auto mt-4 max-w-2xl leading-7 text-blue-100">
            Your contribution helps young athletes access coaching, equipment, and opportunities to grow.
          </p>
        </div>

        {paymentStatus === 'success' && (
          <p className="mt-8 rounded-md bg-emerald-100 p-4 text-center font-semibold text-emerald-900" role="status">
            Thank you! Your donation checkout was completed.
          </p>
        )}
        {paymentStatus === 'cancelled' && (
          <p className="mt-8 rounded-md bg-amber-100 p-4 text-center font-semibold text-amber-950" role="status">
            Checkout was cancelled. You can choose an amount and try again.
          </p>
        )}

        <form onSubmit={handleCheckout} className="mx-auto mt-8 max-w-xl rounded-xl bg-white p-6 text-blue-950 shadow-xl sm:p-8">
          <fieldset>
            <legend className="font-bold">Choose a donation amount</legend>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {suggestedAmounts.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  aria-pressed={selectedAmount === amount}
                  onClick={() => setSelectedAmount(amount)}
                  className={`rounded-md border-2 px-3 py-3 font-bold transition ${selectedAmount === amount ? 'border-blue-950 bg-blue-950 text-white' : 'border-slate-200 hover:border-blue-950'}`}
                >
                  ${amount}
                </button>
              ))}
            </div>
            <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-md border-2 border-slate-200 px-4 py-3 has-checked:border-blue-950">
              <input
                type="radio"
                name="donation-amount"
                checked={selectedAmount === 'custom'}
                onChange={() => setSelectedAmount('custom')}
              />
              <span className="font-semibold">Other amount</span>
            </label>
            {selectedAmount === 'custom' && (
              <label className="mt-3 block text-sm font-semibold" htmlFor="custom-amount">
                Custom amount (USD)
                <div className="mt-1 flex items-center rounded-md border border-slate-300 px-3 focus-within:border-blue-950 focus-within:ring-2 focus-within:ring-blue-200">
                  <span aria-hidden="true">$</span>
                  <input
                    id="custom-amount"
                    type="number"
                    min="1"
                    max="10000"
                    step="0.01"
                    inputMode="decimal"
                    value={customAmount}
                    onChange={(event) => setCustomAmount(event.target.value)}
                    className="w-full border-0 px-2 py-3 outline-none"
                    placeholder="Enter amount"
                    required
                  />
                </div>
              </label>
            )}
          </fieldset>

          {errorMessage && (
            <p className="mt-4 text-sm font-semibold text-red-700" role="alert">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 w-full rounded-md bg-amber-400 px-5 py-3 font-bold text-blue-950 transition hover:bg-amber-300 disabled:cursor-wait disabled:opacity-70"
          >
            {isSubmitting ? 'Connecting to checkout…' : 'Continue to secure payment'}
          </button>
          <p className="mt-3 text-center text-sm text-slate-500">Secure payment checkout powered by Stripe.</p>
        </form>
      </div>
    </section>
  );
}
