---
target: dashboard shell (nav + mobile)
total_score: 23
max_score: 36
na_heuristics: 9
p0_count: 0
p1_count: 3
timestamp: 2026-08-08T10-37-30Z
slug: src-app-dashboard-layout-tsx
---
Method: dual-agent (A: general-purpose design review · B: general-purpose detector+browser evidence)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3/4 | Desktop active state has 3 redundant cues; mobile active state relies on color alone, so status visibility degrades on the surface most users hit first |
| 2 | Match System / Real World | 3/4 | Studio/Clients/Money/Inventory groupings fit an artist's mental model; "Exhibitions" filed under "Clients" is a mismatch — a gallery isn't a customer |
| 3 | User Control and Freedom | 3/4 | Logout reachable everywhere, mobile Clients sheet is dismissible; flat 2-level nav doesn't need breadcrumbs |
| 4 | Consistency and Standards | 2/4 | Sidebar wordmark "Studio" sits directly above a nav group also labeled "STUDIO" — internal naming collision; active-state visual weight differs between desktop and mobile |
| 5 | Error Prevention | 3/4 | Recent fail-soft hardening (`if (!Icon) return null`, guarded lookups) prevents crashes on missing nav data |
| 6 | Recognition Rather Than Recall | 4/4 | Persistent sidebar on desktop, icon+label pairing (never icon-only) on mobile |
| 7 | Flexibility and Efficiency | 1/4 | No collapse/customization; 3 of 8 destinations sit one extra tap deep on mobile; no shortcuts |
| 8 | Aesthetic and Minimalist Design | 3/4 | Clean and token-compliant, undercut by the redundant "Studio"/"STUDIO" label noise |
| 9 | Error Recovery | n/a | Shell has no fallible operations beyond logout/navigation; no error states to evaluate |
| 10 | Help and Documentation | 1/4 | Zero help affordance or onboarding hint anywhere in the persistent chrome |
| **Total** | | **23/36** | **Acceptable (64%)** |

## Design Specificity Verdict

**LLM assessment**: Partially specific, unevenly so. The information architecture is genuinely authored for this domain — `NAV_GROUPS` in `nav-links.tsx` groups items as Studio / Clients / Money / Inventory, real artist-business categories rather than generic "Home / Team / Settings." That's a deliberate act of domain modeling. But the visual and iconographic language is fully generic: stock Lucide icons with no visual reference to painting, exhibitions, or craft, rendered in plain sans-serif on an unadorned white sidebar. Strip the text labels and this shell is indistinguishable from a freight dashboard or generic CRM. The taxonomy is specific; the expression is template-default.

**Deterministic scan**: The static CLI detector (`detect.mjs` against `src/app/(dashboard)`) returned a clean exit code 0 with zero findings — but this reflects the engine's capability, not a clean shell. Its regex/text-based checks can't see computed styles. The browser-injected detector, which does have computed-style access, found what the static scan couldn't: **13 anti-patterns on desktop, 8 on mobile**, almost entirely low-contrast text:
- Sidebar section labels (STUDIO/CLIENTS/MONEY/INVENTORY, `#a5a5a5` on white): **2.5:1**, need 4.5:1 — the worst violation found, and desktop-only (these labels don't render on mobile).
- Active sidebar nav-link text (`#0068f9` on `#e6f0ff` cobalt-wash): **4.2:1**, need 4.5:1 — a near-miss, not a false positive; `font-medium` at 14px doesn't qualify for the WCAG large-text exception.
- Secondary body copy (`#777c86` on white, `text-slate-gray`): **4.2:1**, need 4.5:1 — 7 instances on both desktop and mobile, meaning this one is the most pervasive and appears throughout the dashboard content, not just chrome.
- One advisory-only `overused-font` flag (single typeface at 100%) — correctly not treated as a defect; a single consistent typeface is the system's stated design intent (DESIGN.md).

**Visual overlays**: Overlay injection succeeded in Assessment B's session (now closed; no `[Human]` tab persists since the live-server used for injection was stopped after evidence was captured, per the skill's cleanup requirement). The most actionable independent visual finding, not caught by the detector at all: **a fixed circular account-avatar button overlaps the "Dashboard" bottom-tab-bar item at mobile width**, clipping its icon and partially covering its label — confirmed on two routes (`/dashboard`, `/customers`), so it's a persistent layout defect, not a one-off render glitch. The same avatar element sits cleanly beside "Log out" at the bottom of the desktop sidebar with no overlap — the collision is specific to the mobile bottom-tab-bar layout.

## Overall Impression

The dashboard shell's bones are right — a real, artist-specific taxonomy (Studio/Clients/Money/Inventory), a token-compliant desktop active state, and recent engineering care (fail-soft nav lookups) that shows the mobile work was taken seriously. But the execution has cracks that undercut all of that: pervasive sub-threshold text contrast that both assessments independently flagged from different angles (LLM design opinion and computed-style measurement), a genuinely confusing "Studio" over "STUDIO" label stack at the very top of the screen, and a hard visual bug — the account avatar physically overlapping the Dashboard tab on mobile, the single most-used entry point in the app. The biggest opportunity: this shell is one focused pass away from being solid, not a redesign away.

## What's Working

