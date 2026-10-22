import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AdminInvitations from './AdminInvitations';

const invitation = {
  id: 'invite-1',
  contactMethod: 'email' as const,
  email: 'pending@example.com',
  telephone: null,
  role: 'head_coach',
  status: 'pending',
  createdAt: '2026-10-22T12:00:00.000Z',
  expiresAt: '2026-10-29T12:00:00.000Z',
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('AdminInvitations', () => {
  it('deletes a pending invitation after confirmation', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ invitations: [invitation] }) })
      .mockResolvedValueOnce({ ok: true, status: 204 });
    const confirmMock = vi.fn(() => true);
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('confirm', confirmMock);

    render(<AdminInvitations />);
    await user.click(await screen.findByRole('button', { name: 'Delete invitation for pending@example.com' }));

    expect(confirmMock).toHaveBeenCalledWith(expect.stringContaining('Delete the pending invitation'));
    expect(fetchMock).toHaveBeenLastCalledWith('/api/invitations/invite-1', expect.objectContaining({
      method: 'DELETE',
      credentials: 'same-origin',
    }));
    expect(await screen.findByRole('status')).toHaveTextContent('Invitation for pending@example.com deleted.');
    expect(screen.queryByText('pending@example.com')).not.toBeInTheDocument();
  });

  it('does not show delete action for accepted invitations', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ invitations: [{ ...invitation, status: 'accepted' }] }),
    }));

    render(<AdminInvitations />);

    expect(await screen.findByText('accepted')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete invitation for pending@example.com' })).not.toBeInTheDocument();
  });
});
