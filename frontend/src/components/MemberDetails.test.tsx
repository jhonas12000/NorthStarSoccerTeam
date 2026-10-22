import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '../auth-context';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MemberDetails from './MemberDetails';

const financeUser: AuthContextValue = {
  user: { id: 'finance-1', firstName: 'Taylor', lastName: 'Finance', email: 'finance@example.com', role: 'finance' },
  loading: false,
  setUser: vi.fn(),
  logout: vi.fn(async () => undefined),
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Finance member details', () => {
  it('shows payment months, payment amount/date, and this year unpaid dues', async () => {
    const year = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const paidMonth = `${year}-${String(Math.max(1, currentMonth - 1)).padStart(2, '0')}`;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          viewerRole: 'finance',
          member: { id: 'member-1', firstName: 'Alex', lastName: 'Morgan', email: 'alex@example.com', telephone: '5551234567' },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          member: { id: 'member-1', firstName: 'Alex', lastName: 'Morgan', membershipStartMonth: `${year}-01` },
          totalPaidCents: 3000,
          paidMonths: [paidMonth],
          unallocatedMonthsCount: 0,
          payments: [{ id: 'payment-1', amountCents: 3000, category: 'Membership payment', description: 'Membership dues', date: `${year}-01-15`, monthsPaid: [paidMonth] }],
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <MemoryRouter initialEntries={['/members/member-1']}>
        <AuthContext.Provider value={financeUser}>
          <Routes><Route path="/members/:id" element={<MemberDetails />} /></Routes>
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Payment information' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Months paid' })).toBeInTheDocument();
    expect(screen.getByText('Unpaid months this year')).toBeInTheDocument();
    expect(screen.getByText('Membership dues')).toBeInTheDocument();
    expect(screen.getByText('$30.00')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Record payment →' })).toHaveAttribute('href', '/finance/members/member-1/payments');
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/finance/members/member-1/payments', { credentials: 'same-origin' });
  });
});
