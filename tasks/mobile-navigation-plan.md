# Mobile Navigation Improvement Plan

## Problem

Mobile navigation needs improvement, especially for unsigned users where content gets cut off. The different tabs should turn into a hamburger menu on mobile devices.

## Current Status

- ❌ Mobile navigation for unsigned users gets cut off
- ❌ No hamburger menu for mobile navigation
- ❌ Tabs don't collapse on mobile properly

## Analysis Complete

### Current Issues Found:

- **AppHeader.tsx** has too many navigation buttons (6+ items) in the right section
- On mobile, text gets abbreviated ("In" instead of "Sign In", "Up" instead of "Sign Up")
- Stats section hidden on medium screens but buttons still cramped
- No hamburger menu - everything tries to fit in header horizontally

### Current Navigation Items:

1. Stats section (ingredients/recipes/AI status) - hidden on mobile
2. Dashboard/Ingredients button
3. Inventory button
4. Upgrade/Premium button
5. Sign In button (unsigned users)
6. Sign Up button (unsigned users)
7. User menu (signed users)

## Plan

### 1. ✅ Research current navigation structure - COMPLETED

- Found AppHeader component with mobile navigation issues
- Identified cramped right-side navigation with 4-6 buttons
- Text gets abbreviated on mobile ("In"/"Up")

### 2. Design mobile-friendly navigation

- Create hamburger menu for mobile
- Ensure all navigation items fit properly on mobile screens
- Make sure signed-out users can access all necessary navigation

### 3. Implement hamburger menu

- Add mobile menu toggle state
- Create slide-out or dropdown menu for mobile
- Ensure proper responsive behavior

### 4. Test mobile functionality

- Test on different mobile screen sizes
- Verify no content gets cut off
- Ensure hamburger menu works properly

## Files to investigate:

- `components/layout/AppHeader.tsx` - Main header for unsigned users
- `pages/index.tsx` - Main landing page
- Any other navigation components

## Safety measures:

- Don't break existing desktop navigation
- Ensure mobile navigation is accessible
- Test thoroughly before committing
