# TODO: Push Spending Analytics Fixes to Production

## Problem

The spending analytics on production app shows incorrect costs per store, but localhost:3000 works correctly. Need to push the working analytics code while excluding receipt history/deletion changes.

## Plan

- [x] Analyze current changes and identify what to exclude (receipt history/deletion)
- [ ] Examine spending analytics functionality on localhost:3000 vs production
- [ ] Exclude receipt history and deletion related changes from commit
- [ ] Stage and commit only the spending analytics fixes
- [ ] Push changes to GitHub

## Analysis Results

### Changes to EXCLUDE (Receipt History/Deletion related):

1. **pages/dashboard/receipts.tsx** - Contains debug console.log statements for receipt loading
2. **pages/api/debug-receipt-history.ts** - Debug API endpoint for receipt troubleshooting
3. **tasks/session-summary.md** - Documentation file from previous session

### Changes to INCLUDE (Spending Analytics fixes):

- The SpendingAnalytics.tsx component appears to be working correctly in localhost:3000
- Need to identify what specific changes are needed for production fix
- The component has proper store cost calculations in lines 133-155

## Strategy

1. Restore receipts.tsx to remove debug logs
2. Delete the debug API file
3. Commit only the spending analytics improvements
4. Push to production

## Notes

- SpendingAnalytics component shows costs per store correctly in storeData calculation
- Component creates proper store analysis with totalSpent, visits, avgPerVisit
- The issue might be in how the component is being called or data passed to it
