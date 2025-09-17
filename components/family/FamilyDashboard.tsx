import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth/AuthProvider';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import FamilyInviteModal from './FamilyInviteModal';
import FamilyMemberCard from './FamilyMemberCard';

interface FamilyInfo {
  has_family: boolean;
  families: Array<{
    id: string;
    name: string;
    is_owner: boolean;
    role: string;
    is_child: boolean;
    member_count: number;
    member_emails: string[];
  }>;
  pending_invitations: Array<{
    id: string;
    email: string;
    role: string;
    created_at: string;
  }>;
}

export default function FamilyDashboard() {
  const [familyInfo, setFamilyInfo] = useState<FamilyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const { session } = useAuth();

  useEffect(() => {
    if (session?.access_token) {
      loadFamilyInfo();
    }
  }, [session]);

  const loadFamilyInfo = async () => {
    try {
      const response = await fetch('/api/family/info', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFamilyInfo(data);
      }
    } catch (error) {
      console.error('Failed to load family info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteSuccess = () => {
    setShowInviteModal(false);
    loadFamilyInfo(); // Refresh family info
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!familyInfo?.has_family) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">👨‍👩‍👧‍👦</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Create Your Family</h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Start sharing recipes, meal plans, and nutrition tracking with your family members.
          </p>
          <Button onClick={() => setShowInviteModal(true)}>Invite Family Member</Button>
        </div>

        {showInviteModal && (
          <FamilyInviteModal
            onClose={() => setShowInviteModal(false)}
            onSuccess={handleInviteSuccess}
          />
        )}
      </div>
    );
  }

  const family = familyInfo.families[0]; // Use first family for now

  return (
    <div className="space-y-6">
      {/* Family Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{family.name}</h1>
          <p className="text-gray-600">
            {family.member_count} member{family.member_count !== 1 ? 's' : ''} • {family.role}
          </p>
        </div>
        {(family.is_owner || family.role === 'admin') && (
          <Button onClick={() => setShowInviteModal(true)} size="sm">
            Invite Member
          </Button>
        )}
      </div>

      {/* Family Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{family.member_count}</div>
            <div className="text-sm text-gray-600">Family Members</div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {familyInfo.pending_invitations?.length || 0}
            </div>
            <div className="text-sm text-gray-600">Pending Invites</div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">6</div>
            <div className="text-sm text-gray-600">Max Members</div>
          </div>
        </Card>
      </div>

      {/* Family Members */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Family Members</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {family.member_emails.map((email, index) => (
            <FamilyMemberCard
              key={`${email}-${index}`}
              email={email}
              role={index === 0 ? family.role : 'member'}
              isChild={false}
            />
          ))}
        </div>
      </Card>

      {/* Pending Invitations */}
      {familyInfo.pending_invitations && familyInfo.pending_invitations.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Pending Invitations</h3>
          <div className="space-y-3">
            {familyInfo.pending_invitations.map(invite => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg"
              >
                <div>
                  <div className="font-medium">{invite.email}</div>
                  <div className="text-sm text-gray-600">
                    {invite.role} • Sent {new Date(invite.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="px-3 py-1 bg-yellow-200 text-yellow-800 rounded-full text-sm">
                  Pending
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <FamilyInviteModal
          familyId={family.id}
          onClose={() => setShowInviteModal(false)}
          onSuccess={handleInviteSuccess}
        />
      )}
    </div>
  );
}
