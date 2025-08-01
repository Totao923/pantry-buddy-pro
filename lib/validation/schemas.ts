import { z } from 'zod';

// Install zod: npm install zod

// Common validation patterns
const INGREDIENT_NAME_REGEX = /^[a-zA-Z0-9\s\-'.,()]+$/;
const RECIPE_TITLE_REGEX = /^[a-zA-Z0-9\s\-'.,()!?]+$/;

// Recipe generation validation schema
export const GenerateRecipeSchema = z.object({
  ingredients: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1).max(100).regex(INGREDIENT_NAME_REGEX),
        category: z.enum([
          'protein',
          'vegetables',
          'fruits',
          'grains',
          'dairy',
          'spices',
          'herbs',
          'oils',
          'pantry',
          'other',
        ]),
        quantity: z.string().optional(),
        unit: z.string().optional(),
      })
    )
    .min(1, 'At least one ingredient is required')
    .max(20, 'Maximum 20 ingredients allowed'),
  cuisine: z.enum([
    'any',
    'italian',
    'asian',
    'mexican',
    'indian',
    'american',
    'mediterranean',
    'chinese',
    'french',
    'thai',
  ]),
  servings: z
    .number()
    .int()
    .min(1, 'Servings must be at least 1')
    .max(12, 'Maximum 12 servings allowed')
    .optional(),
  preferences: z
    .object({
      maxTime: z.number().int().min(5).max(480).optional(), // 5 minutes to 8 hours
      difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional(),
      dietary: z.array(z.string().max(50)).max(10).optional(),
      spiceLevel: z.enum(['mild', 'medium', 'hot', 'extra-hot']).optional(),
      experienceLevel: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
    })
    .optional(),
});

// Ingredient validation schemas
export const CreateIngredientSchema = z.object({
  name: z
    .string()
    .min(1, 'Ingredient name is required')
    .max(100, 'Ingredient name must be less than 100 characters')
    .regex(INGREDIENT_NAME_REGEX, 'Ingredient name contains invalid characters'),
  category: z.enum([
    'protein',
    'vegetables',
    'fruits',
    'grains',
    'dairy',
    'spices',
    'herbs',
    'oils',
    'pantry',
    'other',
  ]),
  quantity: z.string().max(50, 'Quantity must be less than 50 characters').optional(),
  unit: z.string().max(20, 'Unit must be less than 20 characters').optional(),
  expiryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .optional(),
  nutritionalValue: z
    .number()
    .min(0, 'Nutritional value must be positive')
    .max(10000, 'Nutritional value is too high')
    .optional(),
  isProtein: z.boolean().optional(),
  isVegetarian: z.boolean().optional(),
  isVegan: z.boolean().optional(),
});

export const UpdateIngredientSchema = CreateIngredientSchema.partial();

// Recipe preferences validation (legacy schema - use GenerateRecipeSchema above for new code)
export const RecipePreferencesSchema = z.object({
  ingredients: z
    .array(z.string().min(1).max(100))
    .min(1, 'At least one ingredient is required')
    .max(20, 'Too many ingredients (max 20)'),
  cuisine: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-zA-Z\s\-]+$/, 'Invalid cuisine type')
    .optional(),
  dietaryRestrictions: z
    .array(z.string().max(50))
    .max(10, 'Too many dietary restrictions')
    .optional(),
  servings: z
    .number()
    .min(1, 'Servings must be at least 1')
    .max(20, 'Servings cannot exceed 20')
    .optional(),
  difficulty: z.enum(['Beginner', 'Easy', 'Medium', 'Hard', 'Expert']).optional(),
  maxTime: z
    .number()
    .min(5, 'Cooking time must be at least 5 minutes')
    .max(480, 'Cooking time cannot exceed 8 hours')
    .optional(),
});

// User profile validation
export const UpdateProfileSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s\-'.,]+$/, 'Name contains invalid characters')
    .optional(),
  dietary_restrictions: z
    .array(z.string().max(50))
    .max(20, 'Too many dietary restrictions')
    .optional(),
  favorite_cuisines: z.array(z.string().max(50)).max(20, 'Too many favorite cuisines').optional(),
  allergies: z.array(z.string().max(50)).max(20, 'Too many allergies').optional(),
});

// Database ID validation
export const DatabaseIdSchema = z.string().uuid('Invalid ID format');

// Pagination validation
export const PaginationSchema = z.object({
  page: z
    .number()
    .min(1, 'Page must be at least 1')
    .max(1000, 'Page cannot exceed 1000')
    .optional()
    .default(1),
  limit: z
    .number()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .optional()
    .default(10),
});

// Search validation
export const SearchSchema = z.object({
  query: z
    .string()
    .min(1, 'Search query is required')
    .max(200, 'Search query is too long')
    .regex(/^[a-zA-Z0-9\s\-'.,()]+$/, 'Search query contains invalid characters'),
  category: z
    .enum([
      'all',
      'protein',
      'vegetables',
      'fruits',
      'grains',
      'dairy',
      'spices',
      'herbs',
      'oils',
      'pantry',
      'other',
    ])
    .optional()
    .default('all'),
});

// Validation helper functions
export function validateAndSanitize<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errorMessage = result.error.issues
      .map(issue => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');

    throw new Error(`Validation failed: ${errorMessage}`);
  }

  return result.data;
}

export function createValidationError(issues: z.ZodIssue[]) {
  return {
    error: 'Validation failed',
    code: 'VALIDATION_ERROR',
    details: issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    })),
  };
}
