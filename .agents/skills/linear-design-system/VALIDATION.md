# Linear Design System Validation Guide

Validation rules and checklists for ensuring components follow the design system.

## Validation Checklist

### Component Creation Checklist

When creating a new component, verify:

- [ ] **File location**: Component in `src/components/ui/{name}.tsx`
- [ ] **TypeScript**: Proper interfaces and types defined
- [ ] **ForwardRef**: Component uses `React.forwardRef`
- [ ] **DisplayName**: Component has `displayName` set
- [ ] **CVA Variants**: Uses `class-variance-authority` for variants
- [ ] **Token Usage**: All design values use tokens (no hardcoded values)
- [ ] **Linear Patterns**: Includes `active:scale-[0.97]` for interactive elements
- [ ] **Transitions**: Uses `transition-fast` or `transition-base`
- [ ] **Focus States**: Proper `focus-visible` ring with accent color
- [ ] **Disabled States**: Includes `disabled:opacity-50 disabled:pointer-events-none`
- [ ] **Hover States**: Appropriate hover effects
- [ ] **Accessibility**: Semantic HTML and ARIA attributes where needed
- [ ] **Theme Support**: Works in both dark and light modes
- [ ] **Exports**: Component exported from file
- [ ] **Documentation**: Added to demo page or documentation

---

## Automated Validation

### 1. Hardcoded Value Detection

**Search for hardcoded colors**:
```bash
# Find hex colors
grep -r "bg-\[#" src/components/
grep -r "text-\[#" src/components/
grep -r "border-\[#" src/components/

# Find arbitrary values
grep -r "\[#" src/components/ui/
```

**Common violations**:
```tsx
❌ className="bg-[#1c1c1f]"
❌ className="text-[#f7f8f8]"
❌ className="p-[15px]"
❌ className="w-[300px]"
```

**Correct usage**:
```tsx
✅ className="bg-bg-secondary"
✅ className="text-text-primary"
✅ className="p-6"
✅ className="w-full max-w-xs"
```

### 2. Interaction Pattern Validation

**Check for Linear patterns**:
```bash
# Should include active:scale-[0.97] for buttons
grep -L "active:scale-\[0.97\]" src/components/ui/button.tsx

# Should include transitions
grep -L "transition-" src/components/ui/*.tsx
```

**Required patterns for interactive elements**:
```tsx
// Buttons, clickable cards, etc.
✅ className="active:scale-[0.97] transition-fast"

// Focus states
✅ className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"

// Hover states
✅ className="hover:bg-bg-tertiary hover:shadow-md"
```

### 3. Token Usage Validation

**Validate background layers**:
```typescript
// Check if backgrounds follow layering system
const bgPatterns = [
  'bg-bg-primary',    // Level 1
  'bg-bg-secondary',  // Level 2
  'bg-bg-tertiary',   // Level 3
  'bg-bg-quaternary', // Level 4
];

// ❌ Invalid: custom colors
className="bg-gray-900"
className="bg-slate-800"

// ✅ Valid: design system layers
className="bg-bg-secondary"
className="bg-bg-tertiary"
```

**Validate text colors**:
```typescript
const textPatterns = [
  'text-text-primary',
  'text-text-secondary',
  'text-text-tertiary',
];

// ❌ Invalid
className="text-gray-200"
className="text-white"

// ✅ Valid
className="text-text-primary"
className="text-text-secondary"
```

**Validate spacing**:
```typescript
// Design system spacing: 0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 16, 20
// Common values: 4 (11px), 6 (16px), 8 (24px)

// ❌ Invalid: arbitrary values
className="p-[15px]"
className="gap-[20px]"

// ✅ Valid: design system scale
className="p-6"
className="gap-4"
```

---

## Code Review Checklist

### Visual Review

Check component appearance:

- [ ] **Colors match Linear**: Backgrounds, text, accents correct
- [ ] **Typography**: Font sizes, weights, letter spacing match
- [ ] **Spacing**: Padding, margins, gaps use design system scale
- [ ] **Borders**: Radius and colors from design system
- [ ] **Shadows**: Elevation levels appropriate
- [ ] **Transitions**: Smooth and at correct speed
- [ ] **Hover states**: Visible and appropriate
- [ ] **Active states**: `scale(0.97)` transform working
- [ ] **Focus states**: Accent ring visible on keyboard focus
- [ ] **Dark mode**: Component looks good in dark theme
- [ ] **Light mode**: Component looks good in light theme

