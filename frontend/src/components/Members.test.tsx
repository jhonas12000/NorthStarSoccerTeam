import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext, type AuthContextValue } from '../auth-context';
import Finance from './Finance';
import Members from './Members';

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

describe('Members payment navigation', () => {
  it('opens the selected member payment history from the member list', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          members: [
            { id: 'member-1', firstName: 'Alex', lastName: 'Morgan', parentFirstNames: ['Alex', 'Jordan'], telephone: '5551234567', email: 'alex@example.com', paymentStatus: { label: '2 months behind', kind: 'behind', months: 2 } },
            { id: 'member-2', firstName: 'Casey', lastName: 'Lee', parentFirstNames: ['Casey'], telephone: '5559876543', email: 'casey@example.com', paymentStatus: { label: '3 months ahead', kind: 'ahead', months: 3 } },
            { id: 'member-3', firstName: 'Robin', lastName: 'Park', parentFirstNames: ['Robin'], telephone: '5559876500', email: 'robin@example.com', paymentStatus: { label: 'Fully paid', kind: 'paid', months: 12 } },
            { id: 'member-4', firstName: 'Morgan', lastName: 'Ray', parentFirstNames: ['Morgan'], telephone: '5559876501', email: 'morgan@example.com', paymentStatus: { label: 'Up to date', kind: 'current', months: 0 } },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          member: { id: 'member-1', firstName: 'Alex', lastName: 'Morgan' },
          totalPaidCents: 0,
          payments: [],
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <MemoryRouter initialEntries={['/members']}>
        <AuthContext.Provider value={financeUser}>
          <Routes>
            <Route path="/members" element={<Members />} />
            <Route path="/finance/*" element={<Finance />} />
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Alex / Jordan')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('2 months behind')).toBeInTheDocument();
    expect(screen.getByText('3 months ahead')).toBeInTheDocument();
    expect(screen.getByText('Fully paid')).toBeInTheDocument();
    expect(screen.getByText('Up to date')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Payment history for Alex Morgan' }));

    expect(await screen.findByRole('heading', { name: 'Alex Morgan' })).toBeInTheDocument();
    expect(screen.getByText('No recorded payments for this member yet.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith('/api/finance/members/member-1/payments', { credentials: 'same-origin' });
  });
});
