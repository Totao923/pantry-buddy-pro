# Contributing to Pantry Buddy Pro 🍳

Thank you for your interest in contributing to Pantry Buddy Pro! We welcome contributions from developers of all skill levels.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Development Setup

1. Fork and clone the repository

```bash
git clone https://github.com/your-username/pantry-buddy-pro.git
cd pantry-buddy-pro
```

2. Install dependencies

```bash
npm install
```

3. Set up environment variables

```bash
cp .env.example .env.local
# Add your API keys to .env.local
```

4. Start the development server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your changes.

## 🛠️ Development Guidelines

### Code Style

- Use TypeScript for all new code
- Follow React best practices and hooks patterns
- Use Tailwind CSS for styling
- Keep components small and focused
- Write descriptive commit messages

### File Structure

```
├── components/         # Reusable React components
├── pages/             # Next.js pages and API routes
├── lib/               # Utility functions and services
├── hooks/             # Custom React hooks
├── types/             # TypeScript type definitions
├── styles/            # Global styles and CSS
└── public/            # Static assets
```

### Code Quality

- Run linting: `npm run lint`
- Run type checking: `npm run type-check`
- Run tests: `npm run test`
- Format code: `npm run format`

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

- Write unit tests for utility functions
- Create integration tests for user flows
- Test components with React Testing Library
- Mock external APIs and services

## 📝 Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```
feat(recipes): add recipe collections feature
fix(auth): resolve login redirect issue
docs(readme): update installation instructions
```

## 🔄 Pull Request Process

1. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, tested code
   - Follow the style guidelines
   - Update documentation if needed

3. **Test your changes**

   ```bash
   npm run test
   npm run lint
   npm run build
   ```

4. **Commit and push**

   ```bash
   git add .
   git commit -m "feat: add your feature description"
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request**
   - Use a clear, descriptive title
   - Explain what your PR does and why
   - Link to relevant issues
   - Include screenshots for UI changes

### PR Requirements

- [ ] All tests pass
- [ ] Code follows style guidelines
- [ ] Documentation is updated
- [ ] No merge conflicts
- [ ] Reviewed and approved

## 🐛 Bug Reports

When reporting bugs, please include:

- **Clear description** of the issue
- **Steps to reproduce** the bug
- **Expected behavior** vs actual behavior
- **Screenshots** if applicable
- **Environment details** (OS, browser, version)
- **Console errors** if any

Use our [bug report template](.github/ISSUE_TEMPLATE/bug_report.md).

## 💡 Feature Requests

For new features:

- **Clear description** of the feature
- **Use case** and problem it solves
- **Proposed solution** or implementation
- **Alternatives considered**
- **Additional context** or mockups

Use our [feature request template](.github/ISSUE_TEMPLATE/feature_request.md).

## 🏗️ Architecture Overview

### Key Technologies

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **AI Integration**: Anthropic Claude API
- **Authentication**: Supabase Auth
- **Database**: Supabase PostgreSQL
- **State Management**: React hooks + Context

### Core Components

- **AI Service Layer**: Handles recipe generation with fallbacks
- **Authentication System**: User management and security
- **Recipe Engine**: Both AI and fallback recipe generation
- **Pantry Management**: Inventory tracking and management
- **Migration System**: localStorage to Supabase data migration

## 🔧 Development Tips

### Working with AI Features

- Test with both AI enabled and disabled
- Implement proper fallbacks for API failures
- Consider rate limiting and cost implications
- Use mock data for development when possible

### Database Changes

- Test migrations thoroughly
- Consider backward compatibility
- Document schema changes
- Test with various data scenarios

### UI/UX Guidelines

- Follow the existing design system
- Ensure mobile responsiveness
- Test with various screen sizes
- Consider accessibility (a11y)

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Anthropic API Documentation](https://docs.anthropic.com)

## 🤝 Community

- Join our [Discord](https://discord.gg/pantry-buddy) for discussions
- Follow us on [Twitter](https://twitter.com/pantrybucuddy) for updates
- Check out our [roadmap](https://github.com/pantry-buddy/pantry-buddy-pro/projects/1)

## 📄 License

By contributing to Pantry Buddy Pro, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

Thank you for contributing to Pantry Buddy Pro! 🙏
