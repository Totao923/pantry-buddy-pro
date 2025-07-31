# GitHub Repository Setup Guide

## Quick Setup

Since GitHub CLI is not installed, follow these steps to create the repository:

### 1. Create Repository on GitHub.com

1. Go to [github.com/new](https://github.com/new)
2. Repository name: `pantry-buddy-pro`
3. Description: `🧑‍🍳 AI-powered recipe generation app that transforms your pantry ingredients into gourmet meals`
4. Set to **Public** (for open source)
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

### 2. Connect Local Repository

After creating the repository, run these commands:

```bash
git remote add origin https://github.com/YOUR_USERNAME/pantry-buddy-pro.git
git branch -M main
git push -u origin main
```

### 3. Configure Repository Settings

After pushing, go to your repository settings:

#### Repository Settings

- **Settings** → **General**
  - Allow merge commits: ✅
  - Allow squash merging: ✅
  - Allow rebase merging: ✅
  - Automatically delete head branches: ✅

#### Branch Protection

- **Settings** → **Branches** → **Add rule**
  - Branch name pattern: `main`
  - Require pull request reviews before merging: ✅
  - Require status checks: ✅
  - Require branches to be up to date: ✅
  - Include administrators: ✅

#### Pages (Optional)

- **Settings** → **Pages**
  - Source: Deploy from a branch
  - Branch: `main` / `docs` folder (if you want documentation site)

#### Topics

Add these topics in **Settings** → **General**:

- `nextjs`
- `react`
- `typescript`
- `ai`
- `recipe-generator`
- `pantry-management`
- `cooking`
- `food`
- `supabase`
- `anthropic`

## Alternative: Using GitHub CLI

If you want to install GitHub CLI:

```bash
# Install GitHub CLI (macOS)
brew install gh

# Authenticate
gh auth login

# Create repository
gh repo create pantry-buddy-pro --public --description "🧑‍🍳 AI-powered recipe generation app that transforms your pantry ingredients into gourmet meals"

# Push code
git remote add origin https://github.com/YOUR_USERNAME/pantry-buddy-pro.git
git push -u origin main
```

## Repository Features to Enable

### Issue Templates

- ✅ Already created in `.github/ISSUE_TEMPLATE/`
- Bug reports and feature requests ready

### Pull Request Template

Create `.github/pull_request_template.md`:

```markdown
## Summary

Brief description of changes

## Changes Made

- [ ] List key changes

## Testing

- [ ] Tested locally
- [ ] All tests pass
- [ ] No console errors

## Screenshots (if applicable)

Add screenshots of UI changes

## Checklist

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
```

### GitHub Actions (Future)

- Automated testing
- Deployment to Vercel
- Code quality checks
- Dependency updates

Once the repository is created and pushed, we can continue with documentation and additional features!
