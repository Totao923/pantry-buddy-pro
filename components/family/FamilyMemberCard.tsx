import React from 'react';
import { Card } from '../ui/Card';

interface FamilyMemberCardProps {
  email: string;
  role: string;
  isChild: boolean;
  isOnline?: boolean;
}

const roleIcons = {
  owner: '👑',
  admin: '⭐',
  member: '👤',
  child: '👶',
};

const roleColors = {
  owner: 'text-yellow-600 bg-yellow-100',
  admin: 'text-purple-600 bg-purple-100',
  member: 'text-blue-600 bg-blue-100',
  child: 'text-green-600 bg-green-100',
};

export default function FamilyMemberCard({
  email,
  role,
  isChild,
  isOnline = false,
}: FamilyMemberCardProps) {
  const roleKey = role.toLowerCase() as keyof typeof roleIcons;
  const displayRole = isChild ? 'child' : roleKey;

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center space-x-3">
        {/* Avatar */}
        <div className="relative">
          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-xl">
            {roleIcons[displayRole] || '👤'}
          </div>
          {isOnline && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
          )}
        </div>

        {/* Member Info */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 truncate">{email.split('@')[0]}</div>
          <div className="text-sm text-gray-500 truncate">{email}</div>
        </div>

        {/* Role Badge */}
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[displayRole]}`}>
          {displayRole.charAt(0).toUpperCase() + displayRole.slice(1)}
        </div>
      </div>

      {/* Additional Info for Children */}
      {isChild && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span>🔒</span>
            <span>Child-safe content only</span>
          </div>
        </div>
      )}
    </Card>
  );
}
