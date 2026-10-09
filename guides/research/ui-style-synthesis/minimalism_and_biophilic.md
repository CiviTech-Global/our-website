# Minimalism and Organic/Biophilic Design in UI: Fact Base for CiviTech Global (as of October 2026)

Scope note: about 15 research calls. Sources were fetched or seen in search results on 2026-10-09. Where a URL comes only from a search-result summary and the page itself was not fetched, it is marked "(search summary)". Items with no source found are listed under Gaps and not stated as fact.

## 1. Origins

### Takeaway
UI minimalism comes from Dieter Rams' "less, but better" (late 1970s). On the web it is a reaction to cluttered 2000s interfaces, and the ultraflat skeuomorphism backlash peaked around 2013. Biophilic design comes from E.O. Wilson's biophilia hypothesis (1984). Kellert turned it into a design framework (2008), and Terrapin Bright Green published it as 14 patterns (2014). The translation into digital UI is mostly practitioner convention, not research.

### Cited Findings
**Minimalism**
- Dieter Rams' ten principles (developed in the late 1970s) are: innovative, useful, aesthetic, understandable, unobtrusive, honest, long-lasting, thorough down to the last detail, environmentally friendly, and "as little design as possible". His summary phrase is "Less, but better". — [Vitsœ: Good Design](https://www.vitsoe.com/gb/about/good-design)
- NN/g definition: minimalist web design "seeks to simplify interfaces by removing unnecessary elements or content that does not support user tasks" (Kate Moran, 12 Jul 2015, based on a sample of 112 sites). — [NN/g: Characteristics of Minimalism](https://www.nngroup.com/articles/characteristics-minimalism/)
- NN/g frames minimalism as a reaction to cluttered "maximalist" 2000s interfaces, and flat design as a reaction to skeuomorphism. The two are distinct: flat design concerns textures and icons, while minimalism concerns content, features and layout. — [NN/g](https://www.nngroup.com/articles/characteristics-minimalism/)
- Ultraflat design peaked around 2013 and has since declined. Many sites now use "flat 2.0", which adds subtle effects that suggest slight layering. — [NN/g: Long-Term Exposure to Flat Design (2015)](https://www.nngroup.com/articles/flat-design-long-exposure/)

**Biophilic**
- E.O. Wilson introduced the biophilia hypothesis in *Biophilia* (1984) and defined it as "the innate tendency to focus on life and lifelike processes". The 1993 *The Biophilia Hypothesis* (co-edited by Kellert and Wilson) is sometimes miscited as the origin. — [Wikipedia: Biophilic design](https://en.wikipedia.org/wiki/Biophilic_design) (search summary); [CARTA bibliography](https://carta.anthropogeny.org/libraries/bibliography/biophilia-hypothesis) (search summary)
- Kellert's *Biophilic Design* (2008) set out 6 elements and about 70 attributes (sources give 70, 72 or 75): environmental features; natural shapes and forms; natural patterns and processes; light and space; place-based relationships; and evolved human–nature relationships. Kellert and Calabrese (2015) simplified this to 3 categories with 24 attributes. — [Wikipedia](https://en.wikipedia.org/wiki/Biophilic_design); [UMN Biophilic Design frameworks](https://biophilicdesign.umn.edu/frameworks) (search summary)
- Terrapin Bright Green, *14 Patterns of Biophilic Design* (Browning, Ryan, Clancy; 2014), groups the patterns as follows:
  - **Nature in the Space:** Visual Connection with Nature; Non-Visual Connection; Non-Rhythmic Sensory Stimuli; Thermal & Airflow Variability; Presence of Water; Dynamic & Diffuse Light; Connection with Natural Systems.
  - **Natural Analogues:** Biomorphic Forms & Patterns; Material Connection with Nature; Complexity & Order.
  - **Nature of the Space:** Prospect; Refuge; Mystery; Risk/Peril.

  — [Terrapin Bright Green](https://www.terrapinbrightgreen.com/reports/14-patterns/)
- The report rates evidence strength. Visual Connection, Non-Rhythmic Sensory Stimuli, Prospect and Refuge get the highest rating (***). Biomorphic Forms & Patterns and Risk/Peril get the lowest (*). — [Terrapin](https://www.terrapinbrightgreen.com/reports/14-patterns/)

### Inferences
- In practice, digital "biophilic UI" borrows the Natural Analogues group: biomorphic forms (blobs and curves), material connection (grain, paper and wood textures, earthy palettes) and complexity & order (fractal patterns). It adds images that stand in for Visual Connection. Of these, biomorphic form is the least evidenced. Images of nature and Prospect/Refuge-style layouts (clear overview plus a safe, contained workspace) rest on stronger evidence.
- The Prospect/Refuge pair maps naturally onto dashboard IA: a clear overview, plus focused panels that feel contained.

### Gaps
- No peer-reviewed source was found that defines "biophilic UI" as a formal digital discipline. It exists mainly as practitioner and blog vocabulary.
- I did not fetch Apple's or Google's own design history. Material Design and the iOS 7 flat move of 2013 are well known but not cited here.

## 2. Defining visual traits

### Takeaway
NN/g's quantified traits of minimalism are flat textures, a limited palette, restricted features, negative space and dramatic type. The biophilic/organic traits (curves, blobs, grain, earthy palettes, nature imagery, organic motion) are practitioner conventions, and no equivalent quantified survey was found for them.

### Cited Findings
- Minimalism's defining traits, with the share of 112 sites showing each: flat patterns and textures (96%); limited or monochromatic palette, often with one accent colour for clickable elements (95%); restricted features (87%); maximised negative space (84%); dramatic typography (75%). — [NN/g](https://www.nngroup.com/articles/characteristics-minimalism/)
- Related but non-defining traits: large background images or video (57%); grid layouts (43%); circular elements (16%); hidden global navigation (13%). — [NN/g](https://www.nngroup.com/articles/characteristics-minimalism/)
- The Headspace 2024 rebrand (led in-house with Italic Studio) has the following traits:
  - The orange smiley circle is kept and round, soft illustrations make heavy mental-health topics approachable.
  - Abstract inner states are shown as illustration and real-world services as photography.
  - A custom Apercu-based typeface by Colophon has curves that echo the smile.

  — [It's Nice That](https://Itsnicethat.com/articles/italic-studio-headspace-graphic-design-project-250424) (search summary); [Design Compass (Apr 2024)](https://designcompass.org/en/2024/04/30/headspace/) (search summary)
- Biophilic material cues found in the built-environment literature include natural shapes (botanical motifs, shells, spirals, arches and domes) and "age, change and the patina of time". — [Wikipedia / Kellert 2008 summary](https://en.wikipedia.org/wiki/Biophilic_design) (search summary)

### Inferences
- Organic traits can be layered onto a minimalist base: the whitespace, restricted palette and type hierarchy stay, and selected curves, grain and nature-derived hues are added. The two styles are complementary, not opposed.
- Headspace's split (illustration for emotion, photography for real services) is a useful rule for CiviTech. Use photography for real people and services in marketplaces and consultations, and abstract organic shapes for marketing atmosphere.

### Gaps
- No source quantified "natural easing" or "breathing" motion in UI. Motion recommendations would rest on practitioner convention only.

## 3. CSS/SVG implementation techniques and token mapping

### Takeaway
All the core techniques are native CSS/SVG and map cleanly to tokens: fluid scales with `clamp()` (Utopia method), eight-value `border-radius` blobs, SVG `feTurbulence` grain, and OKLCH palettes. The research here confirmed the syntax, but no performance benchmarks were found.

### Cited Findings
- **Fluid type and space scales (Utopia):** define one modular scale for a small viewport and one for a large viewport, and let the browser interpolate between them. The example is a 1.2 ratio at 320px and 1.333 at 1500px. Utopia provides a clamp() calculator for this (James Gilyead and Trys Mudford, 1 Feb 2020). — [Utopia: Designing with fluid type scales](https://utopia.fyi/blog/designing-with-fluid-type-scales/)
- **Organic border-radius:** the eight-value syntax `border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%` sets horizontal radii before the slash and vertical radii after it, clockwise from top-left. Unequal radii make elliptical corners, and the percentages keep the shape proportional when the element resizes. — [9elements: CSS Border-Radius Can Do That?](https://9elements.com/io/css-border-radius/) (search summary; direct fetch failed); [MDBootstrap Fancy Border Radius tool](https://mdbootstrap.com/docs/standard/tools/design/fancy-border-radius) (search summary)
- **Grain/noise:** the CSS-Tricks "Grainy Gradients" article (SVG `feTurbulence` noise layered under gradients) is the canonical reference. The fetch failed (ECONNRESET), so its parameters are not quoted here. — [CSS-Tricks: Grainy Gradients](https://css-tricks.com/grainy-gradients/)

### Inferences
Suggested token mapping (a design proposal, not a sourced fact):
- **Spacing:** `--space-xs` … `--space-3xl` as `clamp()` values from a Utopia scale. Persian/Vazir text often needs larger line-height, which is a type token decision.
- **Shape:** `--radius-sm/md/lg` for UI controls (kept symmetric and predictable). A separate `--shape-organic-1..n` holds blob values for decorative surfaces only.
- **Colour:** an OKLCH ramp per hue. Lightness steps give predictable contrast, which supports turquoise, lapis, saffron and pomegranate ramps.
- **Texture:** `--texture-grain` as a small SVG data URI with low opacity, applied on marketing surfaces only.
- **Motion:** `--ease-organic` and `--duration-*`, wrapped in `prefers-reduced-motion`.

### Gaps
- Not verified in this session: OKLCH browser support figures, the performance cost of large SVG-filter or blob backgrounds (web.dev guidance not fetched), and the exact `feTurbulence` parameters.

## 4. Documented strengths

### Takeaway
Exposure to nature, including digital images and video, has peer-reviewed support for stress recovery. Fractal patterns of medium complexity have suggestive support. Minimalism's main documented benefit is the aesthetic-usability effect plus focus through reduced clutter, but attractive design does not excuse real usability defects.

### Cited Findings
- **Window views and heart rate:** a window view of nature helped heart rate recover 1.6× faster than a video of the same view or no view (Kahn et al., 2008). — [Terrapin](https://www.terrapinbrightgreen.com/reports/14-patterns/)
- **Viewing a forest:** 20 minutes of viewing a forest after a stressor returned brain activity to a relaxed state (Tsunetsugu & Miyazaki, 2005). — [Terrapin](https://www.terrapinbrightgreen.com/reports/14-patterns/)
- **Nature sounds:** restoration after a stressor was up to 37% faster with nature sounds than with office noise (Alvarsson et al., 2010). — [Terrapin](https://www.terrapinbrightgreen.com/reports/14-patterns/)
- **Natural materials:** linked to lower diastolic blood pressure and better creative performance (Tsunetsugu 2007; Lichtenfeld 2012). — [Terrapin](https://www.terrapinbrightgreen.com/reports/14-patterns/)
- **Digital vs real nature (2024 meta-analysis):** Fan & Baharum, *Internet Interventions*, pooled 10 studies with 886 participants. Digital nature (static images, video, 360° media) gave the same stress recovery as physical nature with matched content (SMD −0.01; 95% CI −0.15 to 0.12). Caveat: the included studies had low to high risk of bias. — [UM eprints](https://eprints.um.edu.my/46328/) (search summary)
- **Simulated audio-visual nature (2022 review):** contributes to stress relief, but all included studies had moderate to high risk of bias. — [Frontiers in Psychology 2022](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2022.1058177/epub) (search summary)
- **Virtual nature (2023 review):** 59 of 236 records met the eligibility criteria, with mood, stress and restorativeness as the outcomes. — [PMC9869155](https://pmc.ncbi.nlm.nih.gov/articles/PMC9869155) (search summary)
- **Fractals:** Richard Taylor's work reports the lowest stress (skin conductance) at fractal dimension D ≈ 1.3–1.5, which is mid-complexity, with stress rising for both simpler and more complex patterns. This is his "fractal fluency" hypothesis. The widely quoted "60% better stress recovery" figure could only be traced to secondary sources. — [Smithsonian](https://www.smithsonianmag.com/innovation/fractal-patterns-nature-and-art-are-aesthetically-pleasing-and-stress-reducing-180962738/) (search summary); [Futurity](https://www.futurity.org/solar-panels-design-stress-reduction-2342162/) (search summary); [US patent 8939885](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/8939885) (search summary)
- **Aesthetic-usability effect:** Kurosu & Kashimura (Hitachi, 1995) had 252 participants rate 26 ATM layouts, and perceived ease tracked aesthetic appeal more closely than actual ease. Attractive design forgives minor usability problems but not major ones, and it can hide problems during testing. — [NN/g (Moran, 3 Feb 2024; reviewed 1 Sep 2026)](https://www.nngroup.com/articles/aesthetic-usability-effect/)
- **Negative space:** NN/g says negative space directs attention and helps users digest content. — [NN/g](https://www.nngroup.com/articles/characteristics-minimalism/)

### Inferences
- The stress evidence supports nature imagery and photography more strongly than abstract blobs. If CiviTech wants calm that the evidence backs, real nature photography (Persian gardens, for example) on marketing and consultation pages is better supported than decorative organic shapes.
- The fractal evidence argues for subtle, medium-complexity patterns, not dense ornament. This is relevant to how much eslimi or girih patterning to use.

### Gaps
- No peer-reviewed study was found that tests organic border-radius or blob shapes in UI against neutral shapes for stress or trust.
- No study was found that directly measures "reduced cognitive load from minimalism" in UI. The NN/g claims are expert guidance, not experiments.
- The primary Taylor papers were not fetched.

## 5. Documented weaknesses and accessibility issues

### Takeaway
Ultraflat minimalism has measurable costs: 22% slower findability and 25% more fixations when clickability signifiers are weak. NN/g also warns against hidden navigation, low contrast and removing needed features. The biophilic risks (legibility over textures, decorative clutter, performance, cliché) are well recognised in practice, but this session found little formal evidence for them.

### Cited Findings
- **Eyetracking study:** 71 users, 9 page pairs. Weak-signifier pages took 22% more time and produced 25% more fixations (p < 0.05). In the Brilliant Earth case, 86% of users in the strong version moved from heading to target link versus 50% in the weak version (p < 0.005). Flat UI works best with low information density, conventional layouts and high-contrast interactive elements. — [NN/g: Flat UI Elements Attract Less Attention (Moran, 3 Sep 2017)](https://www.nngroup.com/articles/flat-ui-less-attention-cause-uncertainty/)
- **Long-term exposure to flat design:**
  - Users hover and click experimentally to find links, which raises cognitive load. One participant said, "I just start clicking and praying that it works."
  - Young adults find subtle targets faster but dislike click uncertainty as much as other groups.
  - Recommendations: give every clickable element a signifier; never make hover the only signifier on primary elements.

  — [NN/g (8 Nov 2015)](https://www.nngroup.com/articles/flat-design-long-exposure/)
- **NN/g cautions on minimalism:**
  - Ghost buttons have legibility and clickability problems.
  - Limited palettes still need enough contrast for people with low vision or colour blindness.
  - Don't remove needed content or features.
  - Hamburger menus hide tools on content-heavy sites.
  - Background media must keep text legible, stay performant on mobile, and not autoplay.
  - "Minimalism for minimalism's sake alone doesn't help users."

  — [NN/g](https://www.nngroup.com/articles/characteristics-minimalism/)
- **Evidence limits on the biophilic side:** in the Terrapin framework, Biomorphic Forms has only the lowest (*) evidence rating. — [Terrapin](https://www.terrapinbrightgreen.com/reports/14-patterns/)

### Inferences
- The density point matters for CiviTech: its admin dashboards and marketplaces are high-density, which is the case where NN/g says ultraflat is risky. Buttons, links, inputs and tabs need clear signifiers there: borders, fills, underlines and visible focus rings.
- Grain and image backgrounds behind text are a contrast risk. Text should sit on solid token surfaces.

### Gaps
- No peer-reviewed study was found on readability of text over noise textures, or on performance budgets for decorative SVG filters.

## 6. Suitability: dashboards vs marketing pages, forms, marketplaces

### Takeaway
A restrained, flat-2.0 minimalism with strong signifiers suits dashboards, tables and forms. Organic and biophilic expression suits marketing, the blog, consultation and insurance landing pages, and empty states. In dense views it should be confined to accents.

### Cited Findings
- Flat design is "more workable" at low information density with traditional layouts and high-contrast interactive elements, so dense sites should be cautious about ultraflat styling. — [NN/g 2017](https://www.nngroup.com/articles/flat-ui-less-attention-cause-uncertainty/)
- Hidden navigation is problematic on sites with a lot of content. — [NN/g](https://www.nngroup.com/articles/characteristics-minimalism/)
- Headspace uses illustration for emotional states and photography for real services. — [Design Compass](https://designcompass.org/en/2024/04/30/headspace/) (search summary)

### Inferences
- **Dashboards and admin:** minimal chrome, persistent visible navigation, compact symmetric radii, no textures, colour reserved for status and data. An organic touch could be limited to empty states and onboarding.
- **Forms (insurance intake, booking):** a calm, spacious minimalist layout with clear field borders and labels. Calm comes from spacing and a warm palette, not from decoration.
- **Marketplaces:** use real photography of jobs, books and shops, with clear card signifiers. Organic shapes can frame category headers.
- **Marketing and blog:** the full biophilic expression fits here (garden photography, blobs, grain, fluid type).

### Gaps
- No source compared the two styles on dashboards head-to-head.

## 7. Cultural fit for Iranian/Persian audiences

### Takeaway
The Persian garden (chahar bagh) is a deeply rooted, UNESCO-recognised, geometry-plus-nature tradition, so biophilic and geometric motifs both have strong cultural anchors. Turquoise and lapis glazes are well documented in Iranian architecture. Evidence that these motifs are used in contemporary Iranian digital UI is thin. One thesis argues Iranian digital products mostly copy Western patterns.

### Cited Findings
- **The chahar bagh:**
  - UNESCO calls the four-part chahar bagh the "original principle of the Persian Garden", unchanged over more than two millennia, with its first mature expression at Pasargadae (Cyrus the Great).
  - The design is based on the right angle and geometrical proportions.
  - Garden references appear in Persian literature, poetry, music, calligraphy and carpet design.

  — [UNESCO WHC 1372](https://whc.unesco.org/en/list/1372-006) (search summary)
- **Debate on its meaning:** one Iranian paper argues that no written evidence supports the claim of a pre-Islamic four-part worldview. — [magiran](https://magiran.com/paper/918729/?lang=en) (search summary)
- **Colour:**
  - In Persian and Central Asian architecture, turquoise came from copper glazes and deep blue from cobalt.
  - A book on Islamic tile architecture lists the "seven colours of heaven": turquoise, night-blue, black, green, red, ochre and white.
  - Blue tiles in Safavid mosques are tied to mystical and Shiite colour allegory.

  — [illustrarch](https://illustrarch.com/history-heritage/97551-turkish-blue-islamic-architecture.html) (search summary); [JRIA 2017](https://jria.iust.ac.ir/article-1-693-en.html) (search summary); [readinglength](https://www.readinglength.com/work/WSukIeg) (search summary)
- **Persian graphic design (RGD, 21 Feb 2024):**
  - Designers balance a 3,000-year heritage that can both inspire and limit them.
  - Key figures are Morteza Momayez, Farshid Mesghali and Ghobad Shiva.
  - Motifs include rugs, Tepe Sialk pottery (simple geometric animal and nature forms), Persepolis, and miniatures that moved towards ornament.
  - Calligraphy is central, and Persian script emphasises the whole word rather than single letters.
  - The byline is inconsistent between Ava and Arezu Ahmadi.

  — [RGD](https://rgd.ca/articles/a-journey-through-tradition-and-modernity-in-persian-graphic-design)
- **Contemporary Arab and Persian design:** it spans fluid calligraphic and structured geometric compositions, often mixed (Khatt Foundation / MCAD, *Inner Structures – Outer Rhythms*, 2021). — [Khatt Foundation](https://www.khtt.net/en/page/38863/inner-structures-%E2%80%94-outer-rhythms) (search summary)
- **Western patterns in Iranian products:** a 2020 LSU MFA thesis argues that Iranian digital products "disregard the Iranian's specific needs and emulate western patterns". The author built a Persian calendar app whose design system drew on old Islamic astronomy books. — [LSU thesis 5172](https://repository.lsu.edu/gradschool_theses/5172/) (search summary)
- **Digikala and Snapp:** both are hiring design-system designers (Snapp's design team is described as 25+ people). Neither has public design-system documentation showing Persian ornament in UI. — [Snapp careers](https://snapp.recruitee.com/o/product-designer-2) (search summary); [Jobinja / Digikala](https://jobinja.ir/1159901) (search summary)

### Inferences
- The chahar bagh fits a dashboard grid well. It is an ordered, axial, four-part plan with water channels, which suggests "ordered nature" (geometry plus organic planting) rather than pure blob organicism. This may resonate more and read as more trustworthy than generic Western "wellness blobs".
- Taylor's mid-complexity fractal result suggests that girih or eslimi patterns should appear at low density and low contrast, as accents or section dividers, not as full backgrounds behind text.
- A turquoise (firouzeh) and lapis palette in OKLCH has heritage meaning and practical value as accent and interactive colours, provided contrast is checked. Saffron and pomegranate fit as warm secondary or status colours. Their specific symbolism was not sourced.

### Gaps
- No source on audience testing of biophilic or Persian motifs in Iranian digital products.
- No sources on saffron or pomegranate as colour traditions, or on the "firouzeh = victory" etymology (found only on a retail site, so not used).
- No sources on Vazir/Vazirmatn typography with organic styles.

## 8. Notable real-world products

### Takeaway
Headspace is the best-documented organic/biophilic UI example found. The minimalist exemplars (Apple, Linear, Notion) and the biophilic ones (Calm, Patagonia, Airbnb) were not sourced in this session.

### Cited Findings
- **Headspace 2024 identity:**
  - The update followed the move into coaching after the 2021 merger with Ginger.
  - It kept the orange smiley and round illustration and added photography.
  - The custom typeface is by Colophon.
  - The claim of "3,000+ illustration assets" is unverified (single source).

  — [It's Nice That](https://Itsnicethat.com/articles/italic-studio-headspace-graphic-design-project-250424) (search summary); [Design Compass](https://designcompass.org/en/2024/04/30/headspace/) (search summary); [blakecrosley.com](https://blakecrosley.com/de/guides/design/headspace) (search summary)
- **Studio Melli:** an Iranian studio featured in Vanschneider's "Design in Iran" series, a possible reference point for contemporary Iranian design. — [Vanschneider](https://vanschneider.com/design-in-iran-featuring-studio-melli) (search result only; not read)

### Gaps
- No sources fetched for Apple, Linear, Notion, Calm, Patagonia or Airbnb design practice.

## 9. Borrow vs reject for an accessible, trust-oriented system

### Takeaway
Borrow minimalism's structure (whitespace, restraint, type hierarchy, a single accent) and biophilic atmosphere (nature photography, a warm heritage palette, subtle curves and grain on marketing surfaces). Reject ultraflat signifiers, hidden navigation, low-contrast greys, text over texture and dense ornament.

### Cited Findings
- Keep a clear signifier on every clickable element; strong signifiers are needed for findability; links should be a contrasting colour. — [NN/g 2015](https://www.nngroup.com/articles/flat-design-long-exposure/); [NN/g 2017](https://www.nngroup.com/articles/flat-ui-less-attention-cause-uncertainty/)
- Limited palettes still need sufficient contrast; background media must not compromise legibility or autoplay. — [NN/g](https://www.nngroup.com/articles/characteristics-minimalism/)
- Aesthetics can mask usability problems, so test behaviour, not stated opinion. — [NN/g](https://www.nngroup.com/articles/aesthetic-usability-effect/)
- Nature imagery has meta-analytic support for stress recovery; biomorphic form has the weakest evidence rating. — [Fan & Baharum 2024](https://eprints.um.edu.my/46328/) (search summary); [Terrapin](https://www.terrapinbrightgreen.com/reports/14-patterns/)

### Inferences
**Borrow:**
- Fluid clamp() spacing and type.
- A restricted palette with one accent.
- Generous whitespace on marketing pages.
- Nature and garden photography.
- A firouzeh and lapis accent ramp in OKLCH.
- Subtle organic radii on decorative containers and illustrations.
- Low-opacity grain on hero areas.
- Low-density geometric or eslimi dividers.
- Calm, short easing with reduced-motion fallbacks.
- A prospect/refuge (overview plus focused panel) layout logic.

**Reject:**
- Ghost buttons as primary CTAs.
- Hamburger-only navigation on desktop dashboards.
- Grey-on-grey text.
- Hover-only affordances.
- Blob radii on form controls and table cells.
- Textures or images behind body text.
- Full-bleed ornament.
- Autoplay background video.
- Cliché leaf and plant iconography.

### Gaps
- No CiviTech-specific user research exists. Claims about trust in an Iranian civic-tech context need validation through testing.
