# Mission Readiness: design notes

A concept dashboard for reviewing a team training exercise. It is a portfolio project, not affiliated with Aptima, Inc. All data is fictional.

## Users and context

- **Instructor (primary).** Watches a live exercise or debriefs a finished one. Needs to know who needs attention, why, and what to discuss. Often under time pressure.
- **Operator (secondary).** Reads their own result in a debrief.

Design bias: read fast and be right the first time, over looking light or decorative.

## Goals

1. Show who needs attention first.
2. Explain every flag in plain words, with a way to jump to the moment that caused it.
3. Let an instructor write debrief notes without losing the timeline.
4. Work for people who cannot rely on color, a mouse, or motion.

## Core flows

1. **Scan.** The attention banner names the operator most below target. Metric tiles and the chart show the team.
2. **Explain.** Selecting an operator opens a panel: why they are flagged, which skill areas are low, and the moments that moved their score. Each moment jumps the timeline.
3. **Replay.** One playback clock drives the chart, metrics, timeline, and event list. Pause, step between events, or return to live.
4. **Debrief.** Add a note at the current moment or an event, set its review status, export all notes as Markdown.
5. **Share.** A link restores the same moment and operator.

## Decisions

| Decision                | Chosen                                                                                                      | Alternative                              | Reason                                                                                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Status encoding         | Shape plus word (outline, half, solid)                                                                      | Color only                               | Works in Night mode and for color-blind users.                                                                                                 |
| Review status           | Neutral color                                                                                               | Status colors                            | Review progress is process, not severity. Reusing severity colors would mislead.                                                               |
| Text size               | 13px minimum, 15px body                                                                                     | Tighter, 12px data                       | Tighter looked cleaner but was harder to read under stress.                                                                                    |
| Themes                  | Day, Ops, Night, plus System                                                                                | Light and dark only                      | Ops is a dim default for control rooms. Night is red-shifted with a brightness control.                                                        |
| Animation               | Small, purposeful, all off under reduced motion                                                             | None, or decorative                      | Motion confirms change (numbers, icon swaps, sheet slide). Pulses stop after two cycles. Nothing runs past 5 seconds without a way to stop it. |
| Time model              | One clock store, selected by primitive values                                                               | State per component                      | Keeps chart, scrubber, and list in step and avoids re-rendering everything each tick.                                                          |
| Notes while playing     | Hold the note's moment when the user starts typing, and show the clock separately                           | Keep following the clock                 | The note's time was changing under the user while they typed. The clock itself keeps running.                                                  |
| Is this the newest data | Always-visible Live, Paused, Replay (with the gap behind live) or Complete beside the clock, icon plus word | Rely on the Go live button being enabled | Old numbers must never read as current. The gap changes only when the user moves, so it is not a live region and does not chatter.             |
| Persistence             | localStorage per exercise                                                                                   | Backend                                  | Out of scope. Guarded for private windows.                                                                                                     |

## Accessibility

- Target WCAG 2.2 AA. Contrast is checked by script for every theme token.
- Every chart has a data table alternative.
- Keyboard: skip link, visible focus ring, no focus hidden behind the floating sheet (2.4.11).
- Status and review state are never color alone.
- `prefers-reduced-motion` turns off all animation, in CSS and in script.
- Automated axe checks run on all three themes and on every Storybook story.

## Design system

- Tokens in `packages/tokens` (colors per theme, type, radius).
- `packages/ui`: Button, Textarea, StatusBadge, ReviewBadge, SegmentedControl, plus shared styles. Documented in Storybook with a theme switcher.
- Panel and label stay as CSS classes because they sit on many different elements.
- A component is extracted when two or more places use it or when it enforces a rule everywhere. One-use components stay in their feature.

## What to test with real users

1. Can an instructor find who needs attention and why, within 10 seconds, without help?
2. Do they trust the explanation, or open the raw data to check?
3. Do they write notes while the clock runs, or pause first? Does holding the note's moment match what they expect?
4. Is 13px data text readable at their real viewing distance and lighting?
5. Is the sheet a fair trade for the timeline staying visible, or do they want a dedicated debrief view?

Method: task-based sessions with a few instructors, timing and observation, then compare against the current design.

## Known limits

- Data is generated, not live. The exercise restarts on each load, so links cannot point past 18:00.
- Notes live in the browser only. A server would need author identity and conflict handling.
- Large teams would need sorting, filtering, row virtualization, and chart downsampling.
- No usability testing yet. The decisions above are reasoned, not measured.
- The main bundle is 180 kB gzipped. Code splitting is the first fix.
