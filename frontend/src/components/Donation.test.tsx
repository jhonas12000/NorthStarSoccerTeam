import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Donation from './Donation';

describe('Donation', () => {
  const assign = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('location', { search: '', assign });
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    assign.mockReset();
  });

  it('submits a suggested amount in cents and redirects to checkout', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://checkout.stripe.com/session' }),
    } as Response);
    render(<Donation />);

    await user.click(screen.getByRole('button', { name: '$25' }));
    await user.click(screen.getByRole('button', { name: 'Continue to secure payment' }));

    expect(fetch).toHaveBeenCalledWith('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountCents: 2500 }),
    });
    expect(assign).toHaveBeenCalledWith('https://checkout.stripe.com/session');
  });

  it('converts a custom donation amount to cents', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://checkout.stripe.com/session' }),
    } as Response);
    render(<Donation />);

    await user.click(screen.getByRole('radio', { name: 'Other amount' }));
    await user.type(screen.getByRole('spinbutton'), '12.34');
    await user.click(screen.getByRole('button', { name: 'Continue to secure payment' }));

    expect(fetch).toHaveBeenCalledWith(
      '/api/create-checkout-session',
      expect.objectContaining({ body: JSON.stringify({ amountCents: 1234 }) }),
    );
  });

  it('shows an error and allows retry when checkout cannot be started', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Payment service unavailable.' }),
    } as Response);
    render(<Donation />);

    await user.click(screen.getByRole('button', { name: 'Continue to secure payment' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Payment service unavailable.');
    expect(screen.getByRole('button', { name: 'Continue to secure payment' })).toBeEnabled();
    expect(assign).not.toHaveBeenCalled();
  });

  it('shows payment success and cancellation messages from the return URL', () => {
    vi.stubGlobal('location', { search: '?payment=success', assign });
    const { rerender } = render(<Donation />);

    expect(screen.getByRole('status')).toHaveTextContent('Thank you! Your donation checkout was completed.');

    vi.stubGlobal('location', { search: '?payment=cancelled', assign });
    rerender(<Donation />);
    expect(screen.getByRole('status')).toHaveTextContent('Checkout was cancelled.');
  });
});