# TODO: Debug Analytics vs Pantry Store Count Discrepancy

## Problem Statement

After copying the exact receipt loading logic from pantry dashboard to analytics dashboard, there's still a discrepancy:

- **Analytics Dashboard**: Shows 2 stores
- **Pantry Dashboard**: Shows correct 3 stores

Both should show the same data since they now use identical receipt loading logic.

## Investigation Plan

- [ ] Debug analytics vs pantry store count discrepancy (2 vs 3 stores)
- [ ] Check if SpendingAnalytics component is filtering stores differently
- [ ] Compare actual receipt data being passed to both components
- [ ] Fix any remaining differences in data handling
- [ ] Verify both dashboards show same store count

## Possible Causes

1. **Timing Issues**: Analytics dashboard might be rendering before receipts are loaded
2. **Component Props**: Different props being passed to SpendingAnalytics component
3. **Data Filtering**: SpendingAnalytics component filtering stores differently in different contexts
4. **State Updates**: Receipt loading happening at different times
5. **Caching**: Old data being cached in analytics dashboard

## Investigation Areas

1. **Receipt Loading Timing**: Check when receipts are loaded in both dashboards
2. **SpendingAnalytics Component**: Examine if component behaves differently based on context
3. **Console Logs**: Compare receipt data being logged in both locations
4. **Component State**: Check if receipts state is being updated correctly
5. **Data Flow**: Trace the complete data flow from loading to display

## Expected Outcome

Both analytics and pantry dashboards should show the exact same store count (3 stores) since they now use identical receipt loading logic.
