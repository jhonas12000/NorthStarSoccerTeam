import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '../auth-context';
import { MemoryRouter } from 'react-router-dom';
import MemberDashboard from './MemberDashboard';

const memberUser: AuthContextValue = {
  user: { id: 'member-1', firstName: 'Alex', lastName: 'Morgan', email: 'alex@example.com', role: 'user' },
  loading: false,
  setUser: vi.fn(),
  logout: vi.fn(async () => undefined),
};

const profile = {
  id: 'member-1',
  firstName: 'Alex',
  lastName: 'Morgan',
  email: 'alex@example.com',
  telephone: '5551234567',
  role: 'user',
  children: [{ id: 'child-1', firstName: 'Sam', lastName: 'Morgan', gender: 'male', birthMonth: 4, birthYear: 2015 }],
  memberSince: '2025-01-15T00:00:00.000Z',
  totalPaidCents: 3000,
  paidMonths: ['2025-01'],
  unpaidMonths: ['2025-02'],
  outstandingAmountCents: 3000,
  unallocatedMonthsCount: 0,
  payments: [{ id: 'payment-1', amountCents: 3000, category: 'Membership payment', description: '1 month membership payment', date: '2025-01-20', monthsPaid: ['2025-01'], months: 1 }],
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.mocked(memberUser.setUser).mockClear();
});

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/member']}>
      <AuthContext.Provider value={memberUser}>
        <MemberDashboard />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

describe('MemberDashboard profile', () => {
  it('shows contact details, children, unpaid dues, and payment history', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ profile }),
    }));

    renderDashboard();

    expect(await screen.findByRole('heading', { name: 'Alex Morgan' })).toBeInTheDocument();
    expect(screen.getByText('alex@example.com')).toBeInTheDocument();
    expect(screen.getByText('5551234567')).toBeInTheDocument();
    const childRow = screen.getByRole('row', { name: /Sam Morgan/ });
    expect(childRow).toHaveTextContent('Sam');
    expect(childRow).toHaveTextContent('Morgan');
    expect(screen.getByText('Outstanding balance').parentElement).toHaveTextContent('$30.00');
    expect(screen.getByText('February 2025')).toBeInTheDocument();
    expect(screen.getByText(/1 month membership payment.*January 2025/)).toBeInTheDocument();
  });

  it('saves profile contact details and updates the signed-in user', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ profile }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ profile: { id: 'member-1', firstName: 'Alexandra', lastName: 'Morgan', email: 'alexandra@example.com', telephone: '5559876543' } }),
      });
    vi.stubGlobal('fetch', fetchMock);

    renderDashboard();
    await user.click(await screen.findByRole('button', { name: 'Edit profile' }));
    await user.clear(screen.getByLabelText('First name'));
    await user.type(screen.getByLabelText('First name'), 'Alexandra');
    await user.clear(screen.getByLabelText('Email address'));
    await user.type(screen.getByLabelText('Email address'), 'alexandra@example.com');
    await user.clear(screen.getByLabelText('Telephone'));
    await user.type(screen.getByLabelText('Telephone'), '5559876543');
    await user.click(screen.getByRole('button', { name: 'Save profile' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Profile updated.');
    expect(fetchMock).toHaveBeenLastCalledWith('/api/profile', expect.objectContaining({
      method: 'PATCH',
      body: expect.stringContaining('alexandra@example.com'),
    }));
    expect(memberUser.setUser).toHaveBeenCalledWith(expect.objectContaining({ firstName: 'Alexandra', email: 'alexandra@example.com' }));
  });

  it('adds a child and supports deleting a registered child', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ profile }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ child: { id: 'child-2', firstName: 'Jamie', lastName: 'Morgan', gender: 'female', birthMonth: 9, birthYear: 2017 } }),
      })
      .mockResolvedValueOnce({ status: 204, ok: true });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('confirm', vi.fn(() => true));

    renderDashboard();
    await user.click((await screen.findAllByRole('button', { name: 'Add child' }))[0]);
    await user.type(screen.getByLabelText('First name'), 'Jamie');
    await user.type(screen.getByLabelText('Last name'), 'Morgan');
    await user.selectOptions(screen.getByLabelText('Gender'), 'female');
    await user.selectOptions(screen.getByLabelText('Birth month'), '9');
    await user.selectOptions(screen.getByLabelText('Birth year'), '2017');
    await user.click(screen.getByRole('button', { name: 'Save child' }));

    expect(await screen.findByRole('row', { name: /Jamie Morgan/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete Jamie Morgan' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Child removed from your profile.');
    expect(screen.queryByRole('row', { name: /Jamie Morgan/ })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith('/api/profile/children/child-2', expect.objectContaining({ method: 'DELETE' }));
  });

  it('edits a child from the children table', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ profile }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ child: { ...profile.children[0], firstName: 'Samuel' } }),
      });
    vi.stubGlobal('fetch', fetchMock);

    renderDashboard();
    await user.click(await screen.findByRole('button', { name: 'Edit Sam Morgan' }));
    await user.clear(screen.getByLabelText('First name'));
    await user.type(screen.getByLabelText('First name'), 'Samuel');
    await user.click(screen.getByRole('button', { name: 'Update child' }));

    expect(await screen.findByText('Samuel')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Child details updated.');
    expect(fetchMock).toHaveBeenLastCalledWith('/api/profile/children/child-1', expect.objectContaining({
      method: 'PATCH',
      body: expect.stringContaining('Samuel'),
    }));
  });
});
