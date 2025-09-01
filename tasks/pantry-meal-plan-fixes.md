# Critical Pantry and Meal Plan Issues Fix

## Problem Analysis

Three critical issues reported:

1. **Meal plans failing to save** - Users create meal plans but they don't persist
2. **Pantry clear all not working** - Clear function not removing items
3. **Items not appearing in pantry** - Success notification shows but items don't display

## Investigation Plan

### 1. Investigate Meal Plan Saving Issue

- [ ] Check `pages/dashboard/meal-plans.tsx` for save functionality
- [ ] Examine `lib/services/mealPlanService.ts` for persistence logic
- [ ] Review meal plan API endpoints (`pages/api/meal-plans/`)
- [ ] Check localStorage vs database save logic
- [ ] Add debugging to identify where save process fails

### 2. Debug Pantry Clear All Functionality

- [ ] Check `pages/dashboard/pantry.tsx` for clear all button/function
- [ ] Examine ingredient services for clearAllIngredients method
- [ ] Check if clear all updates both localStorage and database
- [ ] Verify IngredientsProvider context updates properly
- [ ] Test if clear all is calling the right service methods

### 3. Fix Pantry Item Addition Not Showing

- [ ] Check ingredient creation flow in relevant components
- [ ] Examine if items are being saved but not displayed
- [ ] Check IngredientsProvider refresh/reload logic
- [ ] Verify ingredient service factory is returning correct service
- [ ] Debug localStorage vs database sync issues
- [ ] Check if success notifications are premature

## Implementation Strategy

Following CLAUDE.md process:

1. Simple, minimal changes to fix each issue
2. Add comprehensive debugging first to identify root causes
3. Fix one issue at a time with targeted solutions
4. Test each fix before moving to next issue

## Expected Outcomes

- Meal plans save and persist properly
- Clear all button removes all pantry items and updates UI
- Added items appear immediately in pantry after success notification
- All functionality works reliably with proper error handling
