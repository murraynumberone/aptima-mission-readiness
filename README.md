# Mission Readiness

> Concept project by Derick Murray. All data is fictional.

A dashboard for reviewing a team training exercise. An instructor can see who needs attention, ask why, replay the exercise on a timeline, and write debrief notes with a review status. It is built for high-stress use: large readable text, status never shown by color alone, and every animation switched off for people who ask for reduced motion.

## Run it

Requires Node 22 and pnpm 10.

```sh
pnpm install
pnpm dev          # http://localhost:5173
```

| Command                             | What it does                                                                        |
| ----------------------------------- | ----------------------------------------------------------------------------------- |
| `pnpm build`                        | Type-check and production build                                                     |
| `pnpm build:site`                   | The app plus Storybook at `/storybook`, ready to host                               |
| `pnpm test`                         | Unit and component tests (Vitest, Testing Library, axe)                             |
| `pnpm e2e`                          | Browser tests (Playwright, axe). First run: `pnpm exec playwright install chromium` |
| `pnpm e2e:prod`                     | The same browser tests against the production build                                 |
| `pnpm storybook`                    | Component library at http://localhost:6006                                          |
| `pnpm lint`                         | ESLint, including accessibility rules                                               |
| `pnpm format` / `pnpm format:check` | Prettier, with Tailwind class and import sorting                                    |
| `pnpm typecheck`                    | TypeScript across all packages, the browser tests and the Playwright config         |

## What to try

1. Press **Play**, or drag the timeline or the chart. The label beside the clock says whether you are looking at **Live** data, **Paused**, or a **Replay** and how far behind live. The chart, metrics, events and attention banner all follow one clock.
2. Click **Why attention?** on an operator for the causes, then jump to the moment that caused one.
3. Click **Add note**. The notes sheet opens without moving the timeline. Set a review status, save, edit, delete, export as Markdown.
4. **Copy link** and open it elsewhere. It reopens at the same moment and operator.
5. Switch between **Day**, **Ops** and **Night** from the top bar. Night has a brightness control under **Display**.
6. Turn on reduced motion in your OS and reload. Nothing animates.

## Stack

| Concern               | Choice                                             |
| --------------------- | -------------------------------------------------- |
| Monorepo              | pnpm workspaces and Turborepo                      |
| App                   | React 19, TypeScript, Vite                         |
| Styling               | Tailwind v4 on shared design tokens (three themes) |
| Accessible primitives | Base UI (slider, popover, tooltip, collapsible)    |
| Data loading          | TanStack Query                                     |
| Charts                | Visx                                               |
| Icons and motion      | Lucide, Motion                                     |
| Type                  | Atkinson Hyperlegible Next and Mono                |
| Tests                 | Vitest, Testing Library, Playwright, axe-core      |

## Layout

```
apps/web          The dashboard
packages/tokens   Design tokens: colors per theme, type, radius, with a contrast check
packages/ui       Component library: Button, Textarea, StatusBadge, ReviewBadge, SegmentedControl, shared styles
e2e               Browser tests
docs              Design notes and decision records
```

## How it works

- **One clock.** A small framework-free store holds the current moment. Components read it through selectors, so each one re-renders only when its own value changes.
- **Derived, not stored.** Metrics, the attention list and the explanations are computed from the clock and the data, so nothing can disagree.
- **Synthetic data.** A seeded generator builds the exercise, so it is identical every time. TanStack Query loads it through `loadRun`, with loading and error states. The `Run` type is the contract; a request to a real source would replace the body of `loadRun`.
- **Notes** are saved in the browser per exercise. The address carries the moment and operator for sharing.

## Adding another app

This is a pnpm and Turborepo workspace, so a second app (an Angular instructor console, for example) would be a new folder under `apps/`. There is no Angular app here today.

- **Reusable now:** `packages/tokens` is plain CSS variables, so any framework can use the themes.
- **Reusable after a move:** the clock, notes store, metrics, explanations, formatting and data model contain no React. They live in `apps/web/src/lib` and `apps/web/src/data`, and would move into a shared `packages/core` first.
- **Not reusable:** `packages/ui` and the feature components are React.

## Accessibility

WCAG 2.2 AA is the target. Contrast is checked by script for every theme (`pnpm --filter @mission-readiness/tokens check`), axe runs on all three themes and on every Storybook story, and the browser tests cover keyboard paths, focus, reduced motion and layout.

## Docs

- [Design notes](docs/design.md): users, flows, decisions and what to test with real users

## Known limits

- Data is generated, not live. The exercise restarts on each load, so shared links cannot point past 18:00.
- Notes live in the browser only. A server would need author identity and conflict handling.
- Larger teams would need sorting, filtering, row virtualization and chart downsampling.
- No usability testing yet. The decisions are reasoned, not measured.
- The main bundle is 180 kB gzipped. Code splitting is the first fix.
- No CI is configured yet.
