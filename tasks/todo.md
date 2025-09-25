# TODO: Fix Receipt Store Name Detection Issue

## Problem Statement

Receipt scanning is not detecting/extracting the store name from newly scanned receipts. The OCR system should identify and capture store names for proper categorization and spending analytics.

## Analysis Plan

- [x] Analyze receipt scanning functionality and OCR store name detection
- [x] Review OCR API and store name extraction logic
- [x] Test with recent receipt and identify why store name wasn't detected
- [x] Fix store name detection in receipt processing
- [x] Update todo.md with findings and solution
- [ ] Add logo detection capability to OCR scanning

## Investigation Results

### Root Cause Found

The `extractStoreName` function in `receiptService.ts` had very limited store name detection:

- Only recognized 7 specific store chains
- Only checked first 5 lines of receipt
- Poor fallback logic

### Solution Implemented

Enhanced store name detection with:

1. **Expanded Store Patterns**: Added 20+ specific store chains including CVS, Walgreens, Home Depot, Aldi, etc.
2. **Generic Pattern Detection**: Added patterns for MARKET, GROCERY, SUPERMARKET, PHARMACY, possessive stores (Leonard's), and business entities (INC, LLC, CORP)
3. **Improved Line Analysis**: Now checks first 8 lines instead of 5
4. **Better Filtering**: Skips address lines, phone numbers, and obvious non-store content
5. **Smarter Fallback**: More intelligent selection of store-like lines

### Changes Made

- Modified `extractStoreName()` function in `lib/services/receiptService.ts` (lines 205-270)
- Added comprehensive store pattern matching
- Improved text filtering and line analysis
- Build tested and successful

## New Enhancement Request: Logo Detection

### Problem

Some stores have logos on receipts that might be detected by OCR as text or symbols that could help identify the store.

### Proposed Solution

1. **Logo Text Detection**: Use Google Vision's TEXT_DETECTION to identify logo text/symbols
2. **Logo Pattern Matching**: Create patterns for common logo indicators (®, ™, specific symbols)
3. **Fallback Logic**: If logo detection fails, use existing text-based store name detection
4. **Integration**: Enhance the existing `extractStoreName` function to try logo detection first

### Implementation Plan

- Modify OCR processing to capture logo-related text
- Add logo pattern recognition to store detection
- Maintain backward compatibility with existing logic

## Files Modified

- `lib/services/receiptService.ts` - Enhanced store name extraction

## Expected Outcome

- Store names properly detected from receipt text
- Better coverage of store chains and local businesses
- Potential logo detection for additional accuracy
- Improved spending analytics and receipt organization
