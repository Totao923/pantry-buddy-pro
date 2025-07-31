import { useState, useEffect } from 'react';
import { dataMigrationService } from '../lib/migration/dataMigration';
import { useAuth } from '../lib/auth/AuthProvider';
import { isDatabaseEnabled } from '../lib/config/environment';

interface MigrationState {
  isNeeded: boolean;
  isInProgress: boolean;
  isComplete: boolean;
  hasError: boolean;
  error: string | null;
  result: {
    userProfile: boolean;
    pantryItems: number;
    recipes: number;
    ratings: number;
    preferences: boolean;
  } | null;
}

interface MigrationHookReturn {
  migrationState: MigrationState;
  startMigration: () => Promise<void>;
  dismissMigration: () => void;
  retryMigration: () => Promise<void>;
  checkMigrationStatus: () => Promise<void>;
}

export function useMigration(): MigrationHookReturn {
  const { user } = useAuth();
  const [migrationState, setMigrationState] = useState<MigrationState>({
    isNeeded: false,
    isInProgress: false,
    isComplete: false,
    hasError: false,
    error: null,
    result: null
  });

  // Check if migration is needed on mount
  useEffect(() => {
    if (user && isDatabaseEnabled()) {
      checkMigrationStatus();
    }
  }, [user]);

  const checkMigrationStatus = async () => {
    if (!user || !isDatabaseEnabled()) return;

    try {
      const isNeeded = await dataMigrationService.needsMigration(user.id);
      
      setMigrationState(prev => ({
        ...prev,
        isNeeded,
        hasError: false,
        error: null
      }));
    } catch (error) {
      console.error('Error checking migration status:', error);
      setMigrationState(prev => ({
        ...prev,
        hasError: true,
        error: error instanceof Error ? error.message : 'Failed to check migration status'
      }));
    }
  };

  const startMigration = async () => {
    if (!user || migrationState.isInProgress) return;

    setMigrationState(prev => ({
      ...prev,
      isInProgress: true,
      hasError: false,
      error: null
    }));

    try {
      const result = await dataMigrationService.migrateData(user.id);
      
      if (result.success) {
        setMigrationState(prev => ({
          ...prev,
          isInProgress: false,
          isComplete: true,
          isNeeded: false,
          result: result.migratedItems,
          hasError: false,
          error: null
        }));

        // Show success message
        console.log('Migration completed successfully:', result.migratedItems);
        
        // Optional: Show toast notification
        if (typeof window !== 'undefined' && 'Notification' in window) {
          new Notification('Data Migration Complete', {
            body: 'Your data has been successfully migrated to the cloud!',
            icon: '/favicon.ico'
          });
        }
      } else {
        throw new Error(result.errors.join(', ') || 'Migration failed');
      }
    } catch (error) {
      console.error('Migration error:', error);
      setMigrationState(prev => ({
        ...prev,
        isInProgress: false,
        hasError: true,
        error: error instanceof Error ? error.message : 'Migration failed'
      }));
    }
  };

  const retryMigration = async () => {
    setMigrationState(prev => ({
      ...prev,
      hasError: false,
      error: null
    }));
    
    await startMigration();
  };

  const dismissMigration = () => {
    setMigrationState(prev => ({
      ...prev,
      isNeeded: false,
      hasError: false,
      error: null
    }));
    
    // Store dismissal in localStorage to avoid showing again
    if (user) {
      localStorage.setItem(`migration-dismissed-${user.id}`, 'true');
    }
  };

  return {
    migrationState,
    startMigration,
    dismissMigration,
    retryMigration,
    checkMigrationStatus
  };
}

// Hook for getting migration status without triggering automatic checks
export function useMigrationStatus() {
  const { user } = useAuth();
  const [status, setStatus] = useState({
    hasProfile: false,
    pantryItemsCount: 0,
    recipesCount: 0,
    ratingsCount: 0,
    loading: false
  });

  const getMigrationStatus = async () => {
    if (!user || !isDatabaseEnabled()) return;

    setStatus(prev => ({ ...prev, loading: true }));

    try {
      const migrationStatus = await dataMigrationService.getMigrationStatus(user.id);
      setStatus({
        ...migrationStatus,
        loading: false
      });
    } catch (error) {
      console.error('Error getting migration status:', error);
      setStatus(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    if (user && isDatabaseEnabled()) {
      getMigrationStatus();
    }
  }, [user]);

  return {
    status,
    refreshStatus: getMigrationStatus
  };
}