### Code Quality Review

Check implementation:

- [ ] **No magic numbers**: All values use tokens
- [ ] **Proper TypeScript**: Interfaces and types defined
- [ ] **Accessible HTML**: Semantic elements used
- [ ] **ARIA labels**: Where needed for screen readers
- [ ] **Keyboard navigation**: Tab order correct, keyboard shortcuts work
- [ ] **Error handling**: Graceful handling of edge cases
- [ ] **Performance**: No unnecessary re-renders
- [ ] **Consistent naming**: Follows project conventions

### Design System Compliance

Check adherence to system:

- [ ] **Token usage**: Only design system tokens used
- [ ] **Interaction patterns**: Linear patterns followed
- [ ] **Component structure**: Follows established patterns (cva, forwardRef, etc.)
- [ ] **File organization**: Correct location and naming
- [ ] **Documentation**: Component documented
- [ ] **Examples**: Usage examples provided

---

## Common Violations

### 1. Missing Interaction Patterns

**Violation**:
```tsx
// Missing active transform
<button className="bg-accent hover:bg-accent-hover">
  Click me
</button>
```

**Fix**:
```tsx
<button className="bg-accent hover:bg-accent-hover active:scale-[0.97] transition-fast">
  Click me
</button>
```

### 2. Hardcoded Colors

**Violation**:
```tsx
<div className="bg-[#1c1c1f] text-[#f7f8f8] border-[#2a2a2a]">
  Content
</div>
```

**Fix**:
```tsx
<div className="bg-bg-secondary text-text-primary border-border-primary">
  Content
</div>
```

### 3. Incorrect Spacing

**Violation**:
```tsx
<Card className="p-[20px] gap-[15px]">
  Content
</Card>
```

**Fix**:
```tsx
<Card className="p-6 gap-4">
  Content
</Card>
```

### 4. Missing Focus States

**Violation**:
```tsx
<input className="border border-border-primary rounded-md" />
```

**Fix**:
```tsx
<input className="border border-border-primary rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2" />
```

### 5. Inconsistent Typography

**Violation**:
```tsx
<h2 className="text-2xl font-bold">
  Heading
</h2>
```

**Fix**:
```tsx
<h2 className="text-[24px] font-medium tracking-[-0.288px]">
  Heading
</h2>
```

### 6. Missing Transitions

**Violation**:
```tsx
<div className="hover:bg-bg-tertiary">
  Hoverable
</div>
```

**Fix**:
```tsx
<div className="hover:bg-bg-tertiary transition-fast">
  Hoverable
</div>
```

### 7. Wrong Background Layering

**Violation**:
```tsx
// Using same background level for nested elements
<div className="bg-bg-secondary">
  <Card className="bg-bg-secondary">
    No depth
  </Card>
</div>
```

**Fix**:
```tsx
// Increasing background layers for depth
<div className="bg-bg-primary">
  <Card className="bg-bg-secondary">
    Proper depth
  </Card>
</div>
```

---

## Validation Scripts

### Check for Hardcoded Values

```bash
#!/bin/bash
# validate-hardcoded.sh

echo "Checking for hardcoded values..."

# Check for hex colors
echo "\n❌ Hardcoded colors:"
grep -rn "bg-\[#\|text-\[#\|border-\[#" src/components/ui/

# Check for arbitrary spacing
echo "\n❌ Arbitrary spacing:"
grep -rn "p-\[.*px\]\|m-\[.*px\]\|gap-\[.*px\]" src/components/ui/

# Check for arbitrary widths/heights
echo "\n❌ Arbitrary dimensions:"
grep -rn "w-\[.*px\]\|h-\[.*px\]" src/components/ui/

echo "\n✅ Validation complete"
```

### Check for Linear Patterns

