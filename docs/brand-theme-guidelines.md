# Wanderlust Brand & Theme Guidelines

## Brand Pillars
- Premium and calm: Every screen should feel curated, not busy.
- Editorial hierarchy: Use clear typographic contrast to guide scanning.
- Intentional restraint: Prefer clean surfaces and subtle accents over loud gradients.
- Travel-first storytelling: Imagery and copy should feel aspirational and practical.

## Canonical Visual Direction
- Theme: Luxury editorial.
- Primary accent: Champagne gold.
- Base surfaces: Warm light neutrals + charcoal dark neutrals.
- Typography pair: Playfair Display (display) + Lato (body).

## Design Tokens
Source of truth: `/Users/rixinpeng/Documents/GitHub/TravelPlanner-AntiG/app/globals.css`

| Token | Value | Usage |
| --- | --- | --- |
| `--primary` | `#D4AF37` | Primary actions, highlights, key emphasis |
| `--primary-dark` | `#B59230` | Primary hover/pressed states |
| `--background` (light) | `#F9F8F6` | App background |
| `--surface` (light) | `#FFFFFF` | Cards, nav bars, modals |
| `--text` (light) | `#333333` | Main body text |
| `--muted` (light) | `#777777` | Secondary labels and helper text |
| `--accent` (light) | `#E8E4DF` | Borders, soft separators |
| `--background` (dark) | `#1A1A1A` | App background in dark mode |
| `--surface` (dark) | `#262626` | Elevated dark surfaces |
| `--text` (dark) | `#E5E5E5` | Main text in dark mode |
| `--muted` (dark) | `#A3A3A3` | Secondary text in dark mode |
| `--accent` (dark) | `#333333` | Borders and soft fills in dark mode |
| `--font-display` | `Playfair Display` | Headings, major labels |
| `--font-body` | `Lato` | Body copy, controls, metadata |
| `--radius-xl` | `1rem` | Cards and medium containers |
| `--radius-2xl` | `1.5rem` | Modals and hero cards |

## Typography System
- Display text (`h1`-`h6`): `font-display`, high contrast, compact line-height.
- Body text: `font-body`, neutral color, readability-first spacing.
- Do not introduce alternate font families without explicit design sign-off.

## Spacing, Radius, and Elevation
- Use consistent spacing scale via Tailwind utilities (`p-2`, `p-4`, `p-6`, etc.).
- Standard card radius: `rounded-xl`.
- Modal/feature containers: `rounded-2xl`.
- Shadows should remain soft and restrained; avoid heavy glow effects.

## Component Usage Rules
- Buttons:
  - Primary CTA uses `bg-primary`, white text, and `hover:bg-primary-dark`.
  - Secondary buttons use subtle borders (`border-accent`) and neutral text.
- Cards:
  - Always sit on `bg-surface`.
  - Keep border contrast mild (`border-accent`).
- Inputs:
  - Base: `bg-background`, `border-accent`.
  - Focus: `border-primary`.
- Navigation:
  - Preserve clear hierarchy and minimal chroma outside active states.

## Motion Rules
- Motion should communicate state, not decoration.
- Use subtle transitions (`duration-200` to `duration-300`) for color, opacity, and transform.
- Avoid aggressive bounce or exaggerated spring effects in core planning flows.

## Dark Mode Rules
- Keep token mapping through CSS variables; avoid hardcoded dark hex values in components.
- Preserve contrast parity between light and dark modes.
- Gold accents remain the same semantic intent in both modes.

## Accessibility Thresholds
- Meet WCAG AA contrast for text and interactive states.
- Ensure visible keyboard focus for all interactive controls.
- Keep tap targets at least 40px on mobile-heavy surfaces.

## Do / Don’t Examples
- Do:
  - Use existing tokens from `globals.css`.
  - Keep layouts airy and typographically intentional.
  - Use gold accent sparingly for emphasis.
- Don’t:
  - Introduce non-token colors in core UI.
  - Replace fonts with generic/system defaults.
  - Add high-saturation accent palettes that break luxury tone.

## Engineering Enforcement
- Any PR touching UI must pass the UI checklist in `/Users/rixinpeng/Documents/GitHub/TravelPlanner-AntiG/.github/pull_request_template.md`.
- New components should map styles to tokenized classes before review.
- Visual changes should include desktop + mobile screenshots and dark mode proof when affected.
