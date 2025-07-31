# 🛠️ Development Guide

A comprehensive guide for developers working on Pantry Buddy Pro.

## 🚀 Quick Development Setup

```bash
# Clone and install
git clone https://github.com/YOUR_USERNAME/pantry-buddy-pro.git
cd pantry-buddy-pro
npm install

# Environment setup
cp .env.example .env.local
# Edit .env.local with your API keys

# Start development
npm run dev
```

## 📋 Available Scripts

| Script                 | Description               | Usage        |
| ---------------------- | ------------------------- | ------------ |
| `npm run dev`          | Start development server  | Development  |
| `npm run build`        | Build for production      | Production   |
| `npm run start`        | Start production server   | Production   |
| `npm run lint`         | Run ESLint                | Code quality |
| `npm run lint:fix`     | Fix ESLint issues         | Code quality |
| `npm run format`       | Format with Prettier      | Code style   |
| `npm run format:check` | Check Prettier formatting | Code style   |
| `npm run type-check`   | TypeScript type checking  | Type safety  |

## 🏗️ Project Architecture

### 📁 Directory Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Basic UI components
│   ├── forms/          # Form components
│   ├── layout/         # Layout components
│   ├── auth/           # Authentication components
│   └── migration/      # Data migration components
├── lib/                # Business logic & utilities
│   ├── ai/            # AI service layer
│   ├── auth/          # Authentication logic
│   ├── supabase/      # Database layer
│   ├── config/        # Configuration
│   └── utils/         # Utility functions
├── pages/             # Next.js pages & API routes
├── types/             # TypeScript type definitions
├── hooks/             # Custom React hooks
├── styles/            # Global styles
└── public/            # Static assets
```

### 🧩 Component Architecture

```
📦 Component Structure
├── 🎯 Core Components        # Essential app functionality
│   ├── SmartPantry           # Ingredient management
│   ├── RecipeGenerator       # AI recipe creation
│   ├── RecipeCard           # Recipe display
│   └── PantryInventory      # Advanced inventory
├── 🎨 UI Components          # Reusable interface elements
│   ├── Button, Input        # Form elements
│   ├── Modal, Card          # Layout elements
│   └── Loading, Error       # State components
├── 🔐 Auth Components        # Authentication
│   ├── LoginForm            # User login
│   ├── SignupForm           # User registration
│   └── UserMenu             # Account management
└── 🎛️ Layout Components      # Page structure
    ├── Header, Footer       # Navigation
    ├── Sidebar              # Side navigation
    └── Layout               # Page wrapper
