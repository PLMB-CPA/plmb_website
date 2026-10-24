import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect } from 'vitest';
import NotFound from '../components/public/NotFound';
import Login from '../components/admin/Login';

describe('Frontend Component Unit Tests', () => {
  test('NotFound component renders message and link back home', () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    );

    expect(screen.getByText('Page not found')).toBeInTheDocument();
    const homeLink = screen.getByRole('link', { name: /Back to Home/i });
    expect(homeLink).toHaveAttribute('href', '/');
  });

  test('Login component renders inputs and toggles password visibility', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    expect(screen.getByText('User Sign-In')).toBeInTheDocument();
    const usernameInput = screen.getByPlaceholderText('Username');
    const passwordInput = screen.getByPlaceholderText('Password');
    expect(usernameInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleButton = screen.getByRole('button', { name: /Show password/i });
    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');
  });
});
