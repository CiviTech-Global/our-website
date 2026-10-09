# Motion-driven design and Kinetic design / kinetic typography — fact base for CiviTech Global

Scope: two related styles, treated separately where they differ.
- **Motion-driven design (MD)**: motion as a first-class layer of UI (transitions, micro-interactions, choreography, scroll-linked effects).
- **Kinetic design / kinetic typography (KT)**: type that moves, morphs or reacts to scroll.
Context: Persian-first (RTL, Vazir/Vazirmatn), React 19 + Vite + Tailwind v4, marketing site + marketplaces + intake forms + dense dashboards; many users on mid/low-end Android and slow connections. Research date: 2026-10-09. Source dates are given where known.

---

## 1. Origins and principles

### Takeaway
MD comes from classical animation principles (Disney's 12, adapted selectively) and was codified by design systems: IBM Carbon splits motion into **productive** (fast, subtle, task-focused) and **expressive** (vivid, occasional), and Material 3 publishes easing/duration tokens and (since M3 Expressive, Google I/O 2025) spring-physics tokens. KT descends from Saul Bass's 1950s film title sequences; variable fonts are its modern web engine (Vazirmatn ships a variable `wght` 100–900 axis).

### Cited Findings
**Disney's 12 principles applied to UI (practitioner sources, not primary)**
- Easing ("slow in / slow out") is the most-cited principle for UI; guides advise against linear timing for interface transitions because real objects accelerate/decelerate — [IxDF](https://ixdf.org/literature/article/ui-animation-how-to-apply-disney-s-12-principles-of-animation-to-ui-design); [Dribbble stories, 2020](https://dribbble.com/stories/2020/07/27/disney-principles-of-animation-ui-interactions)
- Anticipation in UI = hover/pressed states signalling that something will happen; staging = choreographing where elements sit and move so attention goes to the intended element — [Marvel blog](https://blog.marvelapp.com/disneys-motion-principles-in-designing-interface-animations/); [IxDF](https://ixdf.org/literature/article/ui-animation-how-to-apply-disney-s-12-principles-of-animation-to-ui-design)
- Practitioners note the 12 principles were designed for character animation and should be adapted selectively, not wholesale — [Living Proof Creative](https://livingproofcreative.com/blog/what-disneys-classic-animation-principles-could-teach-web-designers/)

**IBM Carbon motion (productive vs expressive)** — [Carbon motion overview](https://carbondesignsystem.com/elements/motion/overview/)
- Productive motion "creates a sense of efficiency and responsiveness, while remaining subtle and out of the way"; for task focus: button states, dropdowns, revealing info, **rendering data tables and visualizations**.
- Expressive motion "delivers enthusiastic, vibrant, and highly visible movement"; for significant moments: opening a new page, primary action, system alerts/notifications. "Reserve expressive motion for occasional, important moments." Productive is significantly faster than expressive.
- Duration tokens: `duration-fast-01` 70ms (button/toggle), `fast-02` 110ms (fade), `moderate-01` 150ms (small expansion, short movement), `moderate-02` 240ms (expansion, toast), `slow-01` 400ms (large expansion, important notification), `slow-02` 700ms (background dimming). Duration should scale with distance/size of change.
- Easing: Standard productive `cubic-bezier(0.2, 0, 0.38, 0.9)` / expressive `cubic-bezier(0.4, 0.14, 0.3, 1)`; Entrance productive `cubic-bezier(0, 0, 0.38, 0.9)` / expressive `cubic-bezier(0, 0, 0.3, 1)`; Exit productive `cubic-bezier(0.2, 0, 1, 0.9)` / expressive `cubic-bezier(0.4, 0.14, 1, 1)`. Elements that leave but stay nearby (side panel) use standard easing.
- Micro-interactions use ease-out on user input; Carbon's checklist says 90–120ms (note: differs slightly from the token table). Carbon also says to consider simplified/reduced motion on mobile and tablet.

**Material 3 tokens** — [material-components-android Motion.md](https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md)
- Easing: Standard `cubic-bezier(0.2, 0, 0, 1)`; Standard decelerate `(0, 0, 0, 1)`; Standard accelerate `(0.3, 0, 1, 1)`; Emphasized = path curve (not expressible as one cubic-bezier); Emphasized decelerate `(0.05, 0.7, 0.1, 1)`; Emphasized accelerate `(0.3, 0, 0.8, 0.15)`.
- Durations: Short1–4 = 50/100/150/200ms; Medium1–4 = 250/300/350/400ms; Long1–4 = 450/500/550/600ms; ExtraLong1–4 = 700/800/900/1000ms.
- Spring tokens (damping ratio / stiffness): FastSpatial 0.9/1400 (switches, buttons position/size); FastEffects 1/3800 (small-component colour/opacity); DefaultSpatial 0.9/700 (bottom sheets, nav drawers); DefaultEffects 1/1600; SlowSpatial 0.9/300 (full-screen movement); SlowEffects 1/800. Key idea: **spatial** springs (position/size) may slightly overshoot (damping 0.9); **effects** springs (colour/opacity) are critically damped (1.0) — no bounce.
- M3 Expressive was announced at Google I/O 2025 with a spring-based `MotionScheme` with "standard" and "expressive" variants (Jetpack Compose) — [community Compose guide summary](https://skills.sh/fumiya-kume/toy-poodle-love/m3-expressive); [pub.dev material_expressive](https://pub.dev/documentation/material_expressive/0.8.0/). Official m3.material.io pages did not render for fetching; exact expressive-scheme values unverified.

**Apple HIG motion** — [Apple HIG: Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
- Page did not render for fetching; widely-known guidance (purposeful motion, brevity, honour Reduce Motion by substituting crossfades for sliding/zooming/parallax) could not be quoted verbatim — see Gaps.

**Kinetic typography roots**
- Before Saul Bass, titles were generally static and often projected on cinema curtains; Bass designed title sequences for Hitchcock (*Vertigo* 1958 with John Whitney's custom equipment, *North by Northwest* 1959, *Psycho*), "inventing a new type of kinetic typography" — [Wikipedia: Saul Bass](https://en.wikipedia.org/wiki/Saul_Bass); [Print magazine](https://www.printmag.com/history/when-saul-bass-met-hitchcock/)
- *North by Northwest* is "often credited as being the first sequence to use kinetic type" and an early example of situational type (text matched to environment perspective) — [Art of the Title](https://www.artofthetitle.com/title/north-by-northwest). "First" is an attribution claim; safer to call Bass a leading pioneer.
- Bass's 1960 *Graphis* article "Film Titles – a New Field for the Graphic Designer" — [Wikipedia: Saul Bass](https://en.wikipedia.org/wiki/Saul_Bass)

**Variable fonts for KT (Persian)**
- Vazirmatn (successor to Vazir, by Saber Rastikerdar) ships a variable build `Vazirmatn[wght].ttf`, single axis weight 100–900; static weights other than Thin/Regular/Black are interpolated — [Vazirmatn README](https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@32.0.0/README.md); [Debian package](https://packages.debian.org/tr/trixie/fonts-vazirmatn-variable); [Fontsource](https://fontsource.org/fonts/vazirmatn/cdn)

### Inferences
- Carbon's productive/expressive split maps directly onto CiviTech: dashboards/forms/tables = productive; marketing hero, onboarding, successful submission = expressive (sparingly).
- Since Vazirmatn's only axis is `wght`, Persian kinetic type is limited to weight-morphing (no width/slant/optical-size axes) unless another typeface is introduced. Animating `font-variation-settings`/`font-weight` triggers layout/paint (not compositor) — use only for small, short, non-repeating moments.

### Gaps
- Official M3 Expressive spring values for the "expressive" vs "standard" scheme and Google's research claims about it (m3.material.io is JS-rendered; not retrieved).
- Apple HIG motion verbatim text not retrieved.

---

## 2. Defining traits

### Takeaway
MD: purposeful transitions, continuity (shared-element), micro-interactions, spring physics, stagger/choreography, scroll-linked effects — each with a functional job (orient, give feedback, show relationships). KT: type that reveals, scales, morphs weight, follows paths or reacts to scroll; meaning is carried partly by motion.

### Cited Findings
- Carbon: motion type chosen by purpose (productive vs expressive); durations scale with distance/size; separate entrance/exit/standard curves — [Carbon](https://carbondesignsystem.com/elements/motion/overview/)
- Material spring tokens separate spatial vs effects motion and size tiers (fast/default/slow ~ small component / partial screen / full screen) — [Material Motion.md](https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md)
- Shared-element / continuity: Motion's `layoutId` animates between different elements; `layout` animates size/position/reorder via transforms — [Motion for React docs](https://motion.dev/docs/react); View Transitions `view-transition-name` gives the browser-native equivalent — [Chrome blog](https://developer.chrome.com/blog/view-transitions-update-io24)
- Entering elements should take slightly longer than exiting (e.g., 300ms in, 200–250ms out) — [NN/g, 2020](https://www.nngroup.com/articles/animation-duration/)
- KT in brand: Spotify Wrapped treats motion as "a core part of that experience" with a yearly motion system built by in-house team + studio partners (Hornet/Vucko), with bold sans-serif statements turning user data into animated copy — [It's Nice That, 2022](https://www.itsnicethat.com/features/spotify-wrapped-campaign-identity-2022-graphic-design-301122); [The Brand Identity, 2023](https://the-brandidentity.com/interview/raw-playful-and-laced-with-a-chaotic-energy-we-dive-into-the-making-of-spotify-wrapped-2023)
- KT Persian example: a line morphing through letters of خوش, briefly becoming abstract — [Framer community / vendor example via search](https://www.framer.com/community/posts/XLYzCtPVdM4AU4mFCUKu1F/); academic: [HEAD Genève, F. Harik, "Arabic letter-forms in motion" (2020)](https://www.hesge.ch/head/issue/en/publications/arabic-letter-forms-motion-francois-harik)

### Inferences
- "Data as kinetic copy" (Wrapped pattern) could suit a civic platform's annual/impact reports (e.g., "X requests handled this year") on marketing pages — but not in working dashboards.

### Gaps
- No primary research quantifying stagger timing best practice was retrieved.

---

## 3. Implementation techniques (2025–2026)

### Takeaway
A React 19 + Tailwind v4 stack can do almost all productive motion with native CSS: transitions with tokenised durations/easings, `@starting-style` (Baseline 2024) for enter/exit, `linear()` (Baseline Dec 2023) for spring-like curves, same-document View Transitions (Baseline Newly available Oct 2025). Scroll-driven animations (`animation-timeline`) are **not Baseline**: Chrome 115+, Safari 26+, Samsung Internet 23+, Firefox only from 160 per caniuse (~88% global). Motion (ex-Framer Motion) is the React library for springs/layout/shared-element.

### Cited Findings
**View Transitions API**
- Same-document: Chrome/Edge 111, Safari 18, Firefox 144 (stable 14 Oct 2025) → **Baseline Newly available** (Oct 2025); Firefox 144 also covers `view-transition-class`, `match-element`, `:active-view-transition`, all `::view-transition-*` pseudo-elements; part of Interop 2025 — [web.dev, 16 Oct 2025](https://web.dev/blog/same-document-view-transitions-are-now-baseline-newly-available); [Chrome blog 2025 update](https://developer.chrome.com/blog/view-transitions-in-2025). (Note: web.dev Oct roundup lists Chrome/Edge 125 for the full feature set incl. classes — [web.dev](https://web.dev/blog/web-platform-10-2025).)
- Cross-document (MPA) transitions: Chrome/Edge 126, Safari 18.2, **not Firefox**; opt-in with `@view-transition { navigation: auto; }` on both same-origin pages; `pageswap`/`pagereveal` events; types via `@view-transition { types: ... }` and `:active-view-transition-type()` — [Chrome blog, I/O 2024](https://developer.chrome.com/blog/view-transitions-update-io24)
- View transition types (e.g., forward/back) Chrome 125, Firefox 144, Safari 18 — [Chrome blog](https://developer.chrome.com/blog/view-transitions-update-io24)

**Scroll-driven animations**
- `animation-timeline: scroll()` support: Chrome 115+, Safari 26.0+, Samsung Internet 23+, Firefox 160+; global usage 87.84% — [caniuse](https://caniuse.com/mdn-css_properties_animation-timeline_scroll)
- MDN: "Limited availability … not Baseline"; examples gate with `@supports (animation-timeline: scroll())` — [MDN animation-timeline](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline)
- Separate newer `animation-trigger` (scroll-*triggered*) is Chrome/Edge 146+ only; as of Aug 2026 not in Safari 26.6 or Firefox 154 — [ICS Media](https://ics.media/en/entry/230718/)
- Overview/how-to: [Chrome for Developers: scroll-driven animations](https://developer.chrome.com/docs/css-ui/scroll-driven-animations)

**Easing & enter/exit**
- `linear()` is Baseline 2023 (since Dec 2023); allows approximating spring/bounce curves in pure CSS; generate with the Linear Easing Generator (has Spring preset) or Easing Wizard (stiffness/damping/mass) — [MDN linear()](https://developer.mozilla.org/en-US/docs/Web/CSS/easing-function/linear); [Chrome: linear()](https://developer.chrome.com/docs/css-ui/css-linear-easing-function); [Josh Comeau](https://joshwcomeau.com/animation/linear-timing-function)
- `@starting-style` Baseline 2024 (Aug 2024); gives "from" values for transitions on first render or `display:none`→visible; for exit, transition `display` and `overlay` with `transition-behavior: allow-discrete`; applies to transitions only, not keyframe animations; useful for popovers and `<dialog>` — [MDN @starting-style](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style)

**Motion (Framer Motion) for React**
- `npm install motion`, import from `motion/react`; "previously Framer Motion"; runs on WAAPI and ScrollTimeline natively for hardware-accelerated 120fps, falling back to JS for things like springs; physical props (`x`, `scale`) use springs by default, `opacity` uses tweens; `layout` and `layoutId` for layout/shared-element animation; tree-shakable — [motion.dev docs](https://motion.dev/docs/react)

**Performance rules**
- Animate `transform` and `opacity` only where possible (stay on the compositor); avoid `top`/`left` and any property that triggers layout or paint; use `will-change` sparingly — only when you see issues, add before change and remove after — [web.dev animations guide (updated 2020-10-06)](https://web.dev/articles/animations-guide)

**Motion tokens**
- Both Carbon and Material ship motion as tokens (duration + easing, Material also springs), and Carbon recommends calling curves through a package (`motion(standard, productive)`) so they stay updated — [Carbon](https://carbondesignsystem.com/elements/motion/overview/); [Material Motion.md](https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md)

### Inferences
- Firefox release cadence (144 in Oct 2025; 154 cited as current-ish in Aug 2026 by ICS Media) implies Firefox 160 is not yet stable in Oct 2026 — so scroll-driven animations must be treated as progressive enhancement behind `@supports`.
- Tailwind v4's CSS-first `@theme` is a natural home for motion tokens (`--ease-*`, custom `--duration-*` variables) alongside a `motion-reduce:` variant; this lets most motion stay CSS-only and keep Motion (JS) out of the critical bundle for low-end devices (inference; Tailwind docs not fetched here).
- Same-document View Transitions are a good fit for SPA route changes in a React app; cross-document is irrelevant if the site is SPA, and Firefox lacks it anyway.

### Gaps
- INP (Interaction to Next Paint) impact of JS-driven animation on main thread: no source retrieved; general knowledge says long JS work during interaction worsens INP — unverified here.
- Motion library bundle size (kB) for `LazyMotion`/`m` components and its `useReducedMotion` / `MotionConfig reducedMotion="user"` API not confirmed from fetched page.

---

## 4. Documented strengths

### Takeaway
Well-timed motion aids comprehension (what changed, where it went), gives immediate feedback, keeps orientation across view changes, and adds brand delight; NN/g puts useful durations at ~100–500ms, mostly 100–400ms.

### Cited Findings
- NN/g (Page Laubheimer, 9 Feb 2020): general range 100–500ms; ~100ms for simple feedback (checkbox, toggle) feels immediate, like physical manipulation; 200–300ms for substantial changes like a modal; 400ms only for large movements on large screens; ~500ms "feels like a drag"; "It is far more common for animations to be too long than too short"; the more frequent the animation, the shorter/subtler — [NN/g](https://www.nngroup.com/articles/animation-duration/)
- Carbon: productive motion "creates a sense of efficiency and responsiveness" — [Carbon](https://carbondesignsystem.com/elements/motion/overview/)
- KT: Spotify treats motion as core because Wrapped is mostly digital and shareable; robust toolkit maintained for global partners to keep integrity — [It's Nice That](https://www.itsnicethat.com/features/spotify-wrapped-campaign-identity-2022-graphic-design-301122)

### Inferences
- Perceived-performance benefit (skeletons/progressive reveal) is plausible for slow Iranian connections, but no study was retrieved here.

### Gaps
- No quantitative study of comprehension/conversion lift from UI animation was retrieved; NN/g microinteraction article not fetched.

---

## 5. Documented weaknesses and risks

### Takeaway
Motion can make people with vestibular disorders ill, distract, and cost performance. WCAG requires pause/stop for auto-moving content (2.2.2, A), ≤3 flashes/second (2.3.1, A), and at AAA (2.3.3) that interaction-triggered motion can be disabled — implemented via `prefers-reduced-motion`. For Persian KT, per-letter splitting breaks cursive joining: there is no CSS fix.

### Cited Findings
**Accessibility**
- SC 2.3.3 Animation from Interactions (**AAA**): "Motion animation triggered by interaction can be disabled, unless the animation is essential…"; vestibular disorders → dizziness, nausea, headaches, sometimes needing rest; scroll-triggered motion and parallax cited; techniques C39 (CSS `prefers-reduced-motion`), SCR40 (JS check), or a site setting — [W3C Understanding 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)
- SC 2.2.2 Pause, Stop, Hide (**A**): moving/blinking/scrolling content that starts automatically, lasts >5s and is shown alongside other content needs a pause/stop/hide mechanism; auto-updating content has no 5-second exception — [W3C Understanding 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)
- SC 2.3.1 (A): no more than three general flashes in any one-second period (or below threshold) — [W3C Understanding 2.2.2 (references 2.3.1)](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)
- NN/g: parallax, auto-advancing carousels and scroll-jacking can cause dizziness, nausea, migraines; respect "reduce motion" by removing animations — [NN/g](https://www.nngroup.com/articles/animation-duration/)

**Distraction/repetition**
- Long animations become "very likely to be annoying with repetition"; frequent animations should be shorter — [NN/g](https://www.nngroup.com/articles/animation-duration/); Carbon: reserve expressive motion for occasional moments — [Carbon](https://carbondesignsystem.com/elements/motion/overview/)

**Performance**
- Non-transform/opacity animations trigger layout/paint and are unlikely to stay smooth — [web.dev](https://web.dev/articles/animations-guide); Carbon recommends simplified motion on mobile/tablet — [Carbon](https://carbondesignsystem.com/elements/motion/overview/)

**Persian / Arabic-script kinetic type**
- Per-letter animation wraps each character in its own element, which breaks cursive joining and turns connected words into isolated letterforms; "not a styling problem and there is no CSS that fixes it" — [Framer community post](https://www.framer.com/community/posts/XLYzCtPVdM4AU4mFCUKu1F/); [Framer Shape-Safe Text Kit](https://www.framer.com/marketplace/components/shape-safe-text-kit/) (vendor source)
- Workarounds keep the shaped line intact: animate a CSS mask over unsplit text; move cropped slices of the fully shaped line; typewriter by growing one string rather than appending spans — [Shape-Safe Reveal](https://www.framer.com/marketplace/components/shape-safe-reveal/); [Shape-Safe Text Kit](https://www.framer.com/marketplace/components/shape-safe-text-kit/) (vendor marketing; unverified)
- ZWNJ marks Persian half-space (e.g., می‌رود); ZWJ/ZWNJ control joining but no source shows them restoring joins across split spans; invisible joiners also affect string comparison/search — [unicodefyi ZWNJ glossary](https://unicodefyi.com/ar/glossary/zwnj/)

### Inferences
- Safe Persian KT units: **word or phrase** (split on spaces, keep ZWNJ half-spaces inside the word token), line-level masks/clip-path reveals, weight morphs on whole words. Never per-character spans, never letter-spacing animation (tracking breaks Persian; kashida is the script-correct stretch).
- Given low-end Android prevalence, default should be CSS-only, transform/opacity, short durations, and no scroll-linked effects in task flows.

### Gaps
- No Iranian device/connection statistics retrieved in this pass (other researchers may cover).
- Val Head's motion-accessibility writing not retrieved.
- No empirical study of kinetic-type legibility in Arabic script found.

---

## 6. Dashboards (productive) vs marketing (expressive)

### Takeaway
IBM Carbon gives the clearest documented split: productive motion for task UIs, explicitly including data tables and visualisations; expressive for page openings, primary actions and alerts, used occasionally. KT belongs only to expressive surfaces.

### Cited Findings
- Productive examples: button states, dropdowns, revealing info, rendering data tables/visualizations; expressive: opening pages, primary action, system alerts — [Carbon](https://carbondesignsystem.com/elements/motion/overview/)
- Productive token range 70–240ms; expressive/large 400ms; dimming 700ms — [Carbon](https://carbondesignsystem.com/elements/motion/overview/)
- Frequent animations should be shorter and subtler — [NN/g](https://www.nngroup.com/articles/animation-duration/)
- Material spring "effects" tokens are critically damped (no bounce) while "spatial" ones overshoot slightly — [Material Motion.md](https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md)

### Inferences
- Dashboards/admin: 70–150ms state changes, no stagger on table rows beyond the first paint (or none), no bounce, no scroll-linked effects, no KT; sorting/filtering can use a quick view transition or FLIP but must not delay input.
- Marketplace listings and intake/booking flows: productive by default; one expressive moment at success (request submitted / booking confirmed).
- Marketing/blog: expressive allowed — hero KT at word level, scroll-driven reveals behind `@supports` and `prefers-reduced-motion: no-preference`.

### Gaps
- No usability study directly comparing animated vs static data tables was retrieved.

---

## 7. RTL considerations

### Takeaway
Directional motion should follow the reading direction: in RTL, "forward"/enter comes from inline-start (right), progress fills right-to-left, and back/forward page transitions mirror. Non-directional or physical-world motion (clocks, media) is not mirrored.

### Cited Findings
- View transition **types** allow different animations for forward vs backward navigation (e.g., pagination) styled via `:active-view-transition-type()` — [Chrome blog](https://developer.chrome.com/blog/view-transitions-update-io24) — this is the hook for direction-aware (and RTL-aware) slides.

### Inferences
- Write keyframes with logical thinking: e.g., translate by `calc(var(--dir) * 100%)` where `--dir: -1` under `[dir=rtl]`, since `translate` has no logical-axis variant; Tailwind v4 `rtl:`/`ltr:` variants can flip signs.
- Progress bars, steppers (intake/booking flows), carousels, drawer/side-panel origin (inline-start = right in Persian), and swipe-to-dismiss directions must mirror; spinners, clocks and media scrubbers typically do not.

### Gaps
- Material bidirectionality page (m2.material.io) did not render; no authoritative RTL-motion source was successfully retrieved — design team should verify against Material's "Bidirectionality" guidance and Apple's "Right to left" HIG.

---

## 8. Notable products

### Takeaway
Spotify Wrapped is the best-documented kinetic-type brand system; M3 Expressive is the main 2025 design-system shift toward springs. Stripe, Linear, Vercel and Apple are commonly cited for restrained, high-craft motion but no primary documentation was retrieved in this pass.

### Cited Findings
- Spotify Wrapped: yearly motion systems (2021 "dynamic thread"; 2022 departure from structured monogram design; 2023 pixelated, warped, Word-Art-esque early-internet feel), motion toolkits for global partners — [It's Nice That](https://www.itsnicethat.com/features/spotify-wrapped-campaign-identity-2022-graphic-design-301122); [The Brand Identity](https://the-brandidentity.com/interview/raw-playful-and-laced-with-a-chaotic-energy-we-dive-into-the-making-of-spotify-wrapped-2023); [LBB](https://lbbonline.com/work/108461)
- M3 Expressive (I/O 2025) spring motion scheme — [pub.dev material_expressive](https://pub.dev/documentation/material_expressive/0.8.0/) (third-party; not Google)
- Saul Bass title sequences as KT archetype — [Art of the Title](https://www.artofthetitle.com/designer/saul-bass)

### Gaps
- Stripe, Linear, Vercel, Apple motion examples and Awwwards KT examples: not researched with citable sources in this pass.

---

## 9. Borrow vs reject for a trust-oriented, performance-sensitive civic platform

### Takeaway
Borrow the **system** (tokens, productive/expressive split, reduced-motion by default, transform/opacity only, CSS-first) and a few functional patterns; reject decorative scroll effects in task flows, bouncy springs on data, per-letter Persian KT, and any auto-moving content without controls.

### Cited Findings (basis)
- Productive/expressive split and token values — [Carbon](https://carbondesignsystem.com/elements/motion/overview/)
- 100–400ms durations; shorter for frequent animations — [NN/g](https://www.nngroup.com/articles/animation-duration/)
- Reduced-motion techniques C39/SCR40 — [W3C 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html); pause/stop for >5s auto motion — [W3C 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)
- Compositor-only properties — [web.dev](https://web.dev/articles/animations-guide)
- Baseline status: View Transitions same-doc (Oct 2025), `@starting-style` (2024), `linear()` (2023); scroll-driven not Baseline — [web.dev](https://web.dev/blog/same-document-view-transitions-are-now-baseline-newly-available); [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style); [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/easing-function/linear); [caniuse](https://caniuse.com/mdn-css_properties_animation-timeline_scroll)
- Per-letter splitting breaks Arabic-script joining — [Framer community](https://www.framer.com/community/posts/XLYzCtPVdM4AU4mFCUKu1F/)

### Inferences
**Borrow**
- Motion tokens (≈ Carbon productive set: 70/110/150/240ms; 400ms for large panels) + two easing families (productive, expressive) in Tailwind `@theme`.
- Micro-feedback on buttons/toggles/form validation (≤120ms, ease-out); `@starting-style` for dialog/popover/toast enter/exit; same-document View Transitions for route changes and list→detail continuity, mirrored for RTL.
- Critically-damped (no-bounce) springs via `linear()` for UI; reserve slight overshoot for marketing.
- Word-level Persian KT and weight morphs (Vazirmatn wght) on marketing hero/annual-impact pages only.
- Global reduced-motion handling (treat AAA 2.3.3 as a target, crossfade fallbacks) plus a site-level motion toggle.

**Reject / restrict**
- Parallax, scroll-jacking, auto-advancing carousels (or provide pause, per 2.2.2).
- Scroll-linked effects and staggered row choreography in dashboards, tables, and forms.
- Per-character Persian animation, letter-spacing animation, kinetic type in any functional UI copy (labels, legal/insurance text, prices).
- Heavy JS animation libraries on critical paths for low-end Android; load Motion only where shared-layout animation is truly needed.
- Expressive "delight" around money, insurance decisions, or errors — trust contexts favour calm, fast confirmation.

### Gaps
- No user research on Iranian users' attitudes to motion or on trust perception vs animation was found.
