# Agent Skills Reference

This file guides AI coding agents on context-efficient skill loading for this project. Skills are located in `.agents/skills/` and loaded progressively based on task relevance.

## Skill Loading Strategy

**Progressive Loading:**
1. Load skill names and descriptions at session start (minimal context)
2. Load full skill content only when task triggers match
3. For large skills, reference detailed files only when specifically needed

**Context Efficiency:**
- Keep commonly-used skills in active context
- Load specialized skills on-demand
- Reference supporting files (AGENTS.md, rules/*.md) only when applying specific patterns

## Available Skills

### react-best-practices

**Location:** `.agents/skills/react-best-practices/`

**When to Load:**
- Writing/editing React components or Next.js pages
- Implementing data fetching (client or server-side)
- Performance optimization requests
- Code review for React/Next.js
- Refactoring existing React code
- Bundle size or load time optimization

**Primary Reference:** `.agents/skills/react-best-practices/AGENTS.md` (65KB, 2400+ lines)
- Contains all 45+ rules with detailed examples
- Organized by priority: Critical → High → Medium → Low

**Categories (8):**
1. Eliminating Waterfalls (CRITICAL) - `async-*` rules
2. Bundle Size Optimization (CRITICAL) - `bundle-*` rules  
3. Server-Side Performance (HIGH) - `server-*` rules
4. Client-Side Data Fetching (MEDIUM-HIGH) - `client-*` rules
5. Re-render Optimization (MEDIUM) - `rerender-*` rules
6. Rendering Performance (MEDIUM) - `rendering-*` rules
7. JavaScript Performance (LOW-MEDIUM) - `js-*` rules
8. Advanced Patterns (LOW) - `advanced-*` rules

**Loading Approach:**
- Start with AGENTS.md overview for context
- Reference specific rules from `rules/*.md` when applying patterns
- Prioritize Critical/High impact rules for optimization tasks

---

### web-design-guidelines

**Location:** `.agents/skills/web-design-guidelines/`

**When to Load:**
- UI/UX code review requests
- "Review my UI/design/accessibility"
- Auditing for best practices
- Checking compliance with web standards

**Primary Reference:** `.agents/skills/web-design-guidelines/SKILL.md`
- Instructions to fetch latest guidelines from Vercel's web-interface-guidelines repo
- URL: `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`

**Categories Covered:**
- Accessibility (ARIA, semantic HTML, keyboard navigation)
- Focus states and visual indicators
- Forms (autocomplete, validation, errors)
- Animation (prefers-reduced-motion, performance)
- Typography (proper characters, spacing)
- Images (dimensions, lazy loading, alt text)
- Performance (virtualization, layout optimization)
- Navigation & state management
- Dark mode & theming
- Touch & mobile interaction
- Internationalization

**Loading Approach:**
- Fetch fresh guidelines when review is requested
- Apply rules to specified files/patterns
- Output findings in `file:line` format

---

### frontend-design

**Location:** `.agents/skills/frontend-design/`

**When to Load:**
- Building new UI components/pages from scratch
- Creating landing pages, dashboards, web apps
- "Make this beautiful/polished/production-grade"
- Designing distinctive interfaces
- Styling/beautifying existing UI

**Primary Reference:** `.agents/skills/frontend-design/SKILL.md`
- Self-contained design philosophy (no external dependencies)
- Focused on creating distinctive, non-generic aesthetics

**Design Principles:**
- **Bold aesthetic direction** - Choose clear conceptual vision (minimal, maximalist, brutalist, etc.)
- **Typography** - Distinctive, characterful fonts (avoid Inter, Roboto, Arial)
- **Color & Theme** - Cohesive palettes with dominant colors + sharp accents
- **Motion** - Strategic animations (page load reveals, scroll triggers, hover states)
- **Spatial Composition** - Asymmetry, overlap, generous negative space
- **Visual Details** - Gradients, textures, patterns, shadows, custom effects

**Anti-patterns to Avoid:**
- Generic AI aesthetics (purple gradients on white, overused fonts)
- Cookie-cutter layouts and components
- Predictable, context-agnostic designs

**Loading Approach:**
- Load SKILL.md before starting UI work
- Apply design thinking: understand purpose → choose bold direction → execute with precision
- Match implementation complexity to aesthetic vision

---

### linear-design-system

**Location:** `.agents/skills/linear-design-system/`

**When to Load:**
- Adding new UI components to the design system
- Modifying design tokens (colors, typography, spacing, shadows, motion, radius)
- Validating component implementation against design system rules
- Migrating existing components to use design system tokens
- Creating Linear-styled components (Button, Card, Badge, Input, etc.)
- Reviewing code for design system compliance
- Ensuring components follow Linear interaction patterns

**Primary Reference:** `.agents/skills/linear-design-system/SKILL.md`
- Comprehensive guide for maintaining Linear design system
- Token management and component creation patterns
- Validation rules and migration strategies
- Component structure with cva() and forwardRef patterns

**Supporting Documentation:**
- `TOKENS.md` - Complete token reference with usage examples
  - Colors (backgrounds, text, borders, accent, status)
  - Typography (font scales, weights, letter spacing)
  - Spacing (8px-based scale)
  - Radius (xs to full)
  - Shadows (elevation levels)
  - Motion (durations and easings)
- `COMPONENTS.md` - Component patterns and implementation examples
  - Button, Badge, Card, Input templates
  - Compound component patterns
  - Variant composition with cva()
- `VALIDATION.md` - Validation rules and checklists
  - Automated validation scripts
  - Code review checklists
  - Common violations and fixes

**Key Principles:**
- **Token-first development** - Never hardcode design values, always use tokens
- **Linear interaction patterns** - `active:scale-[0.97]` transform on interactive elements
- **Background layering** - Use increasing layers for depth (primary → secondary → tertiary → quaternary)
- **Precise typography** - Negative letter spacing, specific font weights (400, 510, 538)
- **Smooth transitions** - `transition-fast` (150ms) or `transition-base` (200ms)
- **Focus states** - Accent-colored rings on focus-visible
- **Component structure** - Use cva(), forwardRef, TypeScript types

**Design System Assets:**
- Tokens location: `src/lib/design-system/tokens/`
- Components location: `src/components/ui/`
- Configuration: `tailwind.config.ts`, `src/app/globals.css`
- Demo page: `src/app/design-system/page.tsx`

**Source Data:**
- Extracted from Linear.app production tokens
- JSON files in `output/linear.app/` directory

**Loading Approach:**
- Load SKILL.md when creating or modifying components
- Reference TOKENS.md for specific token values and usage patterns
- Use COMPONENTS.md for implementation patterns and templates
- Apply VALIDATION.md for code review and quality checks
- This skill takes precedence over frontend-design for UI work in this project

---

## MCP Tools

Model Context Protocol tools provide specialized integrations for documentation, database operations, framework diagnostics, and deployment. Use proactively when task patterns match.

### OpenAI Developer Docs

**Auto-use when:** Working with OpenAI API, ChatGPT Apps SDK, function calling, assistants, embeddings, fine-tuning (no explicit request needed)  
**Key functions:** `search_openai_docs`, `fetch_openai_doc`, `get_openapi_spec`  
**Pattern:** Search topic → fetch URL with anchor → implement with exact schemas

### Neon

**Auto-use when:** Database errors, schema migrations, slow queries, query optimization, branch operations  
**Key functions:** `run_sql`, `prepare_database_migration`, `list_projects`, `create_branch`, `list_slow_queries`  
**Pattern:** Check existing schema → execute changes → verify results

### next-devtools

**Auto-use when:** Next.js build failures, runtime errors, compilation issues, debugging  
**Key functions:** `nextjs_index` (discover server), `nextjs_call` (get_errors, get_routes, clear_cache)  
**Pattern:** Index dev server → call diagnostics → fix issues → verify

### shadcn

**Use before:** Creating new UI components, checking existing patterns  
**Key functions:** `search_items_in_registries`, `view_items_in_registries`, `get_item_examples_from_registries`, `get_add_command_for_items`  
**Pattern:** Search component → view examples → install with CLI command

### vercel

**Use for:** Deployments, environment configuration, domain management, build logs  
**Key functions:** `deploy_to_vercel`, `get_deployment`, `list_projects`, `get_deployment_build_logs`  
**Pattern:** Deploy/diagnose as needed for production operations

---

## Adding New Skills

**Detection:**
When a new skill is added to `.agents/skills/`, update this file with:

1. **Skill name** (directory name from `.agents/skills/{skill-name}/`)
2. **Location** (`.agents/skills/{skill-name}/`)
3. **When to Load** (task triggers and use cases from SKILL.md frontmatter)
4. **Primary Reference** (main documentation file: SKILL.md, AGENTS.md, or README.md)
5. **Categories/Features** (key capabilities from skill documentation)
6. **Loading Approach** (how to efficiently use the skill's content)

**Auto-Detection Process:**
```bash
# Scan for new skills
ls -d .agents/skills/*/ | while read skill_dir; do
  skill_name=$(basename "$skill_dir")
  # Check for SKILL.md or README.md
  # Extract frontmatter (name, description)
  # Add entry to AGENTS.md
done
```

**Skill File Priority:**
1. Look for `AGENTS.md` (comprehensive reference like react-best-practices)
2. Fall back to `SKILL.md` (standard skill definition)
3. Fall back to `README.md` (general documentation)

---

## Session Workflow

**At Session Start:**
1. Read this AGENTS.md file
2. Scan `.agents/skills/` for available skills
3. Load skill names and descriptions (minimal context)
4. Check MCP tools catalog for task-relevant integrations
5. Keep skill catalog in memory

**During Development:**
1. Match task to relevant skills based on triggers
2. Auto-invoke MCP tools for matching patterns (OpenAI docs, Next.js errors, database ops)
3. Load full skill content when task relevance is high
4. Reference detailed files (AGENTS.md, rules/*.md) only when applying specific patterns
5. Unload non-relevant skills to manage context

**Context Budget Guidelines:**
- Essential skills (react-best-practices for React projects): Keep loaded
- Specialized skills (web-design-guidelines, frontend-design): Load on-demand
- Detailed references: Load specific sections/rules as needed

---

## Project Context

**Framework:** Next.js (React)  
**Design System:** Linear (Custom implementation)  
**Database:** Neon (PostgreSQL with vector search)  
**Primary Skills:** react-best-practices (always relevant), linear-design-system (for all UI work)  
**Secondary Skills:** frontend-design (for new pages/apps), web-design-guidelines (for audits/reviews)  
**MCP Tools:** OpenAI docs (auto), next-devtools (errors), Neon (database), shadcn (components), vercel (deploy)

**Default Behavior:**
- Apply react-best-practices patterns by default for all React/Next.js code
- Load linear-design-system when creating/modifying UI components (highest priority for UI)
- Auto-use OpenAI docs MCP for any OpenAI API implementation
- Auto-use next-devtools for Next.js diagnostics and error resolution
- Auto-use Neon MCP for database migrations, schema changes, and query optimization
- Load frontend-design only when creating entirely new pages/apps without design system constraints
- Load web-design-guidelines only when explicitly requested or reviewing UI

---

*This file should be kept in sync with `.agents/skills/` directory contents. Update whenever skills are added or removed.*
