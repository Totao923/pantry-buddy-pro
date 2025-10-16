# Future Features - Post Launch

This document tracks feature ideas to implement after the initial app launch.

---

## 🎯 PLANNED: Occasion & Meal Type Filters

### Feature Description

Add occasion-based and meal-type filters to recipe generation to help users create meals for specific scenarios and desserts.

### Use Cases

- **Date Night**: Romantic 3-course meal suggestions
- **Family Dinner**: Kid-friendly, crowd-pleasing meals
- **Party/Entertaining**: Appetizers, finger foods, party platters
- **Quick Lunch**: Fast, simple midday meals
- **Meal Prep**: Batch cooking, make-ahead meals
- **Baking**: Desserts, breads, pastries
- **Breakfast/Brunch**: Morning meals and brunch items
- **Special Occasions**: Holiday meals, celebrations

### Implementation Plan (Simple, following CLAUDE.md)

#### Phase 1: Add Occasion Filter to UI

**Files to Modify:**

1. `types/index.ts` - Add new types
2. `components/AdvancedCuisineSelector.tsx` - Add occasion selector UI
3. `pages/dashboard/create-recipe.tsx` - Pass occasion to API
4. `lib/validation/schemas.ts` - Add occasion validation

**New Types:**

```typescript
// In types/index.ts
export type OccasionType =
  | 'any'
  | 'date-night'
  | 'family-dinner'
  | 'party'
  | 'quick-lunch'
  | 'meal-prep'
  | 'baking'
  | 'breakfast-brunch'
  | 'special-occasion';

export type MealCourseType =
  | 'any'
  | 'appetizer'
  | 'main-course'
  | 'side-dish'
  | 'dessert'
  | 'soup-salad';
```

**UI Changes:**

```typescript
// In AdvancedCuisineSelector.tsx - Add new section in preferences panel
<div>
  <label>Occasion</label>
  <select value={preferences.occasion} onChange={...}>
    <option value="any">Any Occasion</option>
    <option value="date-night">🍷 Date Night (3-Course)</option>
    <option value="family-dinner">👨‍👩‍👧‍👦 Family Dinner</option>
    <option value="party">🎉 Party/Entertaining</option>
    <option value="quick-lunch">⚡ Quick Lunch</option>
    <option value="meal-prep">📦 Meal Prep</option>
    <option value="baking">🧁 Baking/Desserts</option>
    <option value="breakfast-brunch">🥞 Breakfast/Brunch</option>
    <option value="special-occasion">🎊 Special Occasion</option>
  </select>
</div>

<div>
  <label>Meal Course</label>
  <select value={preferences.course} onChange={...}>
    <option value="any">Any Course</option>
    <option value="appetizer">🥗 Appetizer</option>
    <option value="main-course">🍽️ Main Course</option>
    <option value="side-dish">🥘 Side Dish</option>
    <option value="dessert">🍰 Dessert</option>
    <option value="soup-salad">🥣 Soup/Salad</option>
  </select>
</div>
```

#### Phase 2: Update API & Validation

**Validation Schema:**

```typescript
// In lib/validation/schemas.ts
export const GenerateRecipeSchema = z.object({
  // ... existing fields
  occasion: z
    .enum([
      'any',
      'date-night',
      'family-dinner',
      'party',
      'quick-lunch',
      'meal-prep',
      'baking',
      'breakfast-brunch',
      'special-occasion',
    ])
    .optional(),
  mealCourse: z
    .enum(['any', 'appetizer', 'main-course', 'side-dish', 'dessert', 'soup-salad'])
    .optional(),
});
```

**API Updates:**

```typescript
// In pages/api/recipes/generate.ts
// Pass occasion and mealCourse to AI service
const result = await aiService.generateRecipe({
  ingredients,
  cuisine,
  servings,
  preferences,
  occasion, // NEW
  mealCourse, // NEW
});
```

#### Phase 3: Update AI Prompts

**AI Service Changes:**

```typescript
// In lib/ai/aiService.ts
// Enhance prompt with occasion context
let prompt = `Generate a ${cuisine} recipe...`;

if (occasion === 'date-night') {
  prompt += `\nThis is for a romantic date night. Make it impressive and elegant.
  Consider suggesting a 3-course meal (appetizer, main, dessert).`;
} else if (occasion === 'baking') {
  prompt += `\nFocus on baking recipes: desserts, breads, pastries, or baked goods.
  Include baking temperatures and times.`;
} else if (occasion === 'party') {
  prompt += `\nPerfect for entertaining. Make it easy to serve to a group.
  Consider finger foods or dishes that can be made ahead.`;
}

if (mealCourse === 'dessert') {
  prompt += `\nFocus on dessert/sweet treats only.`;
}
```

### Database Changes

**None required!** These are just additional filters passed to the AI - no schema changes needed.

### Testing Checklist

- [ ] Occasion dropdown appears in preferences panel
- [ ] Course dropdown appears in preferences panel
- [ ] Date night generates elegant 3-course suggestions
- [ ] Baking/dessert filters return sweet recipes
- [ ] Party/entertaining suggests shareable dishes
- [ ] Validation accepts new fields
- [ ] API passes fields to AI service
- [ ] AI prompts incorporate occasion context

### Priority

**Medium** - Nice to have, but not critical for launch

### Estimated Effort

- UI Changes: 2-3 hours
- Validation & API: 1 hour
- AI Prompt Engineering: 2-3 hours
- Testing: 1-2 hours
  **Total: ~6-9 hours**

### Dependencies

- None - can be added independently

### User Benefit

- **Date nights**: Get romantic 3-course meal ideas
- **Bakers**: Focus on desserts and baked goods
- **Busy parents**: Quick lunch and family-friendly options
- **Entertainers**: Party-ready appetizers and shareable dishes
- **Meal preppers**: Batch cooking suggestions

---

## 📋 Other Future Feature Ideas

### ✅ Already Implemented (Premium Features)

These features already exist in the app:

- **✅ Multi-Recipe Meal Planning** - `pages/dashboard/meal-plans.tsx` + `MealPlanner.tsx`
- **✅ Recipe Collections/Cookbooks** - `pages/dashboard/recipe-books.tsx` + `RecipeBookManager.tsx`
- **✅ Shopping List Generation** - `pages/dashboard/family-shopping.tsx` + Family shopping lists
- **✅ Recipe Scaling** - Servings adjustment in recipe generation
- **✅ Ingredient Substitutions** - AI prompt engineering includes substitutions
- **✅ Recipe Reviews/Ratings** - `RecipeRatingSystem.tsx` + `databaseRatingsService.ts`
- **✅ Recipe History Export** - `RecipeBookPDFExporter.tsx` + cooking history tracking
- **✅ Nutritional Analysis** - `pages/dashboard/nutrition.tsx` + AI Nutritionist

### 🔮 True Future Features (Not Yet Built)

### Social Sharing

Share recipes with friends, create collaborative cookbooks outside family plan.

### Voice Input

"Hey Pantry Buddy, what can I make with chicken and rice?"

### Advanced Nutritional Goals

More granular filtering by calories, macros, specific dietary needs beyond current AI nutritionist.

---

**Note:** All features should follow CLAUDE.md principles:

1. Think through the problem
2. Write a plan with checkboxes
3. Get user verification before starting
4. Make simple, minimal changes
5. Track progress in tasks/todo.md
6. Add review section when complete