- **Domain-true IA**: grouping by Studio/Clients/Money/Inventory (`nav-links.tsx` lines 9–33) is a real modeling decision that fits how a working artist thinks about their business, confirmed live — navigating to `/customers` correctly highlights the right group on both desktop and the condensed mobile "Clients" tab.
- **Desktop active-state craft**: the background-wash + cobalt text + 2px left-bar combination matches DESIGN.md's spec exactly and gives three redundant, scannable cues for "you are here" — verified live on `/customers`.
- **Fail-soft mobile nav data**: `bottom-tab-bar.tsx`'s `if (!Icon) return null` and guarded group lookups mean a renamed route degrades gracefully instead of crashing — recent, deliberate hardening that both the source review and the detector's clean regex-scan result are consistent with.

## Priority Issues

**[P1] Body and secondary text fails WCAG contrast in seven places, on every screen**
Why it matters: `text-slate-gray` (`#777c86` on white) measures 4.2:1 against the required 4.5:1 — confirmed independently by the browser-injected detector on both desktop and mobile, at 7 instances each. This is card metadata, secondary copy, and helper text throughout the dashboard, not an isolated element — a low-vision user hits this on every page inside the shell.
Fix: Darken `--color-slate-gray` (or its Tailwind token) by roughly one step so 14–16px text clears 4.5:1; re-run the detector to confirm before shipping.
Suggested command: $impeccable harden

**[P1] Mobile bottom-tab active state is color-only**
Why it matters: `bottom-tab-bar.tsx` toggles only `text-electric-cobalt` vs `text-ink-charcoal` for active/inactive tabs — no background tint, fill, or indicator bar, unlike the desktop treatment's three redundant cues. On the primary nav surface for a colorblind or low-vision user (and the surface most people will actually use, given mobile-first usage patterns), this is a real "meaning conveyed by color alone" gap.
Fix: Add a background tint or a small top-edge indicator bar under the active tab, mirroring the desktop left-bar language so mobile isn't a degraded copy of desktop's accessibility.
Suggested command: $impeccable harden

**[P1] Account avatar overlaps the Dashboard tab on mobile**
Why it matters: confirmed via live browser inspection on two routes — a fixed circular avatar button clips the "Dashboard" icon and partially covers its label at mobile width. This is the single most likely tab to be tapped by a returning user, and it's visually broken.
Fix: Reposition the avatar/account control off the tab bar's z-index path at mobile widths, or move it into the bottom-tab-bar's own layout so it can't float over content.
Suggested command: $impeccable adapt

**[P2] Sidebar section-label contrast is the worst violation found (2.5:1)**
Why it matters: `#a5a5a5` on white for STUDIO/CLIENTS/MONEY/INVENTORY labels is roughly half the required contrast — legible on a quick glance but genuinely strained, and desktop-only (this markup doesn't render on mobile at all, confirmed by its absence from the mobile detector run).
Fix: Move these labels to `--color-slate-gray` or darker; they're structural wayfinding text, not decorative captions, and shouldn't be the faintest text in the shell.
Suggested command: $impeccable harden

**[P2] "Studio" wordmark directly above a "STUDIO" nav-group label**
Why it matters: `layout.tsx`'s sidebar wordmark and `nav-links.tsx`'s first group label read as "Studio › Studio" stacked at the very top of every screen — the first thing a first-time user (Jordan) sees, before they've done anything else, is an internally inconsistent label.
Fix: Rename the nav group (e.g. "Work") or repurpose the wordmark as a home link distinct from the group label beneath it.
Suggested command: $impeccable clarify

## Persona Red Flags

**Jordan (First-Timer)**: Lands on an all-zeros dashboard with no first-run guidance built into the persistent shell, and the very first thing above the fold is the "Studio"/"STUDIO" duplicate-label collision — a confusing note to open on before they've clicked anything.

**Sam (Accessibility-Dependent)**: Hits two independently-confirmed contrast failures on every screen (slate-gray secondary text at 4.2:1, sidebar labels at 2.5:1) and a color-only active state on the mobile tab bar — three separate ways this shell falls short of WCAG AA on the exact elements a low-vision user depends on for wayfinding. The `<aside>` in `layout.tsx` also carries no `aria-label` marking it as primary navigation for screen-reader landmark jumps.

**Casey (Mobile)**: Three of the busiest destinations (Customers, Commissions, Exhibitions) require an extra tap into a sheet at exactly the width where thumb ergonomics reward fewer taps, the active tab is harder to visually confirm at a glance (color-only), and — concretely — their thumb's most natural target, the Dashboard tab, is partly obscured by the account avatar.

## Minor Observations

- `NAV_GROUPS` is a shared single source of truth for both desktop and mobile nav — good hygiene that keeps the two layouts' taxonomy from drifting apart, even though it doesn't fix the visual-consistency gaps between them.
- `TAB_ICONS` keys against raw href strings; a renamed route silently drops its icon via the fail-soft guard — safe from crashing, but a broken mapping vanishes a nav destination with zero visible signal to anyone.
- The bottom tab bar shows 5 simultaneous choices at 375–500px, at the edge of the cognitive-load guideline (≤4 visible options per decision point).
- Computed urgency (`isCommissionAtRisk`/`isCommissionOverdue`) exists in `dashboard/page.tsx` but never surfaces as a badge on the nav itself — a user has to already be on the dashboard to discover something needs attention.
- The detector's `overused-font` flag (single typeface at 100%) is advisory noise here, not a defect — DESIGN.md explicitly commits to one typeface system-wide.

## Questions to Consider

- If every text label were stripped from this shell, would it still read as built for artists, or could it be relabeled for freight logistics without touching a single icon?
- The backend already knows which commissions are at-risk or overdue — why does none of that urgency reach the one piece of UI visible from every screen in the app?
- Is "Studio" appearing twice at the top of the sidebar an intentional branding echo, or a leftover from a group that used to have a different name?