```

## 🤖 AI Integration Development

### Setting Up AI Development

1. **Get API Keys**

   ```bash
   # Anthropic Claude API
   # Sign up at: https://console.anthropic.com
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```

2. **Test AI Integration**

   ```bash
   # Start dev server with AI enabled
   ENABLE_AI_RECIPES=true npm run dev
   ```

3. **Development Tips**
   - Use fallback mode during development
   - Monitor API usage to avoid costs
   - Test both AI and fallback scenarios

### AI Service Architecture

```typescript
// lib/ai/aiService.ts
export class AIService {
  async generateRecipe(params: RecipeParams): Promise<Recipe> {
    try {
      // Primary AI generation
      return await this.anthropicProvider.generate(params);
    } catch (error) {
      // Fallback to mock engine
      return this.fallbackEngine.generate(params);
    }
  }
}
```

## 🗄️ Database Development

### Current State: localStorage

- All data stored locally in browser
- No backend required for development
- Easy to test and develop

### Future: Supabase Integration

- See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for details
- Database migrations planned
- Authentication integration

## 🎨 UI/UX Development

### Design System

```scss
// Tailwind CSS Configuration
colors: {
  primary: '#3B82F6',      // Blue
  secondary: '#8B5CF6',    // Purple
  accent: '#F59E0B',       // Amber
  success: '#10B981',      // Emerald
  warning: '#F59E0B',      // Amber
  error: '#EF4444',        // Red
}
```

### Component Development Guidelines

1. **Use TypeScript**: All components must be TypeScript
2. **Props Interface**: Define clear prop interfaces
3. **Responsive Design**: Mobile-first approach
4. **Accessibility**: Include ARIA labels and keyboard navigation
5. **Performance**: Use React.memo for expensive components

### Example Component Structure

```typescript
// components/ui/Button.tsx
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'outline';
  size: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  disabled = false
}) => {
  return (
    <button
      className={cn(
        'font-medium rounded-lg transition-colors',
        variants[variant],
        sizes[size],
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};
```

## 🧪 Testing Strategy

### Testing Setup (Future)

```bash
# Install testing dependencies
npm install --save-dev jest @testing-library/react @testing-library/jest-dom

# Run tests
npm run test
npm run test:watch
npm run test:coverage
```

### Testing Guidelines

1. **Unit Tests**: Test individual functions and components
2. **Integration Tests**: Test component interactions
3. **E2E Tests**: Test complete user workflows
4. **AI Testing**: Mock AI responses for consistent testing

## 🔧 Development Tools

### Code Quality

- **ESLint**: JavaScript/TypeScript linting
- **Prettier**: Code formatting
- **Husky**: Git hooks
- **lint-staged**: Pre-commit formatting

### Development Environment

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

### Recommended VS Code Extensions

- **ES7+ React/Redux/React-Native snippets**
- **Prettier - Code formatter**
- **ESLint**
- **Tailwind CSS IntelliSense**
- **TypeScript Importer**
- **Auto Rename Tag**

## 🚀 Deployment

### Development Deployment

```bash
# Build and test locally
npm run build
npm run start
```

### Production Deployment (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Environment Variables for Production

```env
# Production environment
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com

# API keys
ANTHROPIC_API_KEY=your-production-key

# Analytics
NEXT_PUBLIC_ANALYTICS_ID=your-analytics-id
```

## 🐛 Debugging

### Common Issues

1. **AI API Errors**

   ```bash
   # Enable debug logging
   DEBUG=ai:* npm run dev
   ```

2. **TypeScript Errors**

   ```bash
   # Check types
   npm run type-check
   ```

3. **Build Issues**
   ```bash
   # Clean and rebuild
   rm -rf .next
   npm run build
   ```

### Debug Configuration

```json
// .vscode/launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Next.js",
  "program": "${workspaceFolder}/node_modules/.bin/next",
  "args": ["dev"],
  "console": "integratedTerminal",
  "serverReadyAction": {
    "pattern": "started server on .*, url: (https?://.+)",
    "uriFormat": "%s",
    "action": "debugWithChrome"
  }
}
```

## 📈 Performance

### Optimization Guidelines

1. **Bundle Analysis**

   ```bash
   npm run analyze
   ```

2. **Image Optimization**
   - Use Next.js Image component
   - Optimize images before upload
   - Use WebP format when possible

3. **Code Splitting**
   - Use dynamic imports for large components
   - Lazy load non-critical components

4. **Caching Strategy**
   - API responses cached for 1 hour
   - Static assets cached indefinitely
   - Use SWR for data fetching

## 🔒 Security

### Security Guidelines

1. **Environment Variables**
   - Never commit secrets to git
   - Use different keys for development/production
   - Rotate keys regularly

2. **API Security**
   - Rate limiting implemented
   - Input validation on all endpoints
   - Sanitize user inputs

3. **Client Security**
   - No sensitive data in localStorage
   - XSS protection enabled
   - CSP headers configured

## 📞 Getting Help

### Resources

- **Documentation**: Check all `.md` files
- **Issues**: [GitHub Issues](https://github.com/YOUR_USERNAME/pantry-buddy-pro/issues)
- **Discussions**: [GitHub Discussions](https://github.com/YOUR_USERNAME/pantry-buddy-pro/discussions)

### Contributing

1. Read [CONTRIBUTING.md](./CONTRIBUTING.md)
2. Check [open issues](https://github.com/YOUR_USERNAME/pantry-buddy-pro/issues)
3. Create a feature branch
4. Make your changes
5. Add tests
6. Submit a pull request

---

**Happy Coding! 🎉**
