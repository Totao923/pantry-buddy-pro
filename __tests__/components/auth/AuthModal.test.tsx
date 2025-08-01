import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import AuthModal from '../../../components/auth/AuthModal';
import { useAuth } from '../../../lib/auth/AuthProvider';

// Mock the useAuth hook
jest.mock('../../../lib/auth/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('AuthModal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    initialMode: 'signin' as const,
  };

  const mockAuthMethods = {
    signIn: jest.fn(),
    signUp: jest.fn(),
    resetPassword: jest.fn(),
    signInWithProvider: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue(mockAuthMethods as any);
  });

  it('renders signin mode by default', () => {
    render(<AuthModal {...defaultProps} />);

    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByText("Don't have an account?")).toBeInTheDocument();
  });

  it('renders signup mode when initialMode is signup', () => {
    render(<AuthModal {...defaultProps} initialMode="signup" />);

    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
  });

  it('switches between signin and signup modes', async () => {
    const user = userEvent.setup();
    render(<AuthModal {...defaultProps} />);

    // Start in signin mode
    expect(screen.getByText('Welcome Back')).toBeInTheDocument();

    // Switch to signup
    await user.click(screen.getByRole('button', { name: /sign up/i }));
    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();

    // Switch back to signin
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
  });

  it('handles signin form submission', async () => {
    const user = userEvent.setup();
    mockAuthMethods.signIn.mockResolvedValue({ error: null });

    render(<AuthModal {...defaultProps} />);

    // Wait for form to render
    await waitFor(() => {
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    });

    // Fill in form
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    // Submit form
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockAuthMethods.signIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('handles signup form submission', async () => {
    const user = userEvent.setup();
    mockAuthMethods.signUp.mockResolvedValue({ error: null });

    render(<AuthModal {...defaultProps} initialMode="signup" />);

    // Fill in form
    await user.type(screen.getByLabelText(/full name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');

    // Submit form
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockAuthMethods.signUp).toHaveBeenCalledWith('test@example.com', 'password123', {
        name: 'John Doe',
      });
    });
  });

  it('handles password reset', async () => {
    const user = userEvent.setup();
    mockAuthMethods.resetPassword.mockResolvedValue({ error: null });

    render(<AuthModal {...defaultProps} />);

    // Switch to reset mode
    await user.click(screen.getByText(/forgot your password/i));
    expect(screen.getByText('Reset Password')).toBeInTheDocument();

    // Fill in email and submit
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /send reset email/i }));

    await waitFor(() => {
      expect(mockAuthMethods.resetPassword).toHaveBeenCalledWith('test@example.com');
    });
  });

  it('handles social login', async () => {
    const user = userEvent.setup();
    mockAuthMethods.signInWithProvider.mockResolvedValue({ error: null });

    render(<AuthModal {...defaultProps} />);

    // Click Google login
    await user.click(screen.getByRole('button', { name: /google/i }));

    await waitFor(() => {
      expect(mockAuthMethods.signInWithProvider).toHaveBeenCalledWith('google');
    });

    // Click GitHub login
    await user.click(screen.getByRole('button', { name: /github/i }));

    await waitFor(() => {
      expect(mockAuthMethods.signInWithProvider).toHaveBeenCalledWith('github');
    });
  });

  it('displays error messages', async () => {
    const user = userEvent.setup();
    mockAuthMethods.signIn.mockResolvedValue({ error: { message: 'Invalid credentials' } });

    render(<AuthModal {...defaultProps} />);

    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('displays success messages', async () => {
    const user = userEvent.setup();
    mockAuthMethods.signUp.mockResolvedValue({ error: null });

    render(<AuthModal {...defaultProps} initialMode="signup" />);

    await user.type(screen.getByLabelText(/full name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/account created/i)).toBeInTheDocument();
    });
  });

  it('closes modal when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<AuthModal {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /✕/ }));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('shows loading state during form submission', async () => {
    const user = userEvent.setup();
    // Make signIn hang to test loading state
    mockAuthMethods.signIn.mockImplementation(() => new Promise(() => {}));

    render(<AuthModal {...defaultProps} />);

    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByText(/signing in/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
  });

  it('does not render when isOpen is false', () => {
    render(<AuthModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Welcome Back')).not.toBeInTheDocument();
  });

  it('shows free account benefits in signup mode', () => {
    render(<AuthModal {...defaultProps} initialMode="signup" />);

    expect(screen.getByText(/what you get with your free account/i)).toBeInTheDocument();
    expect(screen.getByText(/store up to 50 pantry items/i)).toBeInTheDocument();
    expect(screen.getByText(/generate 5 ai recipes daily/i)).toBeInTheDocument();
  });
});
