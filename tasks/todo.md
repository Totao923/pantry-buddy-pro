# TODO: Fix Analytics Dashboard Store Recognition Issue

## Problem Statement

The spending analytics on the analytics dashboard is not recognizing new stores being added, but the spending analytics in the pantry dashboard works correctly. Need to copy the working logic exactly from pantry dashboard to analytics dashboard without breaking existing functionality.

## Analysis Plan

- [ ] Analyze spending analytics logic differences between pantry and analytics dashboards
- [ ] Examine pantry dashboard spending analytics implementation
- [ ] Compare with analytics dashboard spending analytics
- [ ] Copy working logic from pantry to analytics dashboard
- [ ] Test and verify new stores are recognized in analytics dashboard
- [ ] Update todo.md with changes made

## Investigation Areas

1. **Pantry Dashboard**: Check how spending analytics loads and processes store data
2. **Analytics Dashboard**: Compare current implementation and identify differences
3. **Data Loading**: Examine receipt data loading mechanisms in both locations
4. **Store Detection**: Compare how stores are extracted and categorized
5. **Component Logic**: Find the exact logic differences causing the issue

## Files to Examine

- Pantry dashboard spending analytics component
- Analytics dashboard spending analytics component
- Shared SpendingAnalytics component
- Receipt loading services and data processing

## Expected Outcome

Analytics dashboard spending analytics should recognize new stores exactly like the pantry dashboard does, maintaining all existing functionality while fixing the store recognition issue.
