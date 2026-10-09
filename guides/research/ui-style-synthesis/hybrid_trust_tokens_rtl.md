# Cross-cutting foundations for merging eight UI styles (hybrid systems, trust, tokens, Persian/RTL, a11y)

Research date: 2026-10-09. Source dates are noted where known. Items marked "[not re-verified this session]" are well-established facts stated from prior knowledge and given a canonical URL. They were not fetched in this session, so the report writer should treat them as lower confidence.

## 1. How do mature design systems separate "expressive" (marketing) from "productive" (app) surfaces under one token set, and how should styles be mixed?

### Takeaway
The best-documented model is IBM Carbon. It has one token set with two parallel "modes": productive and expressive. The modes apply to typography (01 vs 02 type sets, fixed vs fluid headings) and to motion (separate easing curves that share the same duration tokens). The mode you pick depends on the task context, not on which page the user is on, and productive and expressive moments can appear on the same site. Material 3 Expressive (May 2025) is Google's research-backed case for adding more shape, colour, size and motion. Its evidence comes from Google itself and has not been independently replicated.

### Cited Findings
- **Carbon typography modes.** Productive uses body and supporting styles with the `01` suffix plus fixed headings, for example `body-compact-01` with `heading-compact-01`. Expressive uses the `02` suffix, adds fluid headings that scale across breakpoints, and pairs `body-02` with `heading-02`. — [Carbon: Type style strategies](https://carbondesignsystem.com/guidelines/typography/style-strategies/)
- **When to use each mode.** Productive is for focused, task-driven work with inputs, forms and controls, where space efficiency matters and success is measured by task time and abandonment. Expressive is for learning, exploring, scanning and long-form reading, driven by imagery and layout, and measured by click-through and purchases. — [Carbon: Type style strategies](https://carbondesignsystem.com/guidelines/typography/style-strategies/)
- **Mixing modes on one site.** Carbon blends the modes on IBM.com. Productive moments appear in the mega menu, search, tabs and filter panels. Expressive moments appear in product home pages and banners where content "isn't confined to containers". Type styles should stay consistent within a single component or task. — [Carbon: Type style strategies](https://carbondesignsystem.com/guidelines/typography/style-strategies/)
- **Carbon motion modes.** Productive motion is "efficient and responsive, yet subtle and unobtrusive" and suits button states, dropdowns and data tables. Expressive motion is "lively and highly visible" and is reserved for occasional significant moments such as page opens, primary actions and system alerts. — [Carbon: Motion overview](https://carbondesignsystem.com/elements/motion/overview/)
- **Carbon duration tokens (shared by both modes).**

  | Token | Value | Typical use |
  |---|---|---|
  | `duration-fast-01` | 70ms | Button and toggle micro-interactions |
  | `duration-fast-02` | 110ms | Fades |
  | `duration-moderate-01` | 150ms | Small expansions |
  | `duration-moderate-02` | 240ms | Expansions and toasts |
  | `duration-slow-01` | 400ms | Large expansions |
  | `duration-slow-02` | 700ms | Background dimming |

  — [Carbon: Motion](https://carbondesignsystem.com/elements/motion/overview/)
- **Carbon easing (cubic-bezier), productive vs expressive.** Standard is (0.2,0,0.38,0.9) vs (0.4,0.14,0.3,1). Entrance is (0,0,0.38,0.9) vs (0,0,0.3,1). Exit is (0.2,0,1,0.9) vs (0.4,0.14,1,1). — [Carbon: Motion](https://carbondesignsystem.com/elements/motion/overview/)
- **Material 3 Expressive research base.** Google reported 46 research studies with more than 18,000 participants. Methods included eye-tracking, surveys, usability tests and focus groups. The project started from a 2022 question about why so many apps looked alike. — [9to5Google (May 2025)](https://9to5google.com/?p=671309); [Synechron summary](https://www.synechron.com/insight/direction-design-2025)
- **Claimed Material 3 Expressive effects.** In eye-tracking, users found key or tappable elements up to 4x faster in expressive layouts. Older users performed as well as younger users. Expressive versions were rated more "energetic/creative/friendly", and 87% of younger users preferred them. These numbers are Google-reported, come from press coverage, and have no independent replication. — [Phandroid, 2025-05-13](https://phandroid.com/2025/05/13/material-3-expressive-makes-google-apps-feel-less-robotic/)
- **Neubrutalism in 2026.** A 2026 trends roundup says neubrutalism is "cooling as a full-page style", although bold CTA buttons inside conventional layouts still work. The same roundup calls bento grids the default for feature sections, with roughly 6 to 9 tiles before a grid feels crowded. This is blog opinion, not research. — [ThePlusAddons, Web design trends 2026](https://theplusaddons.com/blog/web-design-trends-2026/)
- **Neubrutalism guidance and caveats.** daisyUI's trend guide advises keeping "navigation and task flow conventional beneath an irregular modular grid". — [daisyUI trends: neubrutalism](https://trends.daisyui.com/trend/neubrutalism/). Neubrutalism's high contrast can aid legibility, but the style "is not appropriate for every use-case". — [UX Collective](https://uxdesign.cc/why-im-excited-about-the-neubrutalism-style-in-web-design-4ab800c2bb80)
- **Bento grids.** Bento grids segment varied content into distinct areas with a predictable rhythm, which the source argues reduces cognitive load. — [freeCodeCamp: Bento grids](https://www.freecodecamp.org/news/bento-grids-in-web-design/)

### Inferences
- **Token architecture.** The Carbon pattern maps cleanly onto CiviTech. Use one primitive and semantic token set, then switch an "intensity" layer between two levels:
  - **Expressive:** marketing home, blog hero, campaign pages. Use fluid display type, clay/organic shapes, kinetic type and expressive easing.
  - **Productive:** dashboards, intake forms, marketplace listings. Use fixed type, Swiss grid, minimal surfaces and productive easing at 70 to 240ms.
- **Dominant style plus accents.** The eight styles do not need equal weight. A defensible hierarchy is:
  - **Dominant base:** Swiss modernism and minimalism, covering grid, type and restraint.
  - **Surface accents:** soft UI and claymorphism, limited to depth tokens such as shadows and radii.
  - **Bounded expressive accents:** neubrutalism (borders and CTAs) and kinetic/motion. These belong on expressive surfaces only.
  - **Brand mood:** organic/biophilic, through palette, imagery and blob shapes.

  This is an inference from Carbon's split and the trend sources above, not from a published "hybrid" study.
- **Neumorphism risk.** Soft UI and neumorphism are the riskiest of the eight styles for WCAG 1.4.11, because they rely on low-contrast light and dark shadows to define component boundaries. They should be restricted to decorative containers, never to interactive control boundaries (see section 5).

### Gaps
- **Unread official pages.** I did not fetch Polaris, Atlassian, GOV.UK, Stripe or Linear pages in this session. Specifically:
  - Atlassian's "brand vs product" expression guidance
  - GOV.UK's deliberate absence of an expressive mode, with its single restrained style for trust
  - Polaris's admin-only scope
- **Material 3 Expressive specifics.** The m3.material.io pages (for example the shape library of 35 shapes, the motion physics/spring tokens and emphasized type) were not retrieved.
- **No research on mixing.** I found no NN/g or peer-reviewed study on mixing several visual styles. Hybrid-style "evidence" is mostly trend blogs.

## 2. Trust signals in civic, government, fintech and insurance UX

### Takeaway
Visual polish strongly drives first-impression credibility for lay users, while experts weight substance. NN/g's four trust factors are design quality, upfront disclosure, correct and current content, and connection to the wider web. For insurance intake and marketplaces, the most actionable of these is upfront disclosure: prices, fees, contact details and no gated content.

### Cited Findings
- **Stanford / Consumer WebWatch study (2002).** 2,684 consumers evaluated 100 sites across 10 categories. 46.1% of comments cited the "design look" when judging credibility, and 28.5% cited information design or structure. B.J. Fogg summarised the result as "To look good is to be good." — [ClickZ / InternetNews report on the Stanford study](https://clickz.com/study-for-site-cred-looks-matter/56564/); [InternetNews](https://internetnews.com/marketing/study-for-site-cred-looks-matter)
- **Expert companion study.** 15 health and finance experts gave more credibility to sites with unbiased information from reputable sources, named and credentialed authors, and citations. Consumer WebWatch warned that consumers were "frequently distracted by superficial aspects". — [ClickZ](https://clickz.com/study-for-site-cred-looks-matter/56564/)
- **NN/g's four trustworthiness factors** (Harley, 2016-05-08; framework from Nielsen, 1999):
  1. Design quality: professional look, organised navigation, clear labels, no typos or broken links.
  2. Upfront disclosure: contact details, base costs and fees disclosed early; no login walls or gated content.
  3. Comprehensive, correct and current content.
  4. Connection to the rest of the web: reviews, social media and news coverage.

  — [NN/g: Trustworthiness in Web Design](https://www.nngroup.com/articles/trustworthy-design/)
- **NN/g study evidence** (2016, Singapore):
  - A participant abandoned a service after 35 seconds because rates were not stated.
  - Forcing an address form before any content created a negative impression.
  - Portfolios showing only large or idealised jobs raised doubts about service fit.
  - Every participant would read third-party reviews before hiring.
  - Western and Asian participants weighed the same core factors.

  — [NN/g](https://www.nngroup.com/articles/trustworthy-design/)
- **Aesthetic preference.** Four of five NN/g participants preferred one site over a competitor because of its imagery, fonts, colours and white space. — [NN/g](https://www.nngroup.com/articles/trustworthy-design/)

### Inferences
- **What the evidence supports for CiviTech:**
  - Show fees and statuses explicitly, with no hidden costs, in insurance intake, consultation booking and marketplace offers.
  - Make the address, phone and legal-entity information easy to find.
  - Don't gate browsing behind login.
  - Use real photography of real people and processes rather than only idealised outcomes.
  - Surface external validation such as reviews, press and certifications.
- **Where to put playful styles.** Because lay users judge credibility from visual polish, the playful styles (clay, neubrutalism, kinetic) need disciplined execution. They belong where they signal energy, such as marketing, community and blog, and not in money, insurance or identity flows. In those flows, restraint, consistency and status transparency are the trust levers. This is consistent with Carbon's productive/expressive split.
- **Iran-specific context.** Users on filtered connections experience slow-loading or broken assets as "broken links", which hurts NN/g's design-quality factor. Performance therefore is itself a trust signal.

### Gaps
- **Stanford guidelines page unreachable.** The official Stanford Web Credibility guidelines page (credibility.stanford.edu/guidelines) returned a connection error, so the ten guidelines are not quoted here.
- **Aesthetic-usability effect.** Kurosu & Kashimura 1995 and Tractinsky 1997/2000 were not retrieved, nor was NN/g's article on the effect.
- **Sector-specific trust research.** No sector-specific research on government, fintech or insurance trust was retrieved, such as GOV.UK's rationale for its plain style, studies on verification badges, or the Baymard trust-seal studies.

## 3. Design-system engineering practice, 2025–2026

### Takeaway
The W3C Design Tokens Community Group (DTCG) format reached its first stable version (2025.10) on 2025-10-28. It natively supports theming via a Resolver module and OKLCH and other CSS Color 4 spaces. Tailwind v4's `@theme` stores tokens as CSS custom properties, and its default palette is defined in oklch. OKLCH and relative colour syntax are now cross-browser. APCA is not part of WCAG 3's current draft, so WCAG 2.x ratios remain the compliance bar.

### Cited Findings
- **DTCG stable release.** DTCG released the first stable spec, "Design Tokens Format Module 2025.10", on 2025-10-28. It consists of three modules: Format, Color and Resolver. It covers theming (light/dark, accessibility variants, brand themes), Display P3, OKLCH and all CSS Color 4 spaces, plus aliases, inheritance and component-level references. — [W3C DTCG announcement](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/); [Format Module 2025.10 final report](https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/); [designtokens.org](https://designtokens.org/)
- **DTCG status.** The DTCG format is a Community Group report. It is not a W3C Standard and not on the Standards Track, although the group describes it as stable for production use. — [designtokens.org FAQ](https://www.designtokens.org/faq/)
- **Tailwind v4 `@theme` basics.**
  - Theme variables in `@theme` generate utilities: `--color-mint-500` produces `bg-mint-500`, `text-mint-500` and so on.
  - They also emit plain CSS variables.
  - They must be top-level, not nested under selectors or media queries.
  - Use `:root` for variables that should not generate utilities.

  — [Tailwind docs: Theme variables](https://tailwindcss.com/docs/theme)
- **Tailwind v4 namespaces and overrides.**
  - Namespaces include `--color-*`, `--font-*`, `--breakpoint-*`, `--spacing-*`, `--radius-*`, `--shadow-*` and `--ease-*`.
  - `--color-*: initial` resets a namespace; `--*: initial` resets everything.
  - `@theme inline` inlines referenced variables, which is the pattern for semantic tokens that point to runtime-switchable variables.
  - `@theme static` emits all variables.
  - Theme files can be shared via `@import`.

  — [Tailwind docs: Theme](https://tailwindcss.com/docs/theme)
- **Tailwind default palette.** The default palette is defined in OKLCH, for example `--color-red-500: oklch(63.7% 0.237 25.331)`, with neutrals at zero chroma. — [Tailwind docs: Theme](https://tailwindcss.com/docs/theme)
- **Browser support for OKLCH.** `oklch()` is Baseline "widely available" (since May 2023, per MDN). — [MDN oklch()](https://developer.mozilla.org/docs/Web/CSS/color_value/oklch)
- **Relative colour syntax.** Relative colour syntax, for example `oklch(from var(--brand) calc(l + 0.1) c h)`, became Baseline 2024 "newly available". Reported support is Chrome 119+, Firefox 120+ and Safari 16.4+. These version numbers come from secondary sources, so verify them on MDN. — [MDN oklch (relative syntax)](https://developer.mozilla.org/docs/Web/CSS/color_value/oklch); [OpenReplay guide](https://blog.openreplay.com/es/css-sintaxis-color-relativo/)
- **Relative colour feature detection.** Feature-detect with `@supports (color: rgb(from white r g b))` and declare a fallback first. — [OpenReplay](https://blog.openreplay.com/es/css-sintaxis-color-relativo/)
- **APCA status.** APCA was removed from the WCAG 3 working draft in July 2023. As of an April 2026 review, the WCAG 3 contrast section says the algorithm is "yet to be determined". WCAG 2.2 ratios remain the compliance standard, and APCA can be used only as a supplementary design aid. — [Adrian Roselli, "WCAG3 Contrast as of April 2026"](https://adrianroselli.com/2026/04/wcag3-contrast-as-of-april-2026.html); [Univ. of Bath digital blog](https://blogs.bath.ac.uk/digital-content-and-development/?p=430)
- **Conflicting claims about APCA.** Some 2026 developer references wrongly say APCA is "currently part of the WCAG 3 draft". Roselli's dated review contradicts this. — [Roselli](https://adrianroselli.com/2026/04/wcag3-contrast-as-of-april-2026.html)
- **Standard CSS features, Baseline across evergreen browsers [not re-verified this session]:**
  - `color-mix()`, Baseline 2023 — [MDN color-mix](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix)
  - Container size queries (`@container`), Baseline 2023 — [MDN container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_size_and_style_queries)
  - Logical properties such as `margin-inline-start`, `padding-inline` and `inset-inline-start` — [MDN logical properties](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_logical_properties_and_values)
  - The `prefers-reduced-motion`, `prefers-contrast` and `forced-colors` media queries — [MDN prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion); [MDN forced-colors](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors)

### Inferences
- **Recommended token pipeline:**
  1. **Primitives:** an OKLCH ramp with tokens such as `--p-green-50…950`.
  2. **Semantic tokens:** `--color-surface`, `--color-on-surface`, `--color-accent`, `--color-border-strong`. These are defined on `:root` and `[data-theme=dark]` / `[data-density=compact]`.
  3. **Tailwind exposure:** semantic tokens are exposed to Tailwind via `@theme inline { --color-surface: var(--surface); }`.
  4. **Component tokens:** only where needed, for example button shadow and radius per style layer.

  The DTCG 2025.10 JSON can be the source of truth if the team wants tooling (for example Style Dictionary) and multi-platform output. For a web-only stack, CSS-first `@theme` is sufficient.
- **OKLCH perceptual uniformity.** Because OKLCH is perceptually uniform, tonal ramps with consistent lightness steps make it easier to hit WCAG ratios predictably. Every pair must still be verified with the WCAG 2 formula.
- **Clay and soft-UI shadows in dark mode.** Relative colour syntax and `color-mix()` let one accent token derive hover, pressed, subtle-background and shadow tints. This matters for clay and soft-UI shadows, which must be re-derived for dark mode rather than inverted.
- **Density modes.** Comfortable and compact density can be implemented as a `[data-density]` attribute that swaps spacing and type-step semantic tokens. This follows Carbon's productive/expressive analogy.

### Gaps
- **Unverified Baseline statuses.** The current (October 2026) Baseline tier of relative colour syntax was not verified. The statuses of `color-mix()` and container queries above come from prior knowledge, not from this session.
- **Tailwind docs not retrieved.** Tailwind v4's dark-mode, `@custom-variant` and `rtl:`/`ltr:` variant docs, and its logical utilities (`ms-*`, `ps-*`, `start-*`), were not retrieved.
- **Other articles not retrieved.** The Evil Martians OKLCH article was not retrieved, and there is no fluid-type `clamp()` source in this session.

## 4. Persian/RTL typography and layout

### Takeaway
Vazirmatn is the maintained, OFL-licensed successor to Vazir. It ships in static and variable builds plus variants (Non-Latin, Round-Dots, and UI and Farsi-Digits builds per packaging). Persian text needs taller line-height than Latin and no letter-spacing, because tracking can break joins and ligatures depending on the font. Mirror directional UI, but never mirror media playback controls, clockwise or clock icons, or numbers. Use `Intl.DateTimeFormat` with `calendar: 'persian'` and `numberingSystem: 'arabext'` or `'latn'` for Jalali dates.

### Cited Findings
- **Vazirmatn licensing, build and CDN.**
  - Licensed under SIL OFL 1.1.
  - Weights other than Thin, Regular and Black are interpolated with fontmake.
  - A variable-font CSS file (`Vazirmatn-Variable-font-face.css`) is provided.
  - The default build pairs Vazirmatn with Roboto for Latin text.
  - A Non-Latin build (no Latin glyphs) and a Round-Dots build exist.
  - The pinned CDN form is `cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css`, where v33.003 is the current version referenced.

  — [GitHub rastikerdar/vazirmatn](https://github.com/rastikerdar/vazirmatn); [Guix font-vazir 33.003](https://packages.guix.gnu.org/packages/font-vazir/33.003)
- **Vazirmatn variants per packaging.** Variants include UI, Round-Dots and Farsi-Digits. Fedora and Debian also package a variable build. — [Algolia/Vazirmatn repo summary](https://docsearch.algolia.com/mcp/docs/repo/rastikerdar/vazirmatn); [Fedora wiki](https://fedoraproject.org/wiki/Vazirmatn_fonts); [Debian fonts-vazirmatn-variable](https://packages.debian.org/tr/trixie/fonts-vazirmatn-variable)
- **Saber Rastikerdar.** He authored Vazir/Vazirmatn, Sahel, Shabnam and Parastoo, and died in November 2023. This matters for maintenance risk. — [Wikipedia: Saber Rastikerdar](https://en.wikipedia.org/wiki/Saber_Rastikerdar)
- **Alternative open-source faces:**
  - **Estedad** (Amin Abedi), a sans-serif Arabic-Latin text typeface, OFL. — [AUR estedad-fonts](https://aur.archlinux.org/packages/estedad-fonts-git); [Launchpad fonts-estedad](https://launchpad.net/fonts-estedad)
  - **Sahel**, 5 weights, based on DejaVu Sans with Latin from Roboto, OFL. — [npm sahel-font](https://www.npmjs.com/package/sahel-font)
  - **Shabnam**, v5.0.0, based on Vazir, OFL. — [Shabnam README](https://cdn.jsdelivr.net/npm/shabnam-font@5.0.0/README.md)
- **Persian numerals.** Persian requires Extended Arabic-Indic digits (U+06F0–U+06F9), which differ from Western digits (U+0030–U+0039). Persian baseline and ascender ratios differ from Latin, and a Latin web font produced uneven line heights in mixed-direction text (W3C i18n list, 2025). — [W3C public-i18n-translation, 2025](https://lists.w3.org/Archives/Public/public-i18n-translation/2025AprJun/0009.html)
- **Letter-spacing on Arabic script.** Letter-spacing can break Arabic-script ligatures, for example lam-meem in Tahoma while lam-alif survived. Behaviour varies by font and browser because letter-spacing is applied per glyph. Proposals suggested extending connections (tatweel-like) instead. — [W3C www-style thread, Feb 2014](https://lists.w3.org/Archives/Public/www-style/2014Feb/0476.html); [Aharon Lanin, www-style](https://lists.w3.org/Archives/Public/www-style/2014Feb/0547.html)
- **Persian typography practice:**
  - Use fonts with full joining tables (initial, medial and final forms).
  - Open up line spacing beyond Latin needs.
  - Use the half-space (ZWNJ, U+200C) correctly.
  - Avoid tatweel to fill width.
  - Avoid two-margin justification, because browsers widen word spaces.

  — [rgb.ir Persian typography lesson](https://rgb.ir/en/learn/graphic-design/persian-typography/)
- **W3C alreq.** The W3C Arabic & Persian Layout Requirements (Group Note, 2023-12-12) is the authoritative reference for justification, joining and bidi layout. — [W3C alreq 2023](https://www.w3.org/TR/2023/DNOTE-alreq-20231212/)
- **Mirroring rules from Material Design bidirectionality guidance:**
  - **Do not mirror:**
    - media playback and progress controls, which represent tape direction, not time
    - clock and clockwise refresh/progress icons
    - numbers such as clock faces and phone numbers
    - icons that don't communicate direction
  - **Mirror:** volume (speaker plus slider), though Apple does not mirror volume.

  — [Material Design bidirectionality (M1)](https://m1.material.io/usability/bidirectionality.html); [M2 bidirectionality](https://m2.material.io/go/design-bidirectionality); [mdui mirror of Material guidance](https://www.mdui.org/en/design/1/usability/bidirectionality.html)
- **Wikimedia Codex on check icons.** Wikimedia Codex advises mirroring icons containing check symbols. This is Wikimedia's own guidance and is not stated by Material. — [Wikimedia Codex bidirectionality](https://doc.wikimedia.org/codex/v2.3.2/style-guide/bidirectionality.html)
- **Jalali dates with `Intl`.**
  - `Intl.DateTimeFormat` supports `calendar: 'persian'` (or locale extension `-u-ca-persian`) and `numberingSystem` values `arabext` (Persian digits) and `latn`.
  - Example: `new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-arabext', {...})`.
  - Check `resolvedOptions()` to see the runtime defaults.

  — [lingo.dev: calendar/numbering systems](https://lingo.dev/en/javascript-i18n/check-locale-calendar-numbering-system); [lingo.dev: non-Gregorian calendars](https://lingo.dev/en/javascript-i18n/format-dates-calendar-systems)

### Inferences
- **Typeface choice.** Use Vazirmatn variable as the single family to minimise requests and bytes for low-end Android on slow networks.
  - Subset it, consider the Non-Latin build plus a deliberately chosen Latin face, and use `font-display: swap`.
  - For digits, prefer controlling them in data via `Intl` with `nu-arabext`, rather than relying on a font variant swap. That keeps copy-paste and screen readers consistent.
  - The Farsi-Digits build can be used for surfaces that render raw digits.
- **Persian body text settings:**
  - line-height about 1.7 to 1.9 for body. This is a common practitioner range; no authoritative number was found, and alreq/rgb.ir only say "taller than Latin".
  - `letter-spacing: 0`.
  - No `text-transform: uppercase` or small caps; Arabic script has no case, so these only affect embedded Latin.
  - Kinetic-typography effects that animate tracking or split letters into per-glyph spans will break joining. Kinetic effects must animate whole words or lines.
- **Neubrutalism and bold display type.** These need Persian-appropriate weights; Vazirmatn's Black weight is available.
- **RTL CSS.** Use logical properties throughout, with `dir="rtl"` on `<html>` and `dir="auto"` / `<bdi>` for user-generated mixed text such as book titles and usernames in marketplaces. Directional motion (slide-in, kinetic marquee, progress shimmer) should follow inline-start/end, not left/right.

### Gaps
- **Vazirmatn digit features.** I could not confirm whether the Vazirmatn variable font exposes Persian digits via an OpenType feature (for example `ss01` or `locl`). The README content retrieved did not document it.
- **Unverified fonts.** IRANSansX (commercial, FontIran) and Peyda licensing and metrics could not be verified from reliable sources.
- **Material 3 RTL page.** The current m3.material.io bidirectionality page did not render via fetch, so the mirroring rules above are from M1/M2-era guidance.
- **Line-height source.** No authoritative published source gives the "1.7–1.9" Persian line-height number.

## 5. Accessibility baseline for the merged style (WCAG 2.2 AA plus regional requirements)

### Takeaway
WCAG 2.2 is a W3C Recommendation (current edition dated 2024-12-12). The criteria most at risk from these aesthetics are:
- **1.4.3 text contrast (4.5:1):** at risk from soft UI and pastel clay.
- **1.4.11 non-text contrast (3:1):** at risk from neumorphic control boundaries.
- **2.4.7 focus visible and 2.4.11 focus not obscured:** at risk from sticky headers and kinetic overlays.
- **2.4.13 focus appearance (AAA):** a good target.
- **2.5.8 target size (24×24 CSS px minimum):** relevant to dense dashboards.

Iran has no identified enforceable web accessibility law.

### Cited Findings
- **WCAG 2.2 normative text and edition:**
  - **1.4.3:** text contrast ≥ 4.5:1 (with exceptions).
  - **1.4.11:** UI components and graphical objects ≥ 3:1 against adjacent colours.
  - **2.4.7:** the keyboard focus indicator is visible.
  - **2.4.11 Focus Not Obscured (Minimum):** a focused component "is not entirely hidden due to author-created content".
  - **2.4.13 Focus Appearance:** requires that the indicator area "has a contrast ratio of at least 3:1 between the same pixels in the focused and unfocused states".
  - The edition date given is 12 December 2024.

  — [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- **Additional WCAG 2.2 details [not re-verified this session]:**
  - WCAG 2.2 was first published as a Recommendation on 2023-10-05.
  - 2.5.8 Target Size (Minimum, AA) requires targets of at least 24×24 CSS px, or sufficient spacing, with exceptions.
  - 2.4.13 (AAA) also requires the indicator area to be at least as large as a 2 CSS px thick perimeter of the component.

  — [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/); [Understanding 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- **APCA.** APCA cannot be used for compliance; WCAG 2 ratios take priority where the two disagree. — [Univ. of Bath](https://blogs.bath.ac.uk/digital-content-and-development/?p=430); [Roselli 2026](https://adrianroselli.com/2026/04/wcag3-contrast-as-of-april-2026.html)
- **Iran:**
  - A 2022 ACM paper (Nourian, Shinohara, Tigwell) found insufficient focus on accessibility in Iran's regulations, and no G3ict digital accessibility reporting for Iran. — [RIT repository (paper PDF)](https://www.rit.edu/academicaffairs/facultyscholarship/submit/download_file.php?id=126140)
  - Iran's UN mission states that a National Coordination and Follow-up Headquarters for Accessibility Adaptation drafted national cyberspace accessibility standards for visual and hearing impairments. This is a government claim, and its status and enforcement are unverified. — [Iran Mission to UN](https://newyork.mfa.gov.ir/portal/PrintNews/747626)
  - A thesis found a gap between Iranian government web accessibility and international levels. — [FUM library record](https://libsearch.um.ac.ir/fum/handle/fum/3368649?show=full)
  - HRW (2018) documented broad inaccessibility for people with disabilities in Iran. — [HRW report](https://backend.hrw.org/sites/default/files/report_pdf/iran0618_web_1.pdf)

### Inferences
- **Style-specific guardrails for the merged style:**
  - **Neumorphic and soft-UI controls:** every interactive boundary (input border, toggle track, button edge) must reach 3:1 against its adjacent colour. Shadow-only affordances fail 1.4.11.
  - **Claymorphism pastels:** text on clay surfaces must reach 4.5:1. Pastel fills generally need dark ink, not white.
  - **Neubrutalism:** its thick borders and hard shadows help 1.4.11 and focus visibility. Its solid 2 to 3px outline idiom can double as the system-wide focus ring, which would meet 2.4.13 AAA.
  - **Kinetic and motion:** respect `prefers-reduced-motion`, falling back to opacity or none. Avoid auto-moving content longer than 5 seconds without a pause control (SC 2.2.2 [not re-verified]). Do not let sticky bars or animated overlays cover focused elements (2.4.11).
  - **Forced-colors mode:** shadows (clay, soft UI) and background-only states vanish in forced-colors mode. Components need real borders or outlines (transparent borders are acceptable) so they survive Windows High Contrast mode.
  - **Dense dashboards:** in the compact density mode, keep targets at or above 24×24 CSS px (2.5.8).
- **Recommended compliance target.** With no binding Iranian standard identified, WCAG 2.2 AA (plus 2.4.13 AAA as an internal target) is the defensible baseline, and it is consistent with international expectations.

### Gaps
- **Iranian standards text.** The text or number of any ISIRI or national cyberspace accessibility standard was not found. A Persian-language search of the Headquarters' or ISIRI's publications would be needed.
- **Unfetched Understanding documents.** The Understanding documents for 1.4.11, 2.4.11 and 2.5.8 were not fetched in full this session.
