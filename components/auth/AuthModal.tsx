import React, { useState } from 'react';
import { useAuth } from '../../lib/auth/AuthProvider';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
}

export default function AuthModal({ isOpen, onClose, initialMode = 'signin' }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const { signIn, signUp, resetPassword } = useAuth();

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setError(null);
    setMessage(null);
    setLoading(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message || 'Failed to sign in');
        } else {
          setMessage('Successfully signed in!');
          setTimeout(handleClose, 1000);
        }
      } else if (mode === 'signup') {
        const { error } = await signUp(email, password, { name });
        if (error) {
          setError(error.message || 'Failed to create account');
        } else {
          setMessage('Account created! Please check your email to verify your account.');
          setTimeout(() => {
            setMode('signin');
            setMessage(null);
          }, 3000);
        }
      } else if (mode === 'reset') {
        const { error } = await resetPassword(email);
        if (error) {
          setError(error.message || 'Failed to send reset email');
        } else {
          setMessage('Password reset email sent! Check your email.');
          setTimeout(() => {
            setMode('signin');
            setMessage(null);
          }, 3000);
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md max-h-90vh overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {mode === 'signin' && 'Welcome Back'}
            {mode === 'signup' && 'Create Account'}
            {mode === 'reset' && 'Reset Password'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
            disabled={loading}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your full name"
                required={mode === 'signup'}
                disabled={loading}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your email"
              required
              disabled={loading}
            />
          </div>

          {mode !== 'reset' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your password"
                required
                disabled={loading}
                minLength={6}
              />
              {mode === 'signup' && (
                <p className="text-xs text-gray-500 mt-1">
                  Password must be at least 6 characters long
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {message && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {mode === 'signin' && 'Signing In...'}
                {mode === 'signup' && 'Creating Account...'}
                {mode === 'reset' && 'Sending Email...'}
              </div>
            ) : (
              <>
                {mode === 'signin' && 'Sign In'}
                {mode === 'signup' && 'Create Account'}
                {mode === 'reset' && 'Send Reset Email'}
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          {mode === 'signin' && (
            <>
              <button
                onClick={() => setMode('reset')}
                className="text-blue-600 hover:text-blue-700 text-sm"
                disabled={loading}
              >
                Forgot your password?
              </button>
              <div className="text-gray-600 text-sm">
                Don't have an account?{' '}
                <button
                  onClick={() => setMode('signup')}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                  disabled={loading}
                >
                  Sign up
                </button>
              </div>
            </>
          )}

          {mode === 'signup' && (
            <div className="text-gray-600 text-sm">
              Already have an account?{' '}
              <button
                onClick={() => setMode('signin')}
                className="text-blue-600 hover:text-blue-700 font-medium"
                disabled={loading}
              >
                Sign in
              </button>
            </div>
          )}

          {mode === 'reset' && (
            <div className="text-gray-600 text-sm">
              Remember your password?{' '}
              <button
                onClick={() => setMode('signin')}
                className="text-blue-600 hover:text-blue-700 font-medium"
                disabled={loading}
              >
                Sign in
              </button>
            </div>
          )}
        </div>

        {mode === 'signup' && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">
              🎉 What you get with your free account:
            </h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Store up to 50 pantry items</li>
              <li>• Generate 5 AI recipes daily</li>
              <li>• Basic pantry management</li>
              <li>• Recipe rating and reviews</li>
              <li>• Cross-device sync</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
