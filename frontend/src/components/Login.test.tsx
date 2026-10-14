import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import Login from './Login';

afterEach(cleanup);

describe('Login', () => {
  it('renders required email and password fields', () => {
    render(<Login />);

    expect(screen.getByLabelText('Email address')).toBeRequired();
    expect(screen.getByLabelText('Password')).toBeRequired();
    expect(screen.getByRole('checkbox', { name: 'Remember me' })).toBeInTheDocument();
  });

  it('toggles password visibility and reports that authentication is not connected', async () => {
    const user = userEvent.setup();
    render(<Login />);

    const passwordInput = screen.getByLabelText('Password');
    await user.type(screen.getByLabelText('Email address'), 'player@example.com');
    await user.type(passwordInput, 'sample-password');
    await user.click(screen.getByRole('button', { name: 'Show password' }));

    expect(passwordInput).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Sign-in is not connected yet.');
  });
});
