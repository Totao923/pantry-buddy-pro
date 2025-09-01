# Health Goals Integration for AI Meal Planning

## Problem Analysis

Currently, AI meal plan generation doesn't consider user health goals from the AI nutritionist component. Users can select health goals (Weight Loss, Muscle Gain, Health Maintenance, Heart Health) in the AI nutritionist, but these preferences aren't used when generating meal plans. This leads to generic meal plans that may not align with user's specific health objectives.

## Investigation Summary

- ✅ AI Nutritionist component has well-defined health goals system (`HEALTH_GOALS` array)
- ✅ Health goals include specific parameters (targetCalories, proteinMultiplier, restrictions)
- ✅ Meal plan generation API exists but doesn't accept health goal parameters
- ✅ No connection between user's selected health goal and meal plan generation

## Implementation Plan

### Phase 1: Add Health Goal Storage

- [ ] Create user health goal preference storage (database or local storage)
- [ ] Ensure health goal selection persists across components

### Phase 2: Modify Meal Plan Generation API

- [ ] Update `/pages/api/meal-plans/generate.ts` to accept health goal parameter
- [ ] Integrate health goal restrictions into AI recipe generation prompts
- [ ] Apply calorie and macro targets to recipe selection/generation

### Phase 3: Update UI Integration

- [ ] Modify meal plan generation request to include user's selected health goal
- [ ] Add health goal context to meal plan UI (show which goal the plan was created for)
- [ ] Ensure health goal is passed from meal planner components

### Phase 4: AI Recipe Enhancement

- [ ] Update AI recipe generation prompts to consider health goals
- [ ] Apply calorie targets, protein multipliers, and dietary restrictions
- [ ] Tag generated recipes with health goal information

### Phase 5: UI Feedback

- [ ] Show health goal information in meal plan display
- [ ] Add visual indicators when recipes align with health goals
- [ ] Display nutritional alignment with selected health goal

## Expected Outcomes

1. Meal plans will be personalized based on user's health objectives
2. Generated recipes will respect calorie targets and dietary restrictions
3. Better integration between AI nutritionist and meal planning features
4. More relevant and useful meal suggestions for users

## Technical Approach

- Keep changes simple and focused
- Reuse existing health goal structure from AI nutritionist
- Minimal UI changes - focus on functionality
- Ensure backward compatibility for existing meal plans

## Files to Modify

- `/pages/api/meal-plans/generate.ts` - Add health goal parameter
- `/pages/dashboard/meal-plans.tsx` - Pass health goal in generation request
- `/components/MealPlanner.tsx` - Display health goal context
- Potentially create shared health goal context/hook

## Review

### ✅ Implementation Complete

All phases of the health goals integration have been successfully implemented:

#### Phase 1: Health Goal Storage ✅

- **Created** `lib/health-goals.ts` - Shared health goal definitions and utilities
- **Created** `lib/contexts/HealthGoalContext.tsx` - React context for global health goal state
- **Updated** `pages/_app.tsx` - Added HealthGoalProvider to app context
- **Updated** `components/AInutritionist.tsx` - Converted to use shared health goal system

#### Phase 2: Meal Plan Generation API ✅

- **Updated** `pages/api/meal-plans/generate.ts`:
  - Added HealthGoal import and interface parameter
  - Enhanced recipe generation with health goal parameters (calories, protein focus, dietary restrictions)
  - Added health goal logging and recipe tagging
  - Applied calorie targets based on health goal (Weight Loss: 600cal/meal, Muscle Gain: 800cal/meal, etc.)

#### Phase 3: UI Integration ✅

- **Updated** `pages/dashboard/meal-plans.tsx`:
  - Added useHealthGoal hook
  - Enhanced meal plan generation request to include selectedGoal
  - Added health goal logging for debugging

#### Phase 4: AI Recipe Enhancement ✅

- **Updated** `lib/ai/promptEngineering.ts`:
  - Enhanced buildPreferencesSection with health goal parameters
  - Added specific prompts for protein focus, low sodium, heart health
  - Integrated target calorie requirements into AI generation

#### Phase 5: UI Feedback ✅

- **Updated** `pages/dashboard/meal-plans.tsx` - Added health goal indicator to Quick View header
- **Updated** `components/MealPlanner.tsx`:
  - Added selectedHealthGoal prop and interface
  - Added health goal indicator to Full Planner header
  - Added health goal to print layouts for both views

### Key Features Delivered

1. **Personalized Meal Plans**: AI now generates recipes based on user's specific health goals
2. **Calorie Targeting**: Automatic calorie targets per meal (Weight Loss: ~600cal, Muscle Gain: ~800cal, etc.)
3. **Dietary Compliance**: Heart health gets low-sodium, omega-3 rich recipes automatically
4. **Visual Indicators**: Health goal badges throughout the UI showing which goal is active
5. **Persistent Preferences**: Health goal selection persists across sessions via localStorage
6. **AI Integration**: Enhanced AI prompts include health goal context for better recipe generation

### Technical Approach

- Maintained simplicity with minimal, focused changes
- Reused existing health goal structure from AI nutritionist
- Backward compatible - no breaking changes to existing functionality
- Clean separation of concerns with shared utilities and context

### Files Modified

- `lib/health-goals.ts` (new)
- `lib/contexts/HealthGoalContext.tsx` (new)
- `pages/_app.tsx`
- `components/AInutritionist.tsx`
- `pages/api/meal-plans/generate.ts`
- `pages/dashboard/meal-plans.tsx`
- `lib/ai/promptEngineering.ts`
- `components/MealPlanner.tsx`

### Next Steps

The health goals integration is now fully functional and ready for user testing. Users can:

1. Select a health goal in the AI nutritionist
2. Generate meal plans that automatically respect that health goal
3. See visual confirmation of which health goal is being used
4. Get recipes with appropriate calories and dietary restrictions

The system now provides truly personalized meal planning based on user health objectives.
