# TODO: Fix Persistent Analytics Dashboard Store Count Issue

## Problem Statement

Despite implementing the timing fix, analytics dashboard still shows 2 stores while pantry dashboard shows the correct 3 stores. Server logs reveal analytics is still making calls to non-existent debug APIs.

## Server Log Analysis

From localhost:3000 logs:

- `GET /api/debug-all-receipts 404` - Analytics still trying to use old debug API
- Analytics dashboard may still be using complex fallback logic instead of simple receiptService
- Need to verify the timing fix is actually working

## Investigation Plan

- [x] Check server logs to identify why analytics still shows 2 stores vs pantry's 3
- [ ] Examine if analytics dashboard is still using old complex logic instead of simple receiptService
- [ ] Compare the exact receipt data being loaded in both dashboards using console logs
- [ ] Fix any remaining differences in receipt loading between analytics and pantry
- [ ] Verify both dashboards show identical store counts

## Key Findings

1. **API Call Issue**: Analytics dashboard making 404 calls to `/api/debug-all-receipts`
2. **Logic Not Updated**: The complex emergency loading logic may still be present
3. **Timing Fix**: May not be preventing the fallback to old logic

## Next Steps

1. Check if the analytics dashboard still has complex receipt loading code
2. Verify the timing fix is working correctly
3. Ensure both dashboards use identical receiptService.getUserReceipts() calls
4. Compare actual receipt data being passed to SpendingAnalytics component
5. Keep changes simple - minimal modifications only

## Expected Outcome

Both analytics and pantry dashboards should show exactly 3 stores using identical receipt loading logic.
