import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '../auth-context';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import TeamRoster from './TeamRoster';

const makeUser = (role: string): AuthContextValue => ({
  user: { id: 'user-1', firstName: 'Alex', lastName: 'Morgan', email: 'alex@example.com', role },
  loading: false,
  setUser: vi.fn(),
  logout: vi.fn(async () => undefined),
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('TeamRoster', () => {
  it('loads the private roster for a head coach', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ players: [{ id: 'child-1', firstName: 'Sam', lastName: 'Morgan', age: 5, parents: ['Alex Morgan'] }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <MemoryRouter initialEntries={['/teams/U-6']}>
        <AuthContext.Provider value={makeUser('head_coach')}>
          <Routes><Route path="/teams/:division" element={<TeamRoster />} /></Routes>
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'U-6 roster' })).toBeInTheDocument();
    expect(screen.getByText('Sam Morgan')).toBeInTheDocument();
    expect(screen.getByText('Alex Morgan')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/members/teams/U-6/roster', { credentials: 'same-origin' });
  });

  it('does not fetch a roster for a regular member', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(
      <MemoryRouter initialEntries={['/teams/U-6']}>
        <AuthContext.Provider value={makeUser('user')}>
          <Routes><Route path="/teams/:division" element={<TeamRoster />} /></Routes>
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('loads team roster for the chairman role', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ players: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <MemoryRouter initialEntries={['/teams/U-6']}>
        <AuthContext.Provider value={makeUser('chairman')}>
          <Routes><Route path="/teams/:division" element={<TeamRoster />} /></Routes>
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'U-6 roster' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/members/teams/U-6/roster', { credentials: 'same-origin' });
  });
});
