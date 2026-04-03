# FinnLens Design System

> A comprehensive reference for the visual language, component library, and interaction patterns used across the FinnLens frontend.

---

## Table of Contents

1. [Foundation](#foundation)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing & Sizing](#spacing--sizing)
5. [Border Radius](#border-radius)
6. [Iconography](#iconography)
7. [Component Library](#component-library)
8. [Layout System](#layout-system)
9. [Dark Mode](#dark-mode)
10. [Animation & Motion](#animation--motion)
11. [Data Visualization](#data-visualization)
12. [Patterns & Conventions](#patterns--conventions)
13. [Dependency Map](#dependency-map)

---

## Foundation

### Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | 19.2 |
| Build | Vite | 7.3 |
| CSS | Tailwind CSS | 4.2 (v4 architecture) |
| Component Kit | shadcn/ui | 4.0 (base-nova style) |
| Headless Primitives | @base-ui/react | 1.2 |
| Variant Management | class-variance-authority (CVA) | 0.7 |
| Class Utilities | clsx + tailwind-merge | 2.1 / 3.5 |
| Animation | Framer Motion | 12.36 |
| Icons | Lucide React | 0.577 |
| Charts | Recharts | 3.8 |
| State Management | Zustand | 5.0 |
| Server State | TanStack React Query | 5.90 |
| Routing | React Router | 7.13 |
| Date Utilities | date-fns | 4.1 |
| Toasts | Sonner | 2.0 |

### Configuration

**shadcn/ui** (`components.json`):
- Style: `base-nova`
- Base color: `neutral`
- CSS variables: enabled
- Icon library: `lucide`
- RSC: disabled (client-side React)
- Path aliases: `@/components`, `@/lib`, `@/hooks`, `@/components/ui`

**Tailwind CSS v4** — configured inline via `@theme` blocks in `index.css` (no `tailwind.config.ts`). The Vite plugin `@tailwindcss/vite` handles compilation.

### Utility Function

```ts
// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

Used throughout all components for conditional and conflict-free class merging.

---

## Color System

All colors are defined as HSL triplets (space-separated, no `hsl()` wrapper) in CSS custom properties, then mapped to Tailwind via `@theme inline`. This allows a single set of variables to power both light and dark modes.

### Semantic Tokens

| Token | Light Mode | Dark Mode | Purpose |
|-------|-----------|-----------|---------|
| `--background` | `210 20% 96%` | `225 20% 7%` | Page background |
| `--foreground` | `220 20% 18%` | `210 20% 88%` | Primary text |
| `--card` | `0 0% 100%` | `225 18% 10%` | Card surfaces |
| `--card-foreground` | `220 20% 18%` | `210 20% 88%` | Card text |
| `--popover` | `0 0% 100%` | `225 18% 10%` | Popover/dropdown surfaces |
| `--popover-foreground` | `220 20% 18%` | `210 20% 88%` | Popover text |
| `--primary` | `175 80% 35%` | `175 85% 42%` | Brand teal — CTAs, active states, links |
| `--primary-foreground` | `0 0% 100%` | `0 0% 100%` | Text on primary |
| `--secondary` | `210 15% 90%` | `230 18% 14%` | Secondary surfaces |
| `--secondary-foreground` | `220 15% 35%` | `210 15% 78%` | Secondary text |
| `--muted` | `210 12% 88%` | `230 15% 12%` | Subtle backgrounds, hover states |
| `--muted-foreground` | `220 10% 46%` | `210 15% 55%` | De-emphasized text, icons |
| `--accent` | `320 70% 50%` | `320 75% 55%` | Magenta accent — highlights, expense charts |
| `--accent-foreground` | `0 0% 100%` | `0 0% 100%` | Text on accent |
| `--destructive` | `0 75% 50%` | `0 85% 55%` | Errors, delete actions |
| `--destructive-foreground` | `0 0% 100%` | `0 0% 100%` | Text on destructive |
| `--border` | `210 15% 88%` | `222 14% 18%` | Borders, dividers |
| `--input` | `210 15% 82%` | `220 15% 18%` | Input field borders |
| `--ring` | `175 80% 35%` | `175 85% 42%` | Focus ring (matches primary) |

### Sidebar Tokens

Separate tokens for the sidebar allow independent theming:

| Token | Light | Dark |
|-------|-------|------|
| `--sidebar-background` | `210 18% 97%` | `225 20% 7%` |
| `--sidebar-foreground` | `220 15% 35%` | `210 15% 78%` |
| `--sidebar-primary` | `175 80% 35%` | `175 85% 42%` |
| `--sidebar-accent` | `210 12% 90%` | `230 18% 14%` |
| `--sidebar-border` | `210 15% 88%` | `222 14% 18%` |
| `--sidebar-ring` | `175 80% 35%` | `175 85% 42%` |

### Chart Palette

Five distinct colors for data visualization, tuned for accessibility in both modes:

| Token | Light | Dark | Hue |
|-------|-------|------|-----|
| `--chart-1` | `175 80% 35%` | `175 85% 42%` | Teal |
| `--chart-2` | `320 70% 50%` | `320 75% 55%` | Magenta |
| `--chart-3` | `145 65% 32%` | `145 80% 42%` | Green |
| `--chart-4` | `40 80% 42%` | `40 85% 50%` | Orange |
| `--chart-5` | `270 60% 50%` | `270 70% 60%` | Purple |

### Color Usage in Tailwind

All tokens are bridged to Tailwind utilities via `@theme inline`:

```css
@theme inline {
    --color-primary: hsl(var(--primary));
    --color-accent: hsl(var(--accent));
    /* ... all tokens mapped */
}
```

Use standard Tailwind classes: `bg-primary`, `text-muted-foreground`, `border-border`, etc.

### Brand Color Identity

- **Primary (Teal)** — The signature color. Used for CTAs, active navigation, focus rings, the logo icon, and income data in charts.
- **Accent (Magenta)** — The complementary accent. Used for expense data in charts, highlights, and attention-drawing elements.
- **Destructive (Red)** — Reserved strictly for errors, warnings, and destructive actions.

---

## Typography

### Font

**Inter Variable** — loaded via `@fontsource-variable/inter`, imported in `main.tsx`.

```css
--font-sans: 'Inter Variable', 'Inter', system-ui, -apple-system, sans-serif;
```

Applied globally: `body { font-family: var(--font-sans); }` with `-webkit-font-smoothing: antialiased`.

### Type Scale

Tailwind's default type scale is used with these conventions:

| Usage | Class | ~Size |
|-------|-------|-------|
| Page title | `text-lg font-semibold` | 18px |
| Section heading | `text-base font-semibold` | 16px |
| Card title | `text-sm font-semibold` | 14px |
| Body text | `text-sm` | 14px |
| Small text / labels | `text-xs` | 12px |
| Tiny / badges | `text-xs font-medium` | 12px |

### Heading Styles

All headings (`h1`–`h6`) receive base styles automatically:

```css
h1, h2, h3, h4, h5, h6 {
  font-weight: 600;       /* font-semibold */
  letter-spacing: -0.025em; /* tracking-tight */
}
```

### Financial Data

For monetary values and numeric tables, use the `tabular-nums` utility to ensure digits are fixed-width and columns align:

```css
.tabular-nums {
  font-feature-settings: "tnum";
  font-variant-numeric: tabular-nums;
}
```

---

## Spacing & Sizing

### Base Unit

Tailwind's 4px grid: `1 unit = 0.25rem = 4px`.

### Common Spacing Patterns

| Context | Padding | Gap |
|---------|---------|-----|
| Page content | `p-3 md:p-6` (12px / 24px) | — |
| Card content | `p-4` (16px) | — |
| Sidebar padding | `p-2` to `p-4` | — |
| Header | `px-3 md:px-6 py-3` | `gap-2` |
| Navigation items | `px-3 py-2.5` | `gap-3` |
| Between cards | — | `gap-4` to `gap-6` |
| Between small elements | — | `gap-1.5` to `gap-2` |

### Interactive Element Sizes

| Element | Height | Width |
|---------|--------|-------|
| Button (default) | `h-8` (32px) | auto |
| Button (xs) | `h-6` (24px) | auto |
| Button (sm) | `h-7` (28px) | auto |
| Button (lg) | `h-9` (36px) | auto |
| Icon button | `size-8` (32px) | 32px |
| Icon button (xs) | `size-6` (24px) | 24px |
| Icon button (sm) | `size-7` (28px) | 28px |
| Icon button (lg) | `size-9` (36px) | 36px |
| Header action buttons | `w-9 h-9` (36px) | 36px |
| Input | `h-8` (32px) | full |
| Badge | `h-5` (20px) | auto |

---

## Border Radius

Base radius: `--radius: 0.625rem` (10px).

All radius values are derived proportionally:

| Token | Formula | Value |
|-------|---------|-------|
| `--radius-sm` | `base * 0.6` | 3.75px |
| `--radius-md` | `base * 0.8` | 5px |
| `--radius-lg` | `base * 1.0` | 6.25px |
| `--radius-xl` | `base * 1.4` | 8.75px |
| `--radius-2xl` | `base * 1.8` | 11.25px |
| `--radius-3xl` | `base * 2.2` | 13.75px |
| `--radius-4xl` | `base * 2.6` | 16.25px |

### Usage

| Element | Radius |
|---------|--------|
| Buttons, inputs, cards | `rounded-lg` (base) |
| Small buttons (xs/sm) | `rounded-[min(var(--radius-md),10px)]` |
| Badges | `rounded-4xl` (pill shape) |
| Avatar, icon containers | `rounded-lg` |

---

## Iconography

### Library

**Lucide React** — consistent, MIT-licensed icon set.

```tsx
import { IconName } from 'lucide-react'
```

### Sizing Convention

| Context | Class | Pixel Size |
|---------|-------|------------|
| Tiny | `w-3 h-3` | 12px |
| Small | `w-3.5 h-3.5` | 14px |
| Default | `w-4 h-4` | 16px |
| Navigation icons | `w-[18px] h-[18px]` | 18px |
| Medium | `w-5 h-5` | 20px |
| Large | `w-6 h-6` | 24px |

Within buttons, icons auto-size to `size-4` via the selector `[&_svg:not([class*='size-'])]:size-4` unless a size class is explicitly set.

### Icon Inventory by Category

**Navigation:** `LayoutDashboard`, `Wallet`, `ArrowDownUp`, `BarChart3`, `LineChart`, `CalendarDays`, `Bell`, `Settings`

**Actions:** `LogOut`, `Menu`, `X`, `Search`, `ChevronLeft`, `ChevronRight`, `Eye`

**Status/Feedback:** `Sun`, `Moon`, `TrendingUp`, `AlertTriangle`, `CircleCheckIcon`, `InfoIcon`, `TriangleAlertIcon`, `OctagonXIcon`, `Loader2Icon`

**Financial:** `CreditCard`, `DollarSign`, `ShoppingCart`, `Zap`, `Shield`

---

## Component Library

All UI primitives live in `src/components/ui/` and follow the shadcn/ui conventions.

### Primitive Components

| Component | File | Description |
|-----------|------|-------------|
| Button | `ui/button.tsx` | CVA-driven button with 6 variants and 8 sizes |
| Badge | `ui/badge.tsx` | Inline status/label with 6 variants |
| Card | `ui/card.tsx` | Container with Header, Title, Description, Action, Content, Footer |
| Dialog | `ui/dialog.tsx` | Modal overlay with Trigger, Content, Header, Footer |
| Dropdown Menu | `ui/dropdown-menu.tsx` | Context/action menu |
| Select | `ui/select.tsx` | Styled select dropdown |
| Popover | `ui/popover.tsx` | Floating content panel |
| Command | `ui/command.tsx` | Command palette (cmdk-based) |
| Input | `ui/input.tsx` | Text input field |
| Input Group | `ui/input-group.tsx` | Input wrapper with icon support |
| Textarea | `ui/textarea.tsx` | Multi-line text input |
| Label | `ui/label.tsx` | Form label |
| Switch | `ui/switch.tsx` | Toggle switch (default + sm sizes) |
| Calendar | `ui/calendar.tsx` | Date picker (react-day-picker) |
| Table | `ui/table.tsx` | Data table with Header, Body, Row, Head, Cell, Caption |
| Separator | `ui/separator.tsx` | Horizontal/vertical divider |
| Skeleton | `ui/skeleton.tsx` | Loading placeholder |
| Toaster | `ui/sonner.tsx` | Toast notification container (Sonner) |

### Button Variants

```
variant: default | outline | secondary | ghost | destructive | link
size:    default | xs | sm | lg | icon | icon-xs | icon-sm | icon-lg
```

| Variant | Appearance |
|---------|-----------|
| `default` | Solid primary (teal) background, white text |
| `outline` | Border, transparent background, hover fills muted |
| `secondary` | Muted background, secondary text |
| `ghost` | No background, hover fills muted |
| `destructive` | Light red background, red text |
| `link` | Text only with underline on hover |

### Badge Variants

```
variant: default | secondary | destructive | outline | ghost | link
```

All badges are pill-shaped (`rounded-4xl`) at `h-5` with `text-xs font-medium`.

### Component Patterns

**Data Slot Attributes:** Components emit `data-slot` attributes for CSS targeting:
```tsx
<ButtonPrimitive data-slot="button" ... />
```

**Composition Pattern:** Complex components export a root + sub-components:
```tsx
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
```

**Headless Foundation:** All primitives are built on `@base-ui/react` headless components, styled with Tailwind via CVA.

### Custom Application Components

| Component | File | Description |
|-----------|------|-------------|
| AppLayout | `components/AppLayout.tsx` | Shell layout with header, sidebar, main area |
| Sidebar | `components/Sidebar.tsx` | Collapsible navigation sidebar |
| ThemeToggle | `components/ThemeToggle.tsx` | Dark/light mode toggle button |
| SyncIndicator | `components/SyncIndicator.tsx` | Gmail sync status indicator |
| NotificationPanel | `components/NotificationPanel.tsx` | Slide-out notification center |

**Overview domain** (`components/overview/`):

| Component | Description |
|-----------|-------------|
| OverviewCards | Summary stat cards (spending, income, transactions) |
| SpendingChart | Monthly income vs. expenses bar chart (Framer Motion) |
| SpendingBreakdown | Category-level spending donut/list |
| RecentTransactions | Latest transaction list |
| BudgetTracker | Budget progress bars |
| InvestmentPanel | Investment summary panel |
| QuickAlerts | Financial alerts/warnings |

**Calendar domain** (`components/calendar/`):

| Component | Description |
|-----------|-------------|
| FinancialCalendar | Monthly grid with financial event markers |
| CalendarDayCell | Individual day cell with transaction indicators |
| CalendarLegend | Event type color legend |
| DayDetailPanel | Expanded view for a selected day's transactions |

---

## Layout System

### App Shell

```
AppLayout
├── [Demo Banner]                    (conditional, fixed top)
└── Flex Row (h-screen)
    ├── Sidebar                      (hidden < md, w-60 or w-16 collapsed)
    ├── [Mobile Drawer Overlay]      (visible < md when open, z-50)
    └── Main Column (flex-1)
        ├── Header                   (sticky, bg-background/80, backdrop-blur)
        │   ├── Mobile menu toggle   (< md only)
        │   ├── Page title
        │   ├── SyncIndicator
        │   ├── ThemeToggle
        │   ├── Search button
        │   └── User avatar
        └── Main Content             (overflow-y-auto, p-3 md:p-6)
            └── <Outlet />           (React Router page)
```

### Sidebar

- **Expanded:** `w-60` (240px) — icon + label
- **Collapsed:** `w-16` (64px) — icon only
- **Background:** `bg-muted/40` with `border-r border-border`
- **Active nav item:** `text-primary bg-primary/10`
- **Inactive nav item:** `text-muted-foreground hover:text-foreground hover:bg-muted/80`
- **Collapse toggle:** Desktop only (`hidden md:flex`), bottom of sidebar

### Header

- Sticky with blur: `sticky top-0 bg-background/80 backdrop-blur-sm`
- Action buttons: `w-9 h-9 rounded-lg bg-card border border-border shadow-sm`
- Responsive: hamburger menu on mobile, hidden on desktop

### Responsive Breakpoints

| Breakpoint | Width | Usage |
|-----------|-------|-------|
| `sm:` | 640px | Minor layout adjustments |
| `md:` | 768px | Primary breakpoint — sidebar visibility, padding scale |
| `lg:` | 1024px | Wide layout refinements |

Mobile-first approach: base styles target mobile, `md:` overrides for desktop.

### Pages

| Route | Page Component |
|-------|---------------|
| `/overview` | OverviewPage |
| `/accounts` | AccountsPage |
| `/transactions` | TransactionsPage |
| `/analytics` | AnalyticsPage |
| `/calendar` | CalendarPage |
| `/subscriptions` | SubscriptionsPage |
| `/investments` | InvestmentsPage |
| `/notifications` | NotificationsPage |
| `/settings` | SettingsPage |
| `/login` | LoginPage |
| `/onboarding` | OnboardingPage |
| `/oauth/callback` | OAuthCallbackPage |

---

## Dark Mode

### Implementation

Custom React Context — **not** `next-themes` (though it's installed, the app uses its own `DarkModeContext`).

```
src/contexts/DarkModeContext.tsx
```

### Modes

```ts
type ColorMode = "light" | "dark" | "system"
```

- **light** — Forces light theme
- **dark** — Forces dark theme
- **system** — Follows `prefers-color-scheme` media query, with a live listener for OS changes

### Mechanism

1. `DarkModeProvider` wraps the entire app
2. Mode persisted to `localStorage` under key `finnlens_color_mode`
3. Adds/removes `dark` class on `<html>` element
4. Tailwind's dark variant configured via `@custom-variant dark (&:is(.dark *));`

### Consumer API

```tsx
import { useDarkMode } from "@/contexts/DarkModeContext"

const { colorMode, setColorMode, isDark } = useDarkMode()
```

### Toast Integration

The Sonner toaster reads `isDark` from context and sets `theme="dark"|"light"` plus inline CSS variables for background and shadow:

```tsx
// Light: white bg, subtle shadow
// Dark: card bg (hsl(225 18% 10%)), deeper shadow
```

### Dark Mode Design Principles

- **Backgrounds shift to deep blue-grays** (not pure black) for reduced eye strain
- **Primary teal brightens** from 35% to 42% lightness for legibility on dark surfaces
- **Accent magenta brightens** from 50% to 55% lightness
- **Borders become subtler** with lower contrast ratios
- **Chart colors gain saturation** to remain vibrant on dark backgrounds

---

## Animation & Motion

### Framer Motion

Used for entrance animations, chart bars, page transitions, and staggered reveals.

#### Common Patterns

**Fade + scale entrance** (cards, panels):
```tsx
<motion.div
  initial={{ opacity: 0, scale: 0.96 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.15, ease: 'easeOut' }}
/>
```

**Animated chart bars** (SpendingChart):
```tsx
<motion.div
  initial={{ height: 0 }}
  animate={{ height: `${percentage}%` }}
  transition={{ duration: 0.5, delay: 0.1 + index * 0.04 }}
/>
```

**Staggered children** (lists):
```tsx
transition={{ delay: baseDelay + index * 0.05 }}
```

**Page transitions** (calendar month change):
```tsx
<motion.div
  key={monthKey}
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.2 }}
/>
```

### CSS Transitions

Used for simpler interactive states:

| Class | Usage |
|-------|-------|
| `transition-all` | General-purpose hover/state transitions |
| `transition-colors` | Color-only changes (hover backgrounds) |
| `duration-100` | Fast micro-interactions |
| `duration-150` | Default transitions |
| `duration-200` | Moderate transitions |
| `duration-300` | Sidebar collapse/expand |

### Animation Library: tw-animate-css

Provides Tailwind-compatible animation classes used by shadcn/ui components:

- `slide-in-from-top-2`, `slide-in-from-bottom-2`, `slide-in-from-left-2`, `slide-in-from-right-2`
- `fade-in-0`, `fade-out-0`
- `zoom-in-95`, `zoom-out-95`
- `animate-spin` (loading spinners)

### Motion Principles

1. **Subtle and fast** — Most animations are 150–200ms. Nothing exceeds 500ms.
2. **Physics-based easing** — `easeOut` for entrances, `easeInOut` for transitions.
3. **Staggered reveals** — Lists and grids animate children with 40–50ms delays.
4. **Purpose-driven** — Animation draws attention to state changes, not decoration.

---

## Data Visualization

### Libraries

- **Recharts 3.8** — For complex charts (line, area, pie/donut)
- **Custom Framer Motion bars** — For the SpendingChart (animated bar chart with fine-grained control)

### Chart Color Assignments

| Data Type | Color Token | Hue |
|-----------|------------|-----|
| Income / Primary data | `--chart-1` | Teal |
| Expenses / Secondary data | `--chart-2` | Magenta |
| Savings / Positive | `--chart-3` | Green |
| Warnings / Alerts | `--chart-4` | Orange |
| Investments / Tertiary | `--chart-5` | Purple |

### Chart Styling Conventions

- **Container backgrounds:** `bg-muted/30` for subtle framing
- **Axis labels:** `text-xs text-muted-foreground`
- **Tooltips:** Follow the `popover` token styling (`bg-popover border-border`)
- **Legend markers:** Small colored squares (`w-2.5 h-2.5 rounded`) with `text-xs` labels
- **Financial values:** Use `tabular-nums` for aligned number columns
- **Bar opacity:** `primary/80` and `accent/80` (slightly transparent for layering)

---

## Patterns & Conventions

### Component Authoring

1. **CVA for variants** — All multi-variant components use `class-variance-authority`
2. **`cn()` for class merging** — Every component uses `cn()` to allow className overrides
3. **`data-slot` attributes** — Emitted for external CSS targeting without coupling to class names
4. **Composition over configuration** — Complex components export sub-components (Card + CardHeader + CardTitle...) rather than accepting deeply nested props
5. **Headless + styled** — `@base-ui/react` provides behavior, Tailwind provides appearance

### Accessibility

- **Focus indicators:** `focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50`
- **ARIA attributes:** `aria-invalid`, `aria-expanded`, `aria-label` used consistently
- **Keyboard navigation:** Inherited from @base-ui/react headless primitives
- **Color contrast:** Dark mode colors are tuned with higher lightness values to maintain WCAG contrast

### State Styling

| State | Pattern |
|-------|---------|
| Hover | `hover:bg-muted/80` or `hover:bg-primary/80` |
| Active (pressed) | `active:translate-y-px` (1px downward press) |
| Focus visible | `focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50` |
| Disabled | `disabled:pointer-events-none disabled:opacity-50` |
| Active nav | `text-primary bg-primary/10` |
| Invalid | `aria-invalid:border-destructive aria-invalid:ring-destructive/20` |

### File Organization

```
src/
├── api/                    # API client modules (banking, gmail, auth, etc.)
├── components/
│   ├── ui/                 # shadcn/ui primitives (18 components)
│   ├── overview/           # Dashboard domain components
│   ├── calendar/           # Calendar domain components
│   ├── AppLayout.tsx       # App shell
│   ├── Sidebar.tsx         # Navigation sidebar
│   ├── ThemeToggle.tsx     # Dark mode toggle
│   ├── SyncIndicator.tsx   # Sync status
│   └── NotificationPanel.tsx
├── contexts/               # React contexts (DarkModeContext)
├── hooks/                  # Custom hooks
├── lib/                    # Utilities (utils.ts, demo.ts)
├── pages/                  # Route page components
│   └── banking/            # Banking sub-pages
├── stores/                 # Zustand stores (authStore, syncStore)
└── main.tsx                # App entry point
```

### Naming Conventions

- **UI primitives:** PascalCase, single-word or compound (`Button`, `DropdownMenu`, `InputGroup`)
- **Page components:** `*Page.tsx` suffix (`OverviewPage.tsx`, `LoginPage.tsx`)
- **Domain components:** Descriptive PascalCase (`SpendingChart`, `FinancialCalendar`)
- **Stores:** `camelCaseStore.ts` (`authStore.ts`, `syncStore.ts`)
- **API modules:** `camelCase.ts` (`banking.ts`, `gmail.ts`)

---

## Dependency Map

### Component Dependencies

```
@base-ui/react          → Button, Badge, Switch (headless behavior)
class-variance-authority → Button, Badge (variant management)
cmdk                    → Command (command palette)
react-day-picker        → Calendar (date picking)
sonner                  → Toaster (toast notifications)
framer-motion           → SpendingChart, OverviewCards, Calendar (animation)
recharts                → Analytics charts (data visualization)
lucide-react            → All components (icons)
```

### State Dependencies

```
zustand                 → authStore (JWT, user), syncStore (sync status)
@tanstack/react-query   → Server state (profiles, transactions, accounts)
react-router-dom        → Routing, navigation, active states
DarkModeContext         → Theme toggle, Toaster, any theme-aware component
```
