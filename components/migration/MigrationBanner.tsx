import React, { useState } from 'react';
import { useMigration } from '../../hooks/useMigration';

export default function MigrationBanner() {
  const { migrationState, startMigration, dismissMigration, retryMigration } = useMigration();
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't show banner if migration is not needed or already complete
  if (!migrationState.isNeeded || migrationState.isComplete) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-2xl">☁️</span>
            </div>

            <div className="flex-1">
              <h3 className="font-semibold text-lg">Upgrade to Cloud Storage Available!</h3>
              <p className="text-blue-100 text-sm">
                Migrate your local data to secure cloud storage with cross-device sync
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm font-medium"
            >
              Learn More
            </button>

            {migrationState.hasError ? (
              <button
                onClick={retryMigration}
                disabled={migrationState.isInProgress}
                className="px-6 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {migrationState.isInProgress ? 'Retrying...' : 'Retry Migration'}
              </button>
            ) : (
              <button
                onClick={startMigration}
                disabled={migrationState.isInProgress}
                className="px-6 py-2 bg-white text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {migrationState.isInProgress ? (
                  <>
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    Migrating...
                  </>
                ) : (
                  'Migrate Now'
                )}
              </button>
            )}

            <button
              onClick={dismissMigration}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Dismiss migration banner"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Error Display */}
        {migrationState.hasError && (
          <div className="mt-4 p-3 bg-red-500/20 border border-red-300/30 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-red-200">⚠️</span>
              <span className="text-sm">Migration failed: {migrationState.error}</span>
            </div>
          </div>
        )}

        {/* Expanded Information */}
        {isExpanded && (
          <div className="mt-6 p-6 bg-white/10 rounded-xl backdrop-blur-sm">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-lg mb-3">✨ What You Get</h4>
                <ul className="space-y-2 text-sm text-blue-100">
                  <li className="flex items-center gap-2">
                    <span className="text-green-300">✓</span>
                    Secure cloud storage for all your data
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-300">✓</span>
                    Automatic sync across all devices
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-300">✓</span>
                    Never lose your recipes or pantry items
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-300">✓</span>
                    Access your data anywhere, anytime
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-300">✓</span>
                    Enhanced security and privacy
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-lg mb-3">🔒 Migration Process</h4>
                <div className="space-y-2 text-sm text-blue-100">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs">
                      1
                    </div>
                    <span>Analyze your local data</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs">
                      2
                    </div>
                    <span>Securely encrypt and transfer</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs">
                      3
                    </div>
                    <span>Verify data integrity</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs">
                      4
                    </div>
                    <span>Create secure backup</span>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-white/10 rounded-lg">
                  <p className="text-xs text-blue-100">
                    <strong>Safe & Secure:</strong> Your original data remains untouched during
                    migration. You can always revert if needed.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-sm text-blue-100">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-300 rounded-full"></span>
                  <span>Free for all users</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-300 rounded-full"></span>
                  <span>Takes less than 30 seconds</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-300 rounded-full"></span>
                  <span>Fully reversible</span>
                </div>
              </div>

              <button
                onClick={() => setIsExpanded(false)}
                className="text-sm text-blue-200 hover:text-white transition-colors"
              >
                Collapse ↑
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
