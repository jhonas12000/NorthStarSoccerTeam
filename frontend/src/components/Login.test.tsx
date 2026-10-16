import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Login', () => {
  const renderLogin = () => render(<MemoryRouter><Login /></MemoryRouter>);

  it('renders required email and password fields', () => {
    renderLogin();

    expect(screen.getByLabelText('Email address')).toBeRequired();
    expect(screen.getByLabelText('Password')).toBeRequired();
    expect(screen.getByRole('checkbox', { name: 'Remember me' })).toBeInTheDocument();
  });

  it('toggles password visibility and reports rejected credentials', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Incorrect email or password.' }),
    }));
    renderLogin();

    const passwordInput = screen.getByLabelText('Password');
    await user.type(screen.getByLabelText('Email address'), 'player@example.com');
    await user.type(passwordInput, 'sample-password');
    await user.click(screen.getByRole('button', { name: 'Show password' }));

    expect(passwordInput).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password.');
  });
});
