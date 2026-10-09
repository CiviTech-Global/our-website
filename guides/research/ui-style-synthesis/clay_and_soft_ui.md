# Claymorphism and Soft UI (Neumorphism): fact base for the CiviTech Global design language

Scope: two tactile, depth-based UI styles, assessed for a Persian-first (RTL, Vazir) civic-tech platform: marketing site, marketplaces (jobs, freelance, second-hand books, shops), insurance intake, consultation booking, blog, and dense user/admin dashboards. Research date: 2026-10-09. Each source's date is given where known.

Fetch notes: the original UX Collective articles by Malewicz (Medium member-only) could not be fetched (connection resets). Their content below comes from secondary sources that quote them, and is marked that way. I found no NN/g article dedicated to neumorphism or claymorphism. The NN/g evidence used is its eyetracking study on flat-UI signifiers (2017).

## Origins and evolution (2019 to 2026)

### Takeaway
Neumorphism grew out of Alexander Plyuto's Dribbble banking concept (late 2019). Michał Malewicz (HYPE4) popularised and helped name it in a UX Collective article around the turn of 2019/2020, and he was also an early critic. Malewicz later coined "claymorphism" (about 2021) as an "inflated", any-colour successor, and Adrian Bece's Smashing article and clay.css library (2022) gave it its CSS form. By 2026, sources describe neumorphism as largely dead in production software. Claymorphism survives mainly as an accent and illustration style.

