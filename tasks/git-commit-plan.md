# Git Commit Plan - Family Tier Subscription Fixes

## Problem

We have successfully committed the Family tier subscription fixes, but we need to:

1. Ensure analytics page changes are excluded from the push
2. Clean up any other debug/development files
3. Push only the clean subscription fixes to GitHub

## Current Status

- ✅ Family tier subscription fixes are already committed (commit 6120ad5)
- ❌ Analytics page contains debug code that should be excluded
- ❌ Need to review what other files should be excluded

## Plan

### 1. Review current git status

- Check what files are modified but not committed
- Identify which files should be excluded from the push

### 2. Clean up the commit if needed

- If analytics changes were included in the commit, create a new clean commit
- Exclude debug files and development changes

### 3. Push clean changes to GitHub

- Push only the subscription tier fixes
- Verify the push was successful

## Files that should be committed (Family tier fixes):

- `components/AInutritionist.tsx` - Fixed Premium access check
- `components/RecipeBookManager.tsx` - Fixed Premium access check
- `lib/middleware/subscription.ts` - Updated feature access logic
- `pages/api/nutrition/analyze.ts` - Fixed server-side Premium access
- `pages/dashboard/create-recipe.tsx` - Fixed mode selection access
- `pages/dashboard/recipe-books.tsx` - Fixed Premium access check

## Files to exclude:

- `pages/dashboard/analytics.tsx` - Contains debug code
- Any debug API files (`pages/api/debug-*`, `pages/api/test-*`)
- Development task files
- Local settings changes