```bash
#!/bin/bash
# validate-patterns.sh

echo "Checking for Linear interaction patterns..."

# Check buttons have active transform
echo "\n❌ Buttons missing active:scale-[0.97]:"
for file in src/components/ui/*.tsx; do
  if grep -q "button" "$file" && ! grep -q "active:scale-\[0.97\]" "$file"; then
    echo "$file"
  fi
done

# Check for transitions
echo "\n❌ Components missing transitions:"
for file in src/components/ui/*.tsx; do
  if ! grep -q "transition-" "$file"; then
    echo "$file"
  fi
done

# Check for focus states
echo "\n❌ Interactive components missing focus states:"
for file in src/components/ui/*.tsx; do
  if grep -q "button\|input\|select" "$file" && ! grep -q "focus-visible:ring" "$file"; then
    echo "$file"
  fi
done

echo "\n✅ Pattern check complete"
```

### Check Token Usage

```bash
#!/bin/bash
# validate-tokens.sh

echo "Checking design token usage..."

# Valid background tokens
bg_tokens="bg-bg-primary|bg-bg-secondary|bg-bg-tertiary|bg-bg-quaternary"

# Valid text tokens
text_tokens="text-text-primary|text-text-secondary|text-text-tertiary"

# Check for invalid background classes
echo "\n❌ Invalid background usage:"
grep -rn "bg-gray\|bg-slate\|bg-zinc" src/components/ui/

# Check for invalid text classes
echo "\n❌ Invalid text usage:"
grep -rn "text-gray\|text-slate\|text-white\|text-black" src/components/ui/

echo "\n✅ Token validation complete"
```

---

## Manual Testing Checklist

### Interactive Testing

Test each component:

- [ ] **Click/tap**: Active state visible (`scale(0.97)`)
- [ ] **Hover**: Hover effects smooth and visible
- [ ] **Keyboard focus**: Tab navigation works, focus ring visible
- [ ] **Disabled state**: Component appears disabled, not clickable
- [ ] **Loading state**: Shows appropriate loading UI
- [ ] **Error state**: Shows error styling when invalid

### Visual Testing

Check appearance:

- [ ] **Dark mode**: All colors visible and correct
- [ ] **Light mode**: Theme colors inverted properly
- [ ] **Responsive**: Works on mobile, tablet, desktop
- [ ] **Typography**: Text legible and sizes appropriate
- [ ] **Spacing**: Padding/margins consistent
- [ ] **Alignment**: Elements properly aligned

### Accessibility Testing

Verify accessibility:

- [ ] **Keyboard**: Can use with keyboard only
- [ ] **Screen reader**: Announces properly
- [ ] **Color contrast**: Meets WCAG standards
- [ ] **Focus visible**: Clear focus indicators
- [ ] **ARIA labels**: Present where needed

---

## Validation Report Template

Use this template when reviewing components:

```markdown
## Component Validation Report

**Component**: {name}
**Location**: `src/components/ui/{name}.tsx`
**Date**: {date}
**Reviewer**: {name}

### Design System Compliance

- [ ] Token usage (no hardcoded values)
- [ ] Linear interaction patterns
- [ ] Proper component structure
- [ ] TypeScript types
- [ ] Accessibility

### Issues Found

1. **Issue**: {description}
   - **Severity**: High/Medium/Low
   - **Location**: Line {number}
   - **Fix**: {suggested fix}

2. **Issue**: {description}
   - **Severity**: High/Medium/Low
   - **Location**: Line {number}
   - **Fix**: {suggested fix}

### Recommendations

- {recommendation 1}
- {recommendation 2}

### Status

- [ ] Approved
- [ ] Approved with changes
- [ ] Needs revision
```

---

## Quick Validation Commands

```bash
# Check all components at once
npm run lint                      # Run ESLint
npm run typecheck                 # Check TypeScript
grep -r "bg-\[#" src/components/ # Find hardcoded colors

# Specific component validation
./scripts/validate-component.sh button

# Full design system audit
./scripts/audit-design-system.sh
```

---

**For implementation details, see `SKILL.md`. For token reference, see `TOKENS.md`. For component examples, see `COMPONENTS.md`.**
