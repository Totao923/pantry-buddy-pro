import React, { useState } from 'react';
import { useAuth } from '../../lib/auth/AuthProvider';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface FamilyInviteModalProps {
  familyId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function FamilyInviteModal({
  familyId,
  onClose,
  onSuccess,
}: FamilyInviteModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'member' | 'admin' | 'child'>('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const { session } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError('Email is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/family/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          familyId,
          email,
          role,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setInviteLink(data.inviteLink);
        // Could also trigger email sending here
        setTimeout(() => {
          onSuccess();
        }, 2000);
      } else {
        setError(data.error || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('Invitation error:', error);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (inviteLink) {
    return (
      <Modal isOpen onClose={onClose} title="Invitation Sent!">
        <div className="space-y-4">
          <div className="text-center py-6">
            <div className="text-4xl mb-2">✉️</div>
            <h3 className="text-lg font-semibold text-green-600">Invitation Created!</h3>
            <p className="text-gray-600 mt-2">Share this link with {email} to join your family:</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-2">Invitation Link:</div>
            <div className="bg-white p-3 rounded border text-sm font-mono break-all">
              {inviteLink}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => navigator.clipboard.writeText(inviteLink)}
            >
              Copy Link
            </Button>
            <Button variant="primary" fullWidth onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen onClose={onClose} title="Invite Family Member">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter email address"
            required
          />
        </div>

        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
            Role
          </label>
          <select
            id="role"
            value={role}
            onChange={e => setRole(e.target.value as 'member' | 'admin' | 'child')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
            <option value="child">Child</option>
          </select>
          <p className="text-sm text-gray-500 mt-1">
            {role === 'admin' && 'Can invite other members and manage family settings'}
            {role === 'member' && 'Can view and contribute to family recipes and meal plans'}
            {role === 'child' && 'Limited access with child-friendly content only'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" fullWidth loading={loading}>
            Send Invitation
          </Button>
        </div>
      </form>
    </Modal>
  );
}
