# FCR-SCS Design System

## Overview
This document outlines the **Material You (Material Design 3)** implementation strategy used in the Fair Compensation and Resettlement Smart Contract System (FCR-SCS) frontend application. The system provides a modern, accessible, and user-friendly interface using React and Tailwind CSS.

## Design Philosophy
The FCR-SCS interface follows the Material You guidelines, focusing on:
- **Tonal Surfaces**: Using tinted off-white and soft colors for background depth rather than stark white.
- **Organic Shapes**: Emphasizing large, friendly border radii, pill-shaped buttons, and atmospheric background blurs.
- **Micro-interactions**: Incorporating smooth cubic-bezier transitions, hover scales, and press feedback (`active:scale-95`).
- **Progressive Elevation**: Using shadow transitions (`shadow-sm` to `shadow-md`) to reveal depth upon interaction.

## File Structure

```text
c:\repository\fcr-scs\frontend\
├── tailwind.config.js       # Contains MD3 tokens, colors, radii, and custom easing.
├── postcss.config.js        # PostCSS configuration.
└── src/
    ├── index.css            # Global CSS, base styles, and utility classes.
    ├── App.tsx              # Router configuration (react-router-dom).
    ├── main.tsx             # Entry point with NotificationProvider.
    ├── components/
    │   ├── layout/          # Global layout components.
    │   │   ├── Layout.tsx   # Wrapper combining Navbar, Outlet, and Footer.
    │   │   ├── Navbar.tsx   # Auto-hiding sticky navigation bar.
    │   │   └── Footer.tsx   # Global footer.
    │   └── ui/              # Reusable MD3 components (Button, Card, Form elements, Notifications).
    └── pages/
        ├── Home.tsx         # Main landing page.
        └── ContactUs.tsx    # Contact form page.
```

## Global Layout Architecture
The application uses standard `react-router-dom` routing. All pages are rendered within a global `<Layout />` wrapper which provides:
1. **Auto-hiding Navbar**: A sticky `<Navbar />` that listens to scroll direction. It hides when scrolling down to maximize reading space and reappears when scrolling up.
2. **Global Footer**: A `<Footer />` consistently applied at the bottom of every page.
3. **Notification Provider**: Root-level state for triggering MD3-compliant toast notifications from any page or component.

## Design Tokens

### Color Palette (Light Mode - Purple Seed `#6750A4`)
Defined in `tailwind.config.js`.

- **`md-background`** (`#FFFBFE`): Slightly warm off-white for the main app background.
- **`md-on-surface`** (`#1C1B1F`): Near-black with slight warmth for primary text.
- **`md-primary`** (`#6750A4`): Rich purple used for CTAs and focus states.
- **`md-on-primary`** (`#FFFFFF`): Pure white text on primary backgrounds.
- **`md-secondary-container`** (`#E8DEF8`): Light lavender tint for secondary surfaces.
- **`md-on-secondary-container`** (`#1D192B`): Dark text for secondary surfaces.
- **`md-tertiary`** (`#7D5260`): Complementary mauve used for FABs and accents.
- **`md-surface-container`** (`#F3EDF7`): Tinted surface used for cards.
- **`md-surface-container-low`** (`#E7E0EC`): Muted surface for inputs and recessed areas.
- **`md-outline`** (`#79747E`): Medium gray for borders.
- **`md-on-surface-variant`** (`#49454F`): For secondary text and icons.

### Typography
- **Font Family**: Roboto (imported via Google Fonts).
- Headings use medium (500) and bold (700) weights for friendly impact.
- Body text uses regular (400) weight for optimal readability.

### Border Radius
Defined in `tailwind.config.js`. Used to create organic, generous rounding.
- `xs` (8px), `sm` (12px), `md` (16px)
- `lg` (24px): Standard card radius.
- `xl` (28px), `2xl` (32px)
- `3xl` (48px): Hero sections and major containers.
- `full` (9999px): Pill-shaped buttons and chips.

### Motion and Easing
- **`md-bouncy`** (Standard Interactive Easing): `cubic-bezier(0.34, 1.56, 0.64, 1)` provides a soft, organic bouncy effect typical of Material 3's expressive state layers. This is the global standard applied to all hover, click (`active`), and loading transitions across UI components.
- **`md-emphasized`**: `cubic-bezier(0.2, 0, 0, 1)` provides smooth, confident movement for major layout shifts. Standard duration is `300ms`.

### Interactive States
- **Hover/Active**: All interactive components (Buttons, Cards, Checkboxes, Switches) use `ease-md-bouncy` for scaling (`active:scale-95`) and opacity shifts to feel tactile and playful.
- **Loading**: Submit buttons implement a loading state (`isLoading` prop) with an SVG spinner. Forms use this to simulate network requests (e.g. 1.5s delay) to provide a premium processing feel before showing notifications.

## Key Components

### 1. Button (`Button.tsx`)
- Pill-shaped (`rounded-full`) across all standard variants.
- Floating Action Button (FAB) variant uses `rounded-2xl` (28px).
- Uses state layers (opacity modifications) for hover and active states instead of hard color changes.
- Implements `active:scale-95` for tactile click feedback.

### 2. Card (`Card.tsx`)
- Large `24px` border radius.
- Background uses `md-surface-container` instead of pure white.
- Supports an `interactive` prop that enables hover elevation (`shadow-sm` to `shadow-md`), background highlighting, and slight scaling (`hover:scale-[1.02]`).

### 3. Input (`Input.tsx` and Form Elements)
- Represents the Material 3 Filled Text Field.
- Rounded top corners (`12px`) and square bottom corners.
- Uses `md-surface-container-low` for background fill.
- Bottom border transitions to `md-primary` on focus.
- **Form System Expansion**: Includes `Textarea`, `Checkbox`, `RadioGroup`, `Select`, and `Switch`. All follow the same Material 3 principles with generous touch targets, subtle background fills, and smooth `md-emphasized` transitions. 

### 4. Notification System (`NotificationSystem.tsx`)
- Provides stacked toast notifications globally.
- Slides in from the right with a bounce effect and fades out after 3 seconds.
- Adheres to minimalist principles by avoiding harsh high-contrast colors, using soft pastel variations:
  - **Success**: Soft green (`md-success`) background with dark green text.
  - **Error**: Soft red (`md-error`) background with dark red text.
  - **General/Warning**: Soft yellow (`md-warning`) background with dark brown text.

## Usage Guidelines
1. **Never use pure white backgrounds**: Always utilize the `md-background` or `md-surface-container` colors to maintain the tonal relationship.
2. **Layering Strategy**: Combine cards with `md-blur-shape` utilities behind them to create atmospheric depth.
3. **Interactive Grouping**: Use Tailwind's `group` and `group-hover:` utility classes to coordinate animations on interactive elements.
4. **Consistency**: Do not mix border radii paradigms; stick to the generous, organic shaping characteristic of Material You.
5. **Button Variants**: Use `combined` for primary CTAs requiring a gradient, and `animated-primary` for subtle attention-grabbing without aggressive movement.
