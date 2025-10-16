# Receipt Price Matching & Store Name Fix Plan

## Problems Identified:

1. **Store name still showing as "STORE MANAGER"** - Previous filtering not working
2. **Edit modal treating store name as an item** - Store name appearing in items list
3. **Items getting prices when they shouldn't** - Need better price-to-item matching
4. **Poor price matching logic** - Should only match prices that are:
   - Right across from the item (same line)
   - OR directly below the item (next line)

## Simple Plan (following CLAUDE.md):

### Task 1: Fix Store Name Extraction

- **File:** `lib/services/receiptService.ts`
- **Change:** Strengthen `isStoreInfoLine` filtering
- **Why:** "STORE MANAGER" lines are still getting through
- **How:** Add more aggressive filtering at the TOP of the method

### Task 2: Improve Price-to-Item Matching

- **File:** `lib/services/receiptService.ts`
- **Change:** Extract all prices first, then match to items based on position
- **Why:** Current logic assigns prices even when they're not adjacent
- **How:**
  1. Find all price patterns in text (e.g., `$12.99`, `12.99`)
  2. When extracting items, check if price is on SAME line or NEXT line
  3. Only assign price if it's adjacent to item name
  4. Otherwise leave price as `0` or `undefined`

### Task 3: Verify Store Name Not in Items List

- **File:** `lib/services/receiptService.ts`
- **Change:** Ensure extracted items array doesn't include store name
- **Why:** Store name appearing as an item in review modal
- **How:** After extracting items, filter out any item that matches store name

## Expected Results:

- ✅ Store name correctly identified (not "STORE MANAGER")
- ✅ Store name NOT appearing in items list
- ✅ Items only get prices when price is adjacent (same/next line)
- ✅ Items without adjacent prices show no price
- ✅ Better accuracy in receipt parsing

## Todo Items:

- [ ] Task 1: Fix store name extraction filtering
- [ ] Task 2: Implement price extraction and adjacent matching
- [ ] Task 3: Filter store name from items list
- [ ] Test with ShopRite receipt