### Cited Findings
**Soft UI / Neumorphism**
- Alexander Plyuto "championed and evolved" neumorphic designs on Dribbble. His mobile-banking concept is the canonical example. — [CSS-Tricks, Adrian Bece, 2020-03-20](https://css-tricks.com/neumorphism-and-css/)
- Malewicz built a "new skeuomorphic" prototype live at HYPE4's Do Good Shit conference, then wrote "Neumorphism in user interfaces" on UX Collective. — secondary account via [Built In](https://builtin.com/design-ux/neumorphism-accessibility) / search summaries; original at [uxdesign.cc](https://uxdesign.cc/neumorphism-in-user-interfaces-b47cef3bf3a6) (member-only, not fetched)
- Accounts conflict on who coined the word "neumorphism". Some credit Malewicz directly, and one says it came from commenters on his article (a "neo" + "skeuomorphism" portmanteau). CSS-Tricks says Malewicz "helped coin the term". — [CSS-Tricks 2020](https://css-tricks.com/neumorphism-and-css/); conflict noted in search results incl. [SVGator](https://www.svgator.com/blog/neumorphism-origin-influence-design/)
- "Soft UI" is an alternative name, given "due to its characteristic low contrast". — [IxDF](https://ixdf.org/literature/topics/neumorphism) (undated)
- Malewicz soon wrote "Neumorphism — the zombie trend". Per Creative Bloq, it said many people were talking about the style "but nobody's making any products with it, and yet it refuses to die". — [Creative Bloq](https://www.creativebloq.com/news/neumorphism); original [uxdesign.cc](https://uxdesign.cc/neumorphism-the-zombie-trend-88cff23de46b) (2020, member-only)
- Malewicz is quoted as saying "It works well when it can be removed without any loss for the product." — [CSS-Tricks 2020](https://css-tricks.com/neumorphism-and-css/)
- Status in 2026: "As of 2026 neumorphism lives in two places": concept work and single-purpose instruments. It "mostly died in production software that has to serve everyone." — [Setproduct, Roman Kamushken, 2026-06-26](https://www.setproduct.com/blog/neumorphism-design-guide) (vendor blog; no adoption data cited)
- Smashing (2022) said neumorphism "got visually boring and old pretty quickly" because of its constraints. — [Smashing Magazine, Adrian Bece, 2022-03-16](https://www.smashingmagazine.com/2022/03/claymorphism-css-ui-design-trend/)
- LogRocket still published a how-to guide in May 2025, positioning the style for products that "emulate big tech brands like Apple". — [LogRocket, Allie Paschal, 2025-05-16](https://blog.logrocket.com/ux-design/neumorphism-ui-design)

**Claymorphism**
- The term was coined by Michał Malewicz, who also coined neumorphism. — [Smashing 2022](https://www.smashingmagazine.com/2022/03/claymorphism-css-ui-design-trend/); [clay.css README](https://github.com/codeAdrian/clay.css)
- Malewicz's own article, "Claymorphism in User Interfaces" (HYPE4 Academy, undated on page), defines it as a "fluffy 3d" style, "if you simply inflated your neumorphic shapes". He says it moved into UI from art, illustration and NFTs. He also said it was "not really possible to achieve in CSS just yet" (the full bulging shape) and pointed to a generator at claymorphism.com. — [HYPE4 Academy](https://hype4.academy/articles/design/claymorphism-in-user-interfaces)
- Secondary sources date the coinage to 2021. — [search summary of OpenReplay / ThePlusAddons](https://blog.openreplay.com/implementing-claymorphism-with-css/) (not fetched directly; treat the year as likely, not confirmed)
- Adrian Bece's Smashing article "Claymorphism: Will It Stick Around?" (2022-03-16) and his clay.css utility set the CSS form: two inset shadows plus one outer shadow. — [Smashing 2022](https://www.smashingmagazine.com/2022/03/claymorphism-css-ui-design-trend/); [clay.css](https://github.com/codeAdrian/clay.css)
- In 2024, LogRocket recorded uses for CTAs, chat apps, app icons and avatars, such as the "Toy Faces" 3D avatar series. — [LogRocket, Angela Fabunan, 2024-05-22](https://blog.logrocket.com/ux-design/what-is-claymorphism-web-design/)
- 2026: one overview describes the direction as a "more usable soft UI" that keeps the tactile 3D look without strict neumorphism, and recommends claymorphism for onboarding and friendly products. A Claude agent "claymorphism" design skill with WCAG 2.2 AA checklists existed (103 installs, Aug 2026). — search summaries of [vp0.com 2026](https://vp0.com/blogs/what-is-soft-ui-design) and [tessl.io registry](https://tessl.io/registry/skills/github/bergside/awesome-design-skills/claymorphism) (low-authority sources)

### Inferences
- Both styles are designer-community trends born on Dribbble and Medium, not styles that came from research or shipped design systems. Malewicz both named them and cautioned against using them for interactive controls, a caveat that is often lost.
- The arc from neumorphism to claymorphism to "soft UI hybrids" means fill colour was freed from the background, which removed the core contrast trap. The remaining trade-offs are tone (childlike) and how much visual noise the shadows add.

### Gaps
- Exact publication dates of Malewicz's two UX Collective articles and of Plyuto's Dribbble shot could not be verified (member-only and fetch failures). Commonly cited as late 2019 to early 2020.
- No reliable usage or adoption data for either style in 2025 or 2026.

## Defining visual traits

### Takeaway
**Neumorphism:** element and background share one colour, and depth comes only from a pair of light and dark outer shadows (raised) or inset shadows (pressed) cast from one consistent light source (conventionally top-left). Palettes are near-monochrome greys or pastels with medium radii.

**Claymorphism:** saturated or pastel fills on any background. Large, puffy radii; one outer drop shadow plus two inner shadows (light top-left, dark bottom-right); 3D clay illustrations; minimal typography with strong accent colours.

### Cited Findings
**Neumorphism**
- The element's background must be transparent or match (or nearly match) the surface beneath it. Avoid colours near pure white or black, because the shadows become invisible there. — [CSS-Tricks 2020](https://css-tricks.com/neumorphism-and-css/)
- Malewicz framed it as lifting flat design "with dimension": a minimal palette that keeps a "flat" effect. Elements sit on the background as raised shapes made from a material similar to it. — secondary via [Built In](https://builtin.com/design-ux/neumorphism) (Built In 2020)
- Shadows and highlights must keep the same light-source direction. With light from the top-left, the highlight goes top-left and the shadow bottom-right. — [LogRocket 2025](https://blog.logrocket.com/ux-design/neumorphism-ui-design)
- Surface shape is varied with gradients matched to the light angle. In a convex surface the light section aligns with the light shadow; in a concave surface it aligns with the dark shadow. — [CSS-Tricks 2020](https://css-tricks.com/neumorphism-and-css/)
- Typical tokens: bg `#e0e5ec`, light `#ffffff`, dark `#a3b1c6`, radius 16px, distance 8px, blur 16px. Recommended radii are "restrained 12–20px" with a single accent colour used sparingly. — [Setproduct 2026](https://www.setproduct.com/blog/neumorphism-design-guide)
- Neumorphic elements need more padding and margin because of the shadows and rounded corners. — [CSS-Tricks 2020](https://css-tricks.com/neumorphism-and-css/)
- Motion: press flips extruded to inset, with a ~160ms transition. — [Setproduct 2026](https://www.setproduct.com/blog/neumorphism-design-guide)
- Malewicz's own later description: "mostly flat surfaces with slight concavity", "visually boring in most of the examples". — [HYPE4 Academy](https://hype4.academy/articles/design/claymorphism-in-user-interfaces)

**Claymorphism**
- Shape: start from a rectangle and round the corners "usually beyond 50% roundness". In vector tools, bulge the edges with mirrored mid-side handles for a true "inflated" look. — [HYPE4 Academy](https://hype4.academy/articles/design/claymorphism-in-user-interfaces)
- Depth: one larger outer shadow, often shifted on the X axis (Malewicz notes this "breaks conventional UI shadow rules"), plus two inner shadows: lighter top-left, darker bottom-right. — [HYPE4 Academy](https://hype4.academy/articles/design/claymorphism-in-user-interfaces)
- "Instead of using light and dark outer shadow to achieve the extrusion effect, Claymorphism uses two inner shadows". This "allows for Claymorphism to have any background color, independent of the background." — [Smashing 2022](https://www.smashingmagazine.com/2022/03/claymorphism-css-ui-design-trend/)
- Colour: strong accent colours and good contrast. In dark mode it works only if the shape isn't pure black, because the inner shadows must stay visible. — [HYPE4 Academy](https://hype4.academy/articles/design/claymorphism-in-user-interfaces)
- Interactive elements are brightly or vividly coloured against more subtly coloured backgrounds (e.g. "intense blue-violet"). Outer shadows separate surfaces, and subtle inner shadows suggest thick rounded planes. — [LogRocket 2024](https://blog.logrocket.com/ux-design/what-is-claymorphism-web-design/)
- Typography and illustration: minimal typography, plus 3D clay-like illustrations such as hands, objects and avatars. The style risks a "slightly child-like interface" (Malewicz, quoted). — [Smashing 2022](https://www.smashingmagazine.com/2022/03/claymorphism-css-ui-design-trend/); [LogRocket 2024](https://blog.logrocket.com/ux-design/what-is-claymorphism-web-design/)
- Motion: a scale transform makes a button look "pressed". It should respect reduced-motion preferences. — [Smashing 2022](https://www.smashingmagazine.com/2022/03/claymorphism-css-ui-design-trend/)
- It can merge with glassmorphism: a subtle inner shadow on a "fluffy glassmorphic pane". — [HYPE4 Academy](https://hype4.academy/articles/design/claymorphism-in-user-interfaces)

### Inferences
- Iconography is not specified for either style beyond "3D clay illustration" for claymorphism. Neumorphic icons are typically low-contrast glyphs that sit on or are debossed into the surface, which the contrast failures in the accessibility section below would also affect.

### Gaps
- No authoritative source specifies a typographic system or iconography rules for either style.

## CSS implementation and design tokens

### Takeaway
Both styles are pure `box-shadow` + `border-radius` (+ optional `linear-gradient`). Neumorphism uses 2 outer shadows (or 2 inset shadows when pressed) in colours derived from the background. Claymorphism uses 1 outer + 2 inset shadows and is independent of the background. Both map cleanly to CSS custom-property tokens.

### Cited Findings
- Neumorphism, raised (CSS-Tricks example): `box-shadow: 20px 20px 50px #00d2c6, -30px -30px 60px #00ffff;`. Generalised: `box-shadow: var(--h1) var(--v1) var(--blur1) var(--color-dark), var(--h2) var(--v2) var(--blur2) var(--color-light);`. For a top-left light source, the dark shadow takes positive offsets and the light shadow negative offsets. Pressed = the same shadows with `inset`. Surface gradient: `background: linear-gradient(var(--bg-angle), var(--bg-start), var(--bg-end));`. — [CSS-Tricks 2020](https://css-tricks.com/neumorphism-and-css/)
- Neumorphism token set (2026): `--neu-bg:#e0e5ec; --neu-light:#ffffff; --neu-dark:#a3b1c6; --neu-radius:16px; --neu-distance:8px; --neu-blur:16px`. Pressed state: both shadows switch to `inset`, 6px offset and 12px blur, with a 160ms transition. Dark-mode tokens: `--neu-bg:#2a2d32; --neu-light:#34383e; --neu-dark:#1c1e21`, with the rule that "the highlight is never pure white and the shade is never pure black." — [Setproduct 2026](https://www.setproduct.com/blog/neumorphism-design-guide)
- A subtler "soft UI" segmented-control recipe (given as Figma values). Selected: drop shadow 2/2/4/0 #000 @25%, gradient #F3F6FC→#FFF, 1px #FFF inner stroke, radius 4px. Base track: inner shadow −2/2/4/0 #000 @25%, fill #E4E6EC. — [LogRocket 2025](https://blog.logrocket.com/ux-design/neumorphism-ui-design)
- Claymorphism (Smashing base example):
  ```css
  .box { background: rgb(249,174,1); border-radius: 48px;
    box-shadow: 8px 8px 16px 0 rgba(0,0,0,.25),
                inset -8px -8px 12px 0 rgba(0,0,0,.25),
                inset 8px 8px 12px 0 rgba(255,255,255,.4); }
  ```
  — [Smashing 2022](https://www.smashingmagazine.com/2022/03/claymorphism-css-ui-design-trend/)
- clay.css token API: `--clay-background` (default `rgba(0,0,0,.005)`), `--clay-border-radius` (default 32px), `--clay-shadow-outset` (default `8px 8px 16px 0 rgba(0,0,0,.25)`), `--clay-shadow-inset-primary` (`-8px -8px 12px 0 rgba(0,0,0,.25)`), `--clay-shadow-inset-secondary` (`8px 8px 12px 0 rgba(255,255,255,.4)`). It is deliberately unopinionated and does not enforce styles on buttons, inputs or nav. — [Smashing 2022](https://www.smashingmagazine.com/2022/03/claymorphism-css-ui-design-trend/); [clay.css](https://github.com/codeAdrian/clay.css)
- Malewicz's original claymorphism guidance gave no pixel values. He pointed to claymorphism.com for inner-shadow generation. — [HYPE4 Academy](https://hype4.academy/articles/design/claymorphism-in-user-interfaces)
- Neither style needs `backdrop-filter`. Backdrop blur enters only when clay is merged with glass. — [HYPE4 Academy](https://hype4.academy/articles/design/claymorphism-in-user-interfaces) (inference from recipes above)

### Inferences
- Suggested token architecture (inference, not sourced): elevation tokens composed from primitives, e.g. `--shadow-light-x/y` derived from a single `--light-angle`. Semantic tokens such as `--elevation-cta-rest`, `--elevation-cta-pressed` (inset) and `--elevation-card` would sit on top. A `[dir=rtl]` override (or logical sign variables) would flip X offsets if a mirrored light source is chosen; see the RTL section.
- Because the neumorphic shadow colours are derived from the background, the style requires per-surface shadow tokens. That multiplies tokens across light, dark and tinted surfaces. Claymorphism's black/white alpha shadows are surface-agnostic and cheaper to tokenise.

### Gaps
- No source gives a W3C Design Tokens (DTCG) `shadow` composite example specifically for these styles.

## Documented strengths

### Takeaway
Evidence for real usability benefits is indirect. NN/g shows that depth-based signifiers (shadows, gradients, slight 3D buttons) improve findability of interactive elements compared with flat ones. Claymorphism adds brand friendliness and works with any colour. Neumorphism's main documented strengths are aesthetic: calm, minimal, a physical pressed-state metaphor.

### Cited Findings
- NN/g eyetracking (71 users, 9 sites, strong vs weak signifier versions): weak-signifier pages took 22% longer and had 25% more fixations, both significant. Strong versions used shadows, gradients and slightly 3D buttons. On one site, 86% vs 50% of users reached the target link. Flat styling is more acceptable at low information density with high-contrast targets. — [NN/g, Kate Moran, 2017-09-03](https://www.nngroup.com/articles/flat-ui-less-attention-cause-uncertainty/)
- Claymorphism suits friendly, approachable interfaces, because consumers "want their interfaces to be friendly". Malewicz also suggests AR/VR panels, where a tangible look aids quick processing (his claim, untested). — [HYPE4 Academy](https://hype4.academy/articles/design/claymorphism-in-user-interfaces)
- Claymorphism works as an enhancement to flat design for CTAs, toggles, charts and cards. It supports strong accent colours and branding, whereas neumorphism's colour restriction "weakens hierarchy and branding". — [Smashing 2022](https://www.smashingmagazine.com/2022/03/claymorphism-css-ui-design-trend/)
- "Playing up the 3D quality of call-to-action buttons is still necessary." — [LogRocket 2024](https://blog.logrocket.com/ux-design/what-is-claymorphism-web-design/)
- Neumorphism's worthwhile traits per Setproduct: one consistent light source, the extrude-to-inset flip on press as physical feedback, restrained 12–20px radii, and a hybrid approach that adds borders or accent fills. — [Setproduct 2026](https://www.setproduct.com/blog/neumorphism-design-guide)
- Neumorphism's claimed benefits are a simple modern look, room for creativity and cross-product consistency. — [LogRocket 2025](https://blog.logrocket.com/ux-design/neumorphism-ui-design)

### Inferences
- The NN/g result supports moderate depth on interactive elements in dense pages, i.e. dashboards and marketplaces. It does not specifically endorse neumorphic or clay rendering.

### Gaps
- No controlled user study specifically testing neumorphic or claymorphic UIs was found.

## Documented weaknesses: accessibility, dark mode, performance

### Takeaway
Neumorphism structurally conflicts with WCAG 1.4.11. Its boundaries are shadows on a same-colour surface, which WCAG treats as part of the adjacent colour. Text often fails 1.4.3, and pressed vs unpressed states look almost identical. Claymorphism avoids the structural trap but still needs normal contrast checks, and it risks hierarchy inflation and a childish tone. Both add paint cost from blurred shadows.

### Cited Findings
**WCAG mechanics**
- SC 1.4.11 Non-text Contrast (AA) requires 3:1 against adjacent colours for "visual information required to identify user interface components and states, except for inactive components". The listed states include "focus, hover, select, press, check…". — [W3C Understanding 1.4.11 (WCAG 2.2)](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- A "3D drop-shadow on an input" is treated as part of the adjacent colour closest in brightness, so the shadow does not supply the boundary. "Gradients can reduce the apparent contrast… and make it more difficult to test"; testers use the least-contrasting area. — [W3C Understanding 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- Colour changes between states of one component need not meet 3:1 if not shown side by side, but "the component must not lose contrast with the adjacent colors". Indicators of selected or focused state must meet 3:1. — [W3C Understanding 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- Note on numbering: in WCAG 2.2, 2.4.7 is Focus Visible (AA), 2.4.11 is Focus Not Obscured (Minimum) (AA), and 2.4.13 is Focus Appearance (AAA). "2.4.11 Focus Appearance" was the numbering in earlier drafts. — [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/) (not fetched this session; standard reference)

**Neumorphism**
- Malewicz (Built In, 2020-03-03): users can't tell whether an element is "a button or just text", and it "looks the same" in pressed or active states, which "breaks the entire experience" for people with visual problems. He estimated that "80 percent [of Dribbble designs] don't pass the WCAG". He advised trying the style on cards, not buttons. — [Built In, Stephen Gossett, 2020-03-03](https://builtin.com/design-ux/neumorphism-accessibility)
- "The poor contrast made the UI unusable for users with poor vision or color blindness". The style mostly looked like buttons even on non-interactive elements. — [Smashing 2022](https://www.smashingmagazine.com/2022/03/claymorphism-css-ui-design-trend/)
- Shadows aren't counted in contrast calculations. Boundaries are hard to perceive for low-vision and colour-blind users. Hierarchy is hard because no element can stand out. Interactive and static elements are hard to tell apart. — [CSS-Tricks 2020](https://css-tricks.com/neumorphism-and-css/)
- Neumorphism "normally fails" the 3:1 requirement for buttons and inputs. The fix is adding a grey border. Layered shadows and gradients can slow rendering on mobile and low-end devices. — [LogRocket 2025](https://blog.logrocket.com/ux-design/neumorphism-ui-design)
- Default neumorphic text "routinely lands below the WCAG AA minimum of 4.5:1"; the source recommends 7:1 body text. — [Setproduct 2026](https://www.setproduct.com/blog/neumorphism-design-guide)
- A vendor-estimated typical neumorphic edge contrast is "roughly 1.4:1", with no method shown, so treat it as illustrative. Shadows convey nothing to screen readers. Focus rings on shadow-only elements are weak. — search summaries of [Setproduct](https://www.setproduct.com/blog/neumorphism-design-guide) / [vp0.com](https://vp0.com/blogs/what-is-soft-ui-design)
- The colour and contrast margin is very small: a slight saturation change breaks the effect. Buttons, which must show state changes, suffer most. Display quality matters. — search summary of [Justinmind](https://www.justinmind.com/blog/neumorphism-ui/)
- Critique on UX Collective: the button "IS the same material as the background", so adding contrast is not an easy fix because the style relies on low contrast. — search summaries of [UX Collective, "Neumorphism, visual accessibility, and empathy"](https://uxdesign.cc/neumorphism-visual-accessibility-and-empathy-d1c5ed2a1f03) (not fetched; date unknown)
- Dark mode: the highlight must never be pure white and the shade never pure black (tokens above). Colours near the RGB extremes make the shadows invisible. — [Setproduct 2026](https://www.setproduct.com/blog/neumorphism-design-guide); [CSS-Tricks 2020](https://css-tricks.com/neumorphism-and-css/)

**Claymorphism**
- It "doesn't introduce glaring accessibility issues out-of-the-box as Neumorphism does". Watch hierarchy, because the soft 3D can make elements more prominent than intended. Check contrast for low-contrast-sensitivity and colour-blind users. Respect reduced motion. Overuse looks childish. — [Smashing 2022](https://www.smashingmagazine.com/2022/03/claymorphism-css-ui-design-trend/)
- The clay.css README claims it is "eliminating accessibility issues" of neumorphism because it floats above the background. That is an author claim, and it overstates the case: pastel fills with white text can still fail 1.4.3. — [clay.css](https://github.com/codeAdrian/clay.css)
- Dark mode works only if the shape isn't pure black. — [HYPE4 Academy](https://hype4.academy/articles/design/claymorphism-in-user-interfaces)

**Performance (both)**
- Blurred `box-shadow` is costly because painting runs a Gaussian-style blur whose cost grows with blur area. Repaint extent can reach about 1.4× the blur radius. Advice: keep blur and spread small, avoid shadows on many elements, and don't animate `box-shadow` itself (animate opacity or transform of a pre-rendered shadow layer). Sources are older engine bug reports, so this is indicative only. — [WebKit bug 22102](https://bugs.webkit.org/show_bug.cgi?id=22102); [WebKit r148049](https://trac.webkit.org/r148049); [Costly CSS properties (dev.to)](https://dev.to/leduc1901/costly-css-properties-and-how-to-optimize-them-3bmd)

### Inferences
- A neumorphic control can only pass 1.4.11 if it gets a real boundary (border or contrasting fill) that meets 3:1. At that point it stops being neumorphism, and it becomes the "hybrid" that Setproduct and LogRocket recommend.
- Pressed/selected states that differ only by flipping outer to inset shadows are ambiguous for low-vision users and invisible to assistive technology. State needs a non-shadow cue: fill colour, check icon, text weight, and `aria-pressed`/`aria-selected`.
- Clay CTAs with three shadow layers on every row of a 100-row admin table would multiply paint cost. Restrict clay to a few elements per view.

### Gaps
- No modern (2024–2026) browser benchmark quantifying box-shadow cost per element was found.
- No study measured cognitive load for either style.

## Suitability by surface (dashboards, marketing, forms, e-commerce cards)

### Takeaway
Neither style is suitable as the base language for data-dense dashboards, tables or forms. Neumorphism fails on boundaries and hierarchy; claymorphism's puffy radii and padding waste density and look childish. Claymorphism is defensible for marketing heroes, onboarding, empty states, illustration, avatars and a few primary CTAs. Neumorphism is defensible only for decorative cards or single-purpose controls, and only with added borders.

### Cited Findings
- Neumorphism survives in "concept work and single-purpose instruments", not production software for everyone. — [Setproduct 2026](https://www.setproduct.com/blog/neumorphism-design-guide)
- Malewicz: use neumorphism on cards, not buttons. It "works well when it can be removed without any loss for the product." — [Built In 2020](https://builtin.com/design-ux/neumorphism-accessibility); [CSS-Tricks 2020](https://css-tricks.com/neumorphism-and-css/)
- Malewicz criticised Dribbble dashboards and login forms for "very light borders in text fields", and praised UK government forms for contrast that is "very high but not so high that it's an eyesore". — [Built In 2020](https://builtin.com/design-ux/neumorphism-accessibility)
- Claymorphism is best for CTAs, toggles, charts and cards as an enhancement to flat design, not a replacement. — [Smashing 2022](https://www.smashingmagazine.com/2022/03/claymorphism-css-ui-design-trend/)
- Claymorphism use cases: CTAs, chat apps, app icons, avatars. — [LogRocket 2024](https://blog.logrocket.com/ux-design/what-is-claymorphism-web-design/)
- Neumorphic elements need extra padding and margin, which costs density. — [CSS-Tricks 2020](https://css-tricks.com/neumorphism-and-css/)
- Weak signifiers hurt most on dense or unconventional pages. — [NN/g 2017](https://www.nngroup.com/articles/flat-ui-less-attention-cause-uncertainty/)

### Inferences
- For CiviTech: insurance intake and consultation booking forms should use bordered, high-contrast inputs (the UK-GOV-style model Malewicz praised). Tactility belongs only on the primary submit CTA and the pressed feedback.
- Marketplace cards (books, shops, jobs) may take a soft single-shadow elevation and a mild hover lift. Full clay inflation would compete with product imagery and price text.
- On the marketing site and blog, clay-style 3D illustrations or icons can carry brand warmth for a civic audience, provided the tone stays professional rather than toy-like.

### Gaps
- No case studies of either style in civic, government or insurance products were found.

## RTL considerations

### Takeaway
I found no source that addresses neumorphism or claymorphism under RTL mirroring. Guidance here is inference only.

### Cited Findings
- The light-source convention (top-left: highlight top-left, shadow bottom-right) is the stated rule in all recipes. — [LogRocket 2025](https://blog.logrocket.com/ux-design/neumorphism-ui-design); [CSS-Tricks 2020](https://css-tricks.com/neumorphism-and-css/)
- `box-shadow` offsets are physical (x/y), not logical, so they do not flip automatically with `dir="rtl"`. CSS-Tricks maps light direction purely to offset signs. — [CSS-Tricks 2020](https://css-tricks.com/neumorphism-and-css/)

### Inferences
- There are two defensible options. (a) Keep a global physical light source (e.g. top-centre, x = 0), which removes the mirroring question and looks identical in LTR and RTL. (b) Mirror the light to top-right in RTL by flipping the sign of X offsets with a token (`--light-x: 1` / `-1` under `[dir=rtl]`). Option (a) is simplest for a Persian-first product with English secondary. Clay's purely vertical shadows (x = 0) also read naturally in both directions.
- Mixed-direction pages (an English widget inside a Persian page) would otherwise show contradictory light sources under option (b). This is a further argument for x = 0 or a page-level, not component-level, light direction.

### Gaps
- No published guidance, research or design-system documentation on shadow direction in RTL interfaces was found for these styles.

## Real-world products, design systems, and expert critiques

### Takeaway
Both styles are overwhelmingly concept or Dribbble work. No major shipped design system adopted neumorphism. Claymorphism appears mostly in 3D avatar or illustration sets and app icons. Expert critique converges on neumorphism's contrast and affordance failures. Claymorphism is viewed as safer but tonally limited.

### Cited Findings
- Malewicz's "zombie trend" verdict: "nobody's making any products with it". — [Creative Bloq](https://www.creativebloq.com/news/neumorphism)
- The Setproduct 2026 gallery names no shipped neumorphic product. — [Setproduct 2026](https://www.setproduct.com/blog/neumorphism-design-guide)
- LogRocket's claymorphism examples are designer mockups (Meng To, Rezha Aaron, Hana Szyperek, etc.) and the Toy Faces avatar series by Amrit Pal Singh. The only product mention is Slack's rounded edges, which is weak evidence. — [LogRocket 2024](https://blog.logrocket.com/ux-design/what-is-claymorphism-web-design/)
- Critiques: Built In / Malewicz (2020); Smashing (2022); CSS-Tricks (2020); LogRocket (2025); UX Collective "Neumorphism, visual accessibility, and empathy" and "Let's talk neumorphism and accessibility" (member-only, not fetched). — links above; [UX Collective](https://uxdesign.cc/lets-talk-neumorphism-and-accessibility-44a48a6ace72)
- NN/g has no dedicated neumorphism article found. Its flat-UI signifier study is the relevant evidence. — [NN/g 2017](https://www.nngroup.com/articles/flat-ui-less-attention-cause-uncertainty/)

### Inferences
- The absence of adoption by major design systems (Material, Fluent, Carbon, GOV.UK, etc.) is itself signal. Those systems use flat or tonal elevation with explicit borders and focus rings. Verify with the adjacent research streams.

### Gaps
- No A11y Project article specific to either style was found.
- No verified list of shipped products using either style.

## Borrow vs reject for an accessible CiviTech system

### Takeaway
**Borrow:** a single consistent light source; soft, low-blur elevation on a few primary CTAs and marketplace cards; a tactile pressed state (inset or scale-down), but always paired with a non-shadow state cue; clay-style 3D illustrations or avatars for marketing and empty states; clay's colour freedom.

**Reject:** same-colour-as-background controls; shadow-only boundaries on inputs, buttons, table cells or toggles; shadow-only state; grey-on-grey text; >50% "inflated" radii and triple shadows in dense UI; animated `box-shadow`.

### Cited Findings
- Depth signifiers improve findability. — [NN/g 2017](https://www.nngroup.com/articles/flat-ui-less-attention-cause-uncertainty/)
- The extrude-to-inset press flip and one light source are worth keeping. Hybrids add borders or accent fills. — [Setproduct 2026](https://www.setproduct.com/blog/neumorphism-design-guide)
- Add a grey border to pass 3:1. Use one bold accent for key CTAs. — [LogRocket 2025](https://blog.logrocket.com/ux-design/neumorphism-ui-design)
- Shadows don't count as the boundary under 1.4.11. State indicators must meet 3:1. — [W3C 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- Keep neumorphism off buttons; use it only where it can be removed without loss. — [Built In 2020](https://builtin.com/design-ux/neumorphism-accessibility); [CSS-Tricks 2020](https://css-tricks.com/neumorphism-and-css/)
- Use clay as an enhancement for CTAs, toggles, charts and cards. Counter childishness with minimal typography and strong accents. Respect reduced motion. — [Smashing 2022](https://www.smashingmagazine.com/2022/03/claymorphism-css-ui-design-trend/)

### Inferences
- A concrete rule set for the synthesis team. All of it is inference built on the sources above:
  1. Every interactive control gets a 3:1 boundary or fill independent of shadow.
  2. Elevation tokens: max 2 shadow layers, blur ≤ 16px, applied to ≤ a handful of elements per view.
  3. Pressed = inset or `scale(.98)` + fill change + `aria-pressed`; selected = check/indicator + 3:1 colour.
  4. Focus = a dedicated outline token (≥ 2px, 3:1), never a shadow change alone.
  5. Light source fixed top-centre (x = 0) to sidestep RTL mirroring.
  6. Clay reserved for marketing illustrations, onboarding and empty states, avatars, and at most the hero CTA.
  7. Dashboards and tables stay flat or tonal with borders.
  8. Dark mode uses tonal surface steps rather than white highlights.

### Gaps
- None of these hybrid rules has been user-tested in published research. They should be validated with CiviTech users, including low-vision Persian readers.
