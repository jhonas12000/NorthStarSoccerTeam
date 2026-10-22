import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '../auth-context';
import { MemoryRouter } from 'react-router-dom';
import Finance from './Finance';

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

function renderFinance(initialEntries = ['/finance']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthContext.Provider value={financeUser}>
        <Finance />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

describe('Finance', () => {
  it('links a recorded income payment to the selected member', async () => {
    const user = userEvent.setup();
    const now = new Date();
    const transactionDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ summary: { incomeCents: 0, expenseCents: 0, balanceCents: 0 }, transactions: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ members: [{ id: 'member-1', firstName: 'Alex', lastName: 'Morgan' }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          transaction: {
            id: 'payment-1',
            type: 'income',
            amountCents: 2500,
            category: 'Membership',
            description: 'Membership dues',
            date: transactionDate,
            memberId: 'member-1',
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          member: { id: 'member-1', firstName: 'Alex', lastName: 'Morgan' },
          totalPaidCents: 2500,
          payments: [{ id: 'payment-1', type: 'income', amountCents: 2500, category: 'Membership', description: 'Membership dues', date: transactionDate }],
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    renderFinance(['/finance/transaction?memberId=member-1']);
    await user.selectOptions(await screen.findByLabelText('Member (optional)'), 'member-1');
    await user.type(screen.getByLabelText('Amount (USD)'), '25.00');
    await user.type(screen.getByLabelText('Category'), 'Membership');
    await user.type(screen.getByLabelText('Description'), 'Membership dues');
    await user.click(screen.getByRole('button', { name: 'Save transaction' }));

    expect(await screen.findByRole('heading', { name: 'Alex Morgan' })).toBeInTheDocument();
    expect(fetchMock.mock.calls[2]?.[1]).toEqual(expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"memberId":"member-1"'),
    }));
    expect(screen.getByText('Total recorded: $25.00')).toBeInTheDocument();
  });

  it('shows all recorded payment history for a member', async () => {
    const currentYear = new Date().getFullYear();
    const january = `${currentYear}-01`;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        member: { id: 'member-1', firstName: 'Alex', lastName: 'Morgan', membershipStartMonth: january },
        totalPaidCents: 7500,
        paidMonths: [january],
        unallocatedMonthsCount: 0,
        payments: [
          { id: 'payment-1', type: 'income', amountCents: 5000, category: 'Membership', description: 'Fall dues', date: '2026-10-01', monthsPaid: [january], months: 1 },
          { id: 'payment-2', type: 'income', amountCents: 2500, category: 'Membership', description: 'Equipment fee', date: '2026-09-01' },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    renderFinance(['/finance/members/member-1/payments']);

    expect(await screen.findByRole('heading', { name: 'Alex Morgan' })).toBeInTheDocument();
    expect(screen.getByText('Total recorded: $75.00')).toBeInTheDocument();
    expect(screen.getByText('Fall dues')).toBeInTheDocument();
    expect(screen.getByText('Equipment fee')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/finance/members/member-1/payments', { credentials: 'same-origin' });
    expect(screen.getByRole('heading', { name: 'Membership months' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: `${currentYear} membership months` }).children).toHaveLength(12);
    expect(screen.getByText('Paid', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByLabelText('Select February ' + currentYear + ' for payment')).toBeInTheDocument();
    expect(screen.getByText('0 months selected · Total: $0.00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Record payment' })).toBeInTheDocument();
  });

  it('lets finance record an upcoming month in advance as finance income', async () => {
    const user = userEvent.setup();
    const now = new Date();
    const currentYear = now.getFullYear();
    const january = `${currentYear}-01`;
    const upcoming = new Date(currentYear, now.getMonth() + 1, 1);
    const upcomingMonthKey = `${upcoming.getFullYear()}-${String(upcoming.getMonth() + 1).padStart(2, '0')}`;
    const currentMonthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
      .format(new Date(Date.UTC(upcoming.getFullYear(), upcoming.getMonth(), 1)));
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          member: { id: 'member-1', firstName: 'Alex', lastName: 'Morgan', membershipStartMonth: january },
          totalPaidCents: 3000,
          paidMonths: [january],
          unallocatedMonthsCount: 0,
          payments: [{ id: 'payment-1', type: 'income', amountCents: 3000, category: 'Membership', description: 'January dues', date: `${january}-01`, monthsPaid: [january], months: 1 }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          transaction: {
            id: 'advance-payment',
            type: 'income',
            amountCents: 3000,
            category: 'Membership payment',
            description: '1 month membership payment',
            date: `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}-20`,
            monthsPaid: [upcomingMonthKey],
            months: 1,
          },
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    renderFinance(['/finance/members/member-1/payments']);
    await screen.findByRole('heading', { name: 'Alex Morgan' });
    await user.click(screen.getByLabelText(`Select ${currentMonthLabel} for payment`));
    expect(screen.getByText('1 month selected · Total: $30.00')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Record payment' }));

    expect(await screen.findByRole('status')).toHaveTextContent(`Payment recorded: ${currentMonthLabel}.`);
    expect(fetchMock).toHaveBeenLastCalledWith('/api/finance/members/member-1/payments/record', expect.objectContaining({
      method: 'POST',
      credentials: 'same-origin',
      body: JSON.stringify({ monthsPaid: [upcomingMonthKey] }),
    }));
    expect(screen.getByText('Total recorded: $60.00')).toBeInTheDocument();
  });

  it('updates paid month status and income total after direct payment recording', async () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const january = `${currentYear}-01`;
    const currentMonthKey = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentMonthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
      .format(new Date(Date.UTC(currentYear, now.getMonth(), 1)));
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          member: { id: 'member-1', firstName: 'Alex', lastName: 'Morgan', membershipStartMonth: january },
          totalPaidCents: 3000,
          paidMonths: [january],
          unallocatedMonthsCount: 0,
          payments: [{ id: 'payment-1', type: 'income', amountCents: 3000, category: 'Membership payment', description: '1 month membership payment', date: `${currentYear}-01-10`, monthsPaid: [january], months: 1 }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          transaction: {
            id: 'payment-2',
            type: 'income',
            amountCents: 3000,
            category: 'Membership payment',
            description: '1 month membership payment',
            date: `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
            monthsPaid: [currentMonthKey],
            months: 1,
          },
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    renderFinance(['/finance/members/member-1/payments']);

    expect(await screen.findByRole('list', { name: `${currentYear} membership months` })).toHaveTextContent('January ' + currentYear);
    await user.click(screen.getByLabelText(`Select ${currentMonthLabel} for payment`));
    await user.click(screen.getByRole('button', { name: 'Record payment' }));

    expect(await screen.findByRole('status')).toHaveTextContent(`Payment recorded: ${currentMonthLabel}.`);
    expect(screen.getByText('Total recorded: $60.00')).toBeInTheDocument();
    expect(screen.getAllByText('Paid', { selector: 'span' })).toHaveLength(2);
    expect(fetchMock).toHaveBeenLastCalledWith('/api/finance/members/member-1/payments/record', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ monthsPaid: [currentMonthKey] }),
    }));
  });

  it('opens the transaction form from the second menu and submits a transaction', async () => {
    const user = userEvent.setup();
    const currentDate = new Date();
    const transactionDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ summary: { incomeCents: 0, expenseCents: 0, balanceCents: 0 }, transactions: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ members: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          transaction: {
            id: 'transaction-1',
            type: 'income',
            amountCents: 2500,
            category: 'Registration',
            description: 'Player registration',
            date: transactionDate,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ summary: { incomeCents: 0, expenseCents: 0, balanceCents: 0 }, transactions: [] }),
      });
    vi.stubGlobal('fetch', fetchMock);

    renderFinance();
    await user.click(await screen.findByRole('link', { name: 'Transaction' }));

    expect(await screen.findByRole('heading', { name: 'Record a transaction' })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Type'), 'income');
    await user.type(screen.getByLabelText('Amount (USD)'), '25.00');
    await user.type(screen.getByLabelText('Category'), 'Registration');
    await user.type(screen.getByLabelText('Description'), 'Player registration');
    await user.click(screen.getByRole('button', { name: 'Save transaction' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Income recorded successfully.');
    expect(fetchMock.mock.calls[2]).toEqual(['/api/finance', expect.objectContaining({
      method: 'POST',
      credentials: 'same-origin',
      body: expect.stringContaining('"amountCents":2500'),
    })]);
    expect(screen.getByRole('heading', { name: 'Financial overview' })).toBeInTheDocument();
  });

  it('loads the selected quarterly and custom date ranges', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ summary: { incomeCents: 0, expenseCents: 0, balanceCents: 0 }, transactions: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    renderFinance();
    await screen.findByRole('heading', { name: 'Financial overview' });
    await user.click(screen.getByRole('button', { name: 'Quarterly' }));
    await screen.findByText('Showing totals for this quarter.');

    let requestUrl = String(fetchMock.mock.calls.at(-1)?.[0]);
    expect(requestUrl).toContain('/api/finance?startDate=');
    expect(requestUrl).toContain('&endDate=');

    await user.click(screen.getByRole('button', { name: 'Custom' }));
    const startDateInput = screen.getByLabelText('From');
    const endDateInput = screen.getByLabelText('To');
    await user.clear(startDateInput);
    await user.type(startDateInput, '2026-02-01');
    await user.clear(endDateInput);
    await user.type(endDateInput, '2026-02-28');

    await vi.waitFor(() => {
      requestUrl = String(fetchMock.mock.calls.at(-1)?.[0]);
      expect(requestUrl).toContain('startDate=2026-02-01');
      expect(requestUrl).toContain('endDate=2026-02-28');
    });
  });

  it('shows period totals and no more than ten recent transactions without an entry form', async () => {
    const transactions = Array.from({ length: 12 }, (_, index) => ({
      id: `transaction-${index + 1}`,
      type: index % 2 === 0 ? 'income' as const : 'expense' as const,
      amountCents: 5000,
      category: `Category ${index + 1}`,
      description: `Transaction ${index + 1}`,
      date: '2026-10-19',
    }));
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        summary: { incomeCents: 12500, expenseCents: 3000, balanceCents: 9500 },
        transactions,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    renderFinance();

    expect(await screen.findByText('$125.00')).toBeInTheDocument();
    expect(screen.getByText('$30.00')).toBeInTheDocument();
    expect(screen.getByText('$95.00')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '10 most recent transactions' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Record a transaction' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save transaction' })).not.toBeInTheDocument();
    expect(screen.getAllByText(/^Transaction \d+$/)).toHaveLength(10);
    expect(screen.queryByText('Transaction 11')).not.toBeInTheDocument();
    expect(screen.queryByText('Transaction 12')).not.toBeInTheDocument();
  });
});
