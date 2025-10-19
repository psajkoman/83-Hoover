# Contributing to 83 Hoover Faction Hub

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Code of Conduct

- Be respectful and professional
- Focus on constructive feedback
- Help maintain a positive community
- Follow faction leadership decisions

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Create a new branch for your feature
4. Make your changes
5. Test thoroughly
6. Submit a pull request

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `style/` - UI/styling changes

### 2. Make Changes

- Write clean, readable code
- Follow existing code style
- Add comments for complex logic
- Update documentation if needed

### 3. Test Your Changes

```bash
# Run the dev server
npm run dev

# Check for TypeScript errors
npm run build

# Run linting
npm run lint
```

### 4. Commit Your Changes

Use clear, descriptive commit messages:

```bash
git add .
git commit -m "feat: add user profile page"
# or
git commit -m "fix: resolve Discord OAuth redirect issue"
```

Commit message format:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Formatting, styling
- `refactor:` - Code restructuring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub with:
- Clear title and description
- Screenshots (if UI changes)
- Testing steps
- Related issues (if any)

## Code Style Guidelines

### TypeScript/JavaScript

```typescript
// ✅ Good
export default function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null)
  
  useEffect(() => {
    loadUser()
  }, [userId])
  
  return <div>{user?.username}</div>
}

// ❌ Bad
export default function UserProfile(props: any) {
  const [user, setUser] = useState(null)
  return <div>{user?.username}</div>
}
```

### Component Structure

```typescript
// 1. Imports
import { useState } from 'react'
import { useRouter } from 'next/navigation'

// 2. Types/Interfaces
interface Props {
  title: string
}

// 3. Component
export default function Component({ title }: Props) {
  // 4. Hooks
  const router = useRouter()
  const [state, setState] = useState('')
  
  // 5. Functions
  const handleClick = () => {
    // ...
  }
  
  // 6. Effects
  useEffect(() => {
    // ...
  }, [])
  
  // 7. Render
  return <div>{title}</div>
}
```

### CSS/Tailwind

- Use Tailwind utility classes
- Keep custom CSS minimal
- Use gang-themed color variables
- Ensure mobile responsiveness

```tsx
// ✅ Good
<div className="flex items-center gap-3 p-4 bg-gang-secondary rounded-lg">

// ❌ Bad
<div style={{ display: 'flex', padding: '16px' }}>
```

## Feature Requests

Before implementing a new feature:

1. Check existing issues/PRs
2. Discuss with faction leadership
3. Create an issue describing the feature
4. Wait for approval before starting work

## Bug Reports

When reporting bugs, include:

- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Screenshots/videos if applicable
- Browser/device information
- Console errors (if any)

## Pull Request Guidelines

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Changes are tested locally
- [ ] No console errors or warnings
- [ ] Documentation updated (if needed)
- [ ] Commit messages are clear
- [ ] PR description is detailed

### PR Review Process

1. Submit PR
2. Automated checks run
3. Code review by maintainers
4. Address feedback
5. Approval and merge

## Areas for Contribution

### High Priority
- Bug fixes
- Performance improvements
- Mobile optimization
- Accessibility improvements

### Medium Priority
- New features (approved)
- UI enhancements
- Documentation improvements

### Low Priority
- Code refactoring
- Test coverage
- Developer tooling

## Project Structure

```
83-hoover/
├── app/              # Next.js pages and API routes
├── components/       # React components
│   ├── feed/        # Feed-related components
│   ├── turf/        # Turf map components
│   ├── layout/      # Layout components
│   └── ui/          # Reusable UI components
├── lib/             # Utility functions and configs
├── prisma/          # Database schema
├── public/          # Static assets
└── types/           # TypeScript type definitions
```

## Database Changes

If your changes require database modifications:

1. Update `prisma/schema.prisma`
2. Generate migration:
   ```bash
   npx prisma migrate dev --name your_migration_name
   ```
3. Test migration locally
4. Document changes in PR

## API Changes

When modifying API routes:

1. Maintain backward compatibility
2. Update API documentation
3. Test all endpoints
4. Handle errors properly
5. Add proper authentication checks

## Testing

Currently, the project doesn't have automated tests. Contributions to add testing are welcome!

### Manual Testing Checklist

- [ ] Feature works as expected
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Works in different browsers
- [ ] Handles edge cases
- [ ] Error states work correctly

## Documentation

Good documentation helps everyone:

- Update README.md for major changes
- Add JSDoc comments for complex functions
- Update SETUP_GUIDE.md if setup changes
- Create/update guides as needed

## Questions?

- Ask in Discord (faction tech channel)
- Open a GitHub discussion
- Contact project maintainers

## Recognition

Contributors will be:
- Listed in project credits
- Recognized in Discord
- Given appropriate roles/permissions

---

**Thank you for contributing to the 83 Hoover Faction Hub!** 🎮
