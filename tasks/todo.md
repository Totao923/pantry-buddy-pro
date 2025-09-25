# Remove Dark Mode Implementation - Simple Plan

## Problem

User wants to remove the poorly implemented dark mode feature from the settings page.

## Current Status

- ❌ Dark mode toggle exists in settings but is poorly implemented
- ❌ Dark mode configuration in tailwind.config.js needs to be removed
- ❌ All dark mode related code needs to be cleaned up

## Plan

### 1. Remove dark mode from settings interface

- Remove `darkMode: boolean` from FormData interface
- Remove darkMode from initial state
- Remove dark mode useEffect and toggleDarkMode function
- Remove dark mode toggle UI from settings page

### 2. Remove dark mode from tailwind.config.js

- Remove `darkMode: 'class'` configuration

### 3. Test settings page functionality

- Verify settings page loads without errors
- Ensure no dark mode references remain

## Files to modify:

- `pages/dashboard/settings.tsx` - Remove all dark mode code
- `tailwind.config.js` - Remove dark mode configuration

## Safety measures:

- Keep all other settings functionality intact
- Test thoroughly before committing

## Todo List

- [ ] Remove darkMode from FormData interface in settings.tsx
- [ ] Remove darkMode from initial state
- [ ] Remove dark mode useEffect and toggleDarkMode function
- [ ] Remove dark mode toggle UI from settings page
- [ ] Remove darkMode config from tailwind.config.js
- [ ] Test settings page loads properly
- [ ] Commit changes
