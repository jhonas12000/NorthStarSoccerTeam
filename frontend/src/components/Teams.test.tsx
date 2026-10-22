import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '../auth-context';
import { MemoryRouter } from 'react-router-dom';
import Teams from './Teams';

const makeUser = (role: string): AuthContextValue => ({
  user: { id: 'user-1', firstName: 'Alex', lastName: 'Morgan', email: 'alex@example.com', role },
  loading: false,
  setUser: vi.fn(),
  logout: vi.fn(async () => undefined),
});

afterEach(cleanup);

function renderTeams(role: string | null) {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={{ ...makeUser(role || 'user'), user: role ? makeUser(role).user : null }}>
        <Teams />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

describe('Teams roster links', () => {
  it('keeps team information public but hides roster links from visitors', () => {
    renderTeams(null);
    expect(screen.getByRole('heading', { name: 'Our Teams' })).toBeInTheDocument();
    expect(screen.getByText('U-6')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Show list for U-6' })).not.toBeInTheDocument();
  });

  it('shows a roster link to head coaches, chairpersons, and admins', () => {
    const { unmount } = renderTeams('head_coach');
    expect(screen.getByRole('link', { name: 'Show list for U-6' })).toHaveAttribute('href', '/teams/U-6');
    expect(screen.getByRole('link', { name: 'Show list for U-14' })).toBeInTheDocument();
    unmount();

    const chairmanView = renderTeams('chairman');
    expect(screen.getByRole('link', { name: 'Show list for U-10' })).toBeInTheDocument();
    chairmanView.unmount();

    renderTeams('admin');
    expect(screen.getByRole('link', { name: 'Show list for U-8' })).toBeInTheDocument();
  });
});
