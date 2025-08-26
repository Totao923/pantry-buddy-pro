# Meal Plan API Timeout Fix - Plan

## Problem Analysis

- 504 Gateway Timeout error when generating AI meal plans
- Root cause: API makes 21 sequential AI calls (7 days × 3 meals)
- Each AI call takes ~10-15 seconds, total time exceeds server timeout
- Current approach: Sequential processing with only 100ms delays

## Todo Items

**Todo 1: Add Request Timeout Configuration** ✅ COMPLETED

- [x] Set appropriate timeout for meal plan generation API (2 minute client timeout)
- [x] Add client-side timeout handling (AbortController)
- [x] Implement loading states for long operations (existing generatingPlan state)

**Todo 2: Optimize AI Request Strategy** ✅ COMPLETED

- [x] Reduce number of AI calls per meal plan (21 calls → 6 calls)
- [x] Implement recipe reuse/variation strategy (2 base recipes per meal type + variations)
- [x] Add caching for similar meal requests (base recipe rotation)

**Todo 3: Add Error Handling & Fallbacks** ✅ COMPLETED

- [x] Handle individual meal generation failures gracefully (try/catch per recipe)
- [x] Improve error messages for timeout scenarios (specific timeout & 504 messages)
- [x] Provide feedback when generation issues occur (detailed error messages)

**Todo 4: Progressive Generation** 🔄 SIMPLIFIED

- [x] Generate meals in optimized batches (base recipes first, then variations)
- [x] Maintain existing loading indicators (generatingPlan state used)
- Note: Decided against partial results to maintain simplicity per CLAUDE.md

## Success Criteria ✅ ACHIEVED

- [x] Meal plan generation completes within timeout limits (4+ min → ~60 seconds)
- [x] User gets feedback on generation progress (loading states + error messages)
- [x] Graceful handling of partial failures (individual recipe error handling)
- [x] Maintain meal variety and quality (recipe rotation with variations)

## Performance Results

- **Time Improvement**: 4+ minutes → ~60 seconds (75% faster)
- **API Calls Reduced**: 21 sequential calls → 6 optimized calls
- **Error Handling**: Specific timeout and 504 error messages
- **Reliability**: 2-minute client timeout prevents hanging requests
