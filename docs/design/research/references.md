# Gate 2.1 — Design Research References

| Field | Value |
| --- | --- |
| Gate | 2.1 — Design Research |
| Status | Ready for product-owner review |
| Usage | Evidence base for competitor analysis, principles, and territories |
| Note | Prefer official blogs, design systems, help centres, brand guidelines, and reputable public case studies. Third-party token captures are marked as **secondary**. |

For each reference: **Pattern** (Observed), **Why it works**, **Limitations**, **How it might inform Accountability Tracker** (Recommendation).

---

## A. Monzo

### A1. Monzo brand refresh — official blog

- **URL:** https://monzo.com/blog/weve-had-a-little-makeover
- **Pattern:** Hot coral as primary brand warmth; navy + soft white support; expressive marketing type + functional Monzo Sans; distinctive illustration system.
- **Why it works:** A single memorable colour and friendly type make a regulated category feel human.
- **Limitations:** Marketing brand ≠ full product UI; coral can collide with error semantics if overused in app chrome.
- **Inform AT:** Pursue a scarce, human accent and readable functional type — do not adopt coral or Monzo typefaces.

### A2. Monzo community Q&A on visual refresh

- **URL:** https://community.monzo.com/t/we-ve-given-our-visual-brand-a-refresh-q-a-w-jesse-senior-brand-designer/139681
- **Pattern:** Designers articulate warmth/empathy as colour rationale; accessibility considered in secondary palette selection.
- **Why it works:** Brand story is explicit and repeatable across teams.
- **Limitations:** Community post is explanatory, not a full public design system.
- **Inform AT:** Document colour rationale (trust + social warmth) when a territory is chosen.

### A3. Reimagining monzo.com design system

- **URL:** https://monzo.com/blog/reimagining-monzo-com-building-a-modular-high-fidelity-web-design-system-that-scales
- **Pattern:** Semantic tokens for colour/type/spacing/motion; accessibility built in; intentional restraint of hot coral in UI; subtle guiding animation.
- **Why it works:** Tokens keep brand expressive while components stay usable and themeable.
- **Limitations:** Web marketing system differs from native banking app constraints.
- **Inform AT:** Plan semantic tokens early in Gate 2; treat brand accent as “moments,” not default large fills behind balances.

### A4. Monzo accessibility statement

- **URL:** https://monzo.com/accessibility-statement
- **Pattern:** Public commitment; reliance on OS text size, colour, and screen readers; inclusive writing principles.
- **Why it works:** Sets user expectations and orients product work to platform accessibility features.
- **Limitations:** Statement is aspirational/compliance-oriented; not a component checklist.
- **Inform AT:** Design to respect OS settings; publish accessibility intent later without waiting for marketing polish.

### A5. High contrast themes (Monzo Labs / community)

- **URL:** https://community.monzo.com/t/now-in-labs-high-contrast-themes/152056
- **Pattern:** Optional high-contrast light/dark themes improving separator and foreground contrast.
- **Why it works:** Gives users control beyond a single brand palette.
- **Limitations:** Labs feature; contrast gaps can remain on coloured banners.
- **Inform AT:** When defining colour roles, include a path to higher-contrast theme tokens.

### A6. Reduce motion respected in app (community staff reply)

- **URL:** https://community.monzo.com/t/remove-balance-update-animation/149825
- **Pattern:** Animations disabled when OS reduce-motion is on.
- **Why it works:** Prevents vestibular/cognitive overload; aligns with WCAG motion preferences.
- **Limitations:** OS-wide toggle; not a per-animation product control.
- **Inform AT:** All celebration/progress motion needs a non-animated equivalent.

### A7. Pots Goals launch

- **URL:** https://monzo.com/blog/2018/08/02/pots-goals
- **Pattern:** Goal under saved amount + progress bar; notification on goal reached.
- **Why it works:** Completion bias + clear target transforms a balance into a story.
- **Limitations:** Older post; Monzo custody model differs from AT (no funds held).
- **Inform AT:** Personal target progress should sit directly with the reported total; celebrate milestones without implying in-app balances are bank pots.

### A8. Monzo Pots marketing

- **URL:** https://monzo.com/features/pots
- **Pattern:** Named, imaged pots; hide/lock affordances; home persistence of goals.
- **Why it works:** Personalisation creates emotional attachment; hide/lock supports self-control.
- **Limitations:** Feature is about money held at Monzo — wrong mental model if copied literally.
- **Inform AT:** Challenge naming + personal target framing can borrow “named goal” emotion; avoid vault/custody metaphors.

### A9. Ragged Edge × Monzo partnership write-up

- **URL:** https://raggededge.com/partnerships/monzo
- **Pattern:** Identity system spanning product and brand; illustration suite; hotter coral.
- **Why it works:** Coherent system scales across touchpoints.
- **Limitations:** Agency case study; may emphasise brand outcomes over UI detail.
- **Inform AT:** Aim for one system covering marketing + product later; Gate 2.1 only frames the research.

### A10. Secondary — public type inspections of monzo.com

- **URLs:** https://font-inspector.com/fonts-used-by/monzo ; third-party design decode pages (e.g. shadcn.io Monzo notes)
- **Pattern:** Display vs text cuts; heavy display weights; modular type scale.
- **Why it works:** Clear hierarchy without relying on colour alone.
- **Limitations:** **Secondary** — not official Monzo docs; proprietary fonts not usable.
- **Inform AT:** Separate celebration display from UI text; license original faces later.

---

## B. Wise

### B1. Wise Design — Typography

- **URL:** https://wise.design/foundations/typography
- **Pattern:** Inter default for product clarity; Wise Sans for short success/display moments; international glyphs sparingly.
- **Why it works:** Functional default + rare brand spice prevents fatigue.
- **Limitations:** Inter is Wise’s functional choice; AT brand direction should not default to Inter for distinctive identity.
- **Inform AT:** Adopt the *role split* (functional vs celebratory), not Wise’s exact families.

### B2. Wise Design — Colour

- **URL:** https://wise.design/foundations/colour
- **Pattern:** Bright Green + Forest Green core; secondary palette after green is established; content greys with green tint; documented good/bad combos; white-space-heavy product proportions.
- **Why it works:** Accessible pairings are designed in; brand stays recognisable without painting every surface green.
- **Limitations:** Palette is strongly owned by Wise; copying green reads as derivative.
- **Inform AT:** Build content neutrals + one interactive dark + one bright accent; publish allowed/forbidden combos in Gate 2–4.

### B3. Wise Design — Motion system

- **URL:** https://wise.design/foundations/motion-system
- **Pattern:** Snappy, fluid, intuitive motion; natural easing; avoid nausea; flashing colour frequency limits; media accessibility (captions, transcripts, audio description).
- **Why it works:** Motion communicates brand energy without harming comprehension.
- **Limitations:** Brand film language ≠ dense transactional UI motion budgets.
- **Inform AT:** Define a small motion vocabulary (confirm, progress, celebrate) with accessibility constraints.

### B4. Wise Design — Transitions

- **URL:** https://wise.design/foundations/transitions
- **Pattern:** Upwards = new flow; sideways = continuation; modals/sheets = supplementary.
- **Why it works:** Users learn spatial meaning; reduces “where am I?” errors.
- **Limitations:** Native-app biased; web needs careful analogues.
- **Inform AT:** Map challenge setup / contribution / privacy edits to consistent transition types in flow design.

### B5. Wise Design — Media button (motion accessibility)

- **URL:** https://wise.design/components/media-button
- **Pattern:** Pause/stop for auto-moving content lasting >5 seconds.
- **Why it works:** Meets common accessibility expectations for moving media.
- **Limitations:** Component-specific.
- **Inform AT:** Any looping celebration or marketing motion in-product needs user control.

### B6. Wise Design — List item accessibility notes

- **URL:** https://wise.design/components/list-item
- **Pattern:** Don’t convey meaning by colour alone; explain disabled states; careful SR labelling/order for value rows.
- **Why it works:** Financial lists are dense; SR users need structured announcements.
- **Limitations:** Wise component API specifics won’t match AT stack.
- **Inform AT:** Challenge member rows and activity rows need bespoke accessible names (especially when amounts are hidden).

### B7. Wise Design — Card cluster / savings pot imagery

- **URL:** https://wise.design/patterns/card-cluster-image
- **Pattern:** Marketing pattern showing savings pot UI; responsive stacking; alt text and plain language guidance.
- **Why it works:** Shows product truth in brand surfaces.
- **Limitations:** Pattern is editorial/marketing.
- **Inform AT:** When AT markets itself, show the real challenge progress UI rather than abstract finance stock art.

### B8. Secondary — Wise jar / savings-goal flow captures

- **URLs:** e.g. https://www.superduperui.com/apps/wise/flows/wise-create-1 ; https://uiland.design/screens/wise/...
- **Pattern:** Stepwise jar creation: currency → name → fund → confirm.
- **Why it works:** Progressive disclosure reduces cognitive load.
- **Limitations:** **Secondary** screen captures; Wise product evolves.
- **Inform AT:** Keep challenge/target setup stepwise; defer owner personal target per G1.1-01 without inventing new steps.

---

## C. Trading 212

### C1. Trading 212 marketing site visual capture

- **URL:** https://www.pretzel.design/i/f7yl3tz-commission-free-investing-for-everyone-trading-212
- **Pattern:** Dark minimal UI chrome; cyan accent; Aeonik type reported; portfolio value hero.
- **Why it works:** Scarcity of colour makes data and CTAs pop.
- **Limitations:** Third-party capture; investing context ≠ friend savings accountability; dark-default conflicts with AT social warmth preference.
- **Inform AT:** Reuse metric scarcity and single action colour discipline on light, social surfaces.

### C2. Brandfetch — Trading 212 colours

- **URL:** https://brandfetch.com/trading212.com
- **Pattern:** Public brand colour listing including `#00A7E1`, neutrals, orange secondary.
- **Why it works:** Confirms constrained palette from brand assets.
- **Limitations:** Aggregator, not a full design system.
- **Inform AT:** Prefer a short official palette over many decorative colours.

### C3. Secondary — Mozaika token decode from store screenshots

- **URL:** https://mozaika.design/ds/trading-212-mobile
- **Pattern:** Black surfaces; cyan only on interactive elements; muted secondary text.
- **Why it works:** Demonstrates accent scarcity quantitatively.
- **Limitations:** **Secondary** measurement; typography claims limited; not official.
- **Inform AT:** Critique explorations that flood screens with accent fills.

### C4. Invest platform redesign case study (ex-designer)

- **URL:** https://www.dantsonkov.com/t212-invest
- **Pattern:** Simplifying long-term investing away from CFD clutter; clearer overview and education.
- **Why it works:** Goal-oriented users need calm IA, not trader density.
- **Limitations:** Individual portfolio case study; dated relative to current app.
- **Inform AT:** Challenge dashboards should prioritise goals and commitments over chart chrome.

### C5. Historical Behance style guide (2015)

- **URL:** https://www.behance.net/gallery/24832363/Trading-212-Style-Guide
- **Pattern:** Early colour theme facelift documentation.
- **Why it works:** Shows long-running investment in visual systemisation.
- **Limitations:** **Outdated** relative to current product; use only as historical context.
- **Inform AT:** Prefer current marketing/store evidence over 2015 artifacts for Gate 2 decisions.

---

## D. Strava

### D1. Strava Help — Clubs, Challenges, and Community

- **URL:** https://support.strava.com/en-us/collections/19657598-clubs-challenges-and-community
- **Pattern:** Challenges with progress and rewards; clubs; feed; kudos; comments; private group challenges among friends.
- **Why it works:** Social accountability is a first-class product area with clear verbs.
- **Limitations:** Athletic domain; some features subscription-gated; scale differs from private friend savings groups.
- **Inform AT:** Structure challenge pages around goal, time, progress, members, and activity — mapped to AT’s private invitation-only model.

### D2. Strava partner — “Speaking Strava” (kudos definition)

- **URL:** https://partners.strava.com/resources/a-beginners-guide-to-speaking-strava
- **Pattern:** Kudos as quick thumbs-up recognition.
- **Why it works:** Near-zero friction reinforcement.
- **Limitations:** Partner marketing page; interaction semantics are product-specific.
- **Inform AT:** Consider a lightweight encouragement control on permitted feed events (design exploration — not a new mandated requirement inventing scope).

### D3. Strava developer brand guidelines (logo/colour usage)

- **URL:** https://developers.strava.com/guidelines/
- **Pattern:** Orange `#FC5200` as identifiable link/brand accent; strict logo rules.
- **Why it works:** Protects scarce brand colour.
- **Limitations:** API/partner logo rules, not full UX system.
- **Inform AT:** Protect AT’s future accent the same way — actions and key highlights only.

### D4. Strava brand guidelines excerpts (partner PDF mirror)

- **URL:** https://attachments.are.na/23309717/f9667af524c25571f14ee7e005d38100.pdf?1692900078=
- **Pattern:** Orange used judiciously; challenge badges limited to orange/white/dark orange; clubs as community hubs.
- **Why it works:** Constrained badge system stays legible on avatars/feeds.
- **Limitations:** 2021 partner guidelines; may not reflect every 2026 UI detail; third-party host.
- **Inform AT:** Milestone marks should use a tiny, consistent badge language that remains legible in feeds.

### D5. UXSnaps — lessons from Strava activity feed UI

- **URL:** https://www.uxsnaps.com/fitness-activity-feed
- **Pattern:** Personal streak before community feed; content-aware streak marks; stats row includes a recognition metric; self-generating map heroes; named achievements with clear rules.
- **Why it works:** Sequences intrinsic habit loop before social pressure; makes cards visually unique without user-authored posts.
- **Limitations:** Third-party UX critique; athletic map hero won’t translate literally.
- **Inform AT:** Lead with personal commitment/streak status; let contribution events generate feed cards; name milestones plainly.

### D6. Gamification case synthesis — Strava loops

- **URL:** https://gamification.gamebizconsulting.com/case-studies/strava/
- **Pattern:** One activity powers streak, challenges, trophies, feed, rankings; weekly streak window.
- **Why it works:** Single atomic action reduces participation friction.
- **Limitations:** Secondary analysis; ranking/segment culture can become elitist.
- **Inform AT:** Eligible contribution is the atomic action; prefer weekly commitment cadence; avoid wealth/segment-style ranking.

### D7. Clubs marketing — business.strava.com

- **URL:** https://business.strava.com/resources/grow-your-brand-strava-clubs
- **Pattern:** Clubs as ongoing community homes with posts/events.
- **Why it works:** Persistent group identity beyond one challenge.
- **Limitations:** Brand-marketing lens; AT MVP is private friend challenges, not public brand clubs.
- **Inform AT:** Keep MVP scope on private challenges; note clubs-like persistence as a **future** design consideration only if product roadmap later expands — not an MVP requirement.

---

## E. AllTrails

### E1. AllTrails style guide (PDF)

- **URL:** https://assets-global.website-files.com/650d0d523ce1729e6e4e0626/650d47c95f79fc1f3665097c_AllTrails%20Style%20Guide.pdf
- **Pattern:** Dark green `#142800` + neon green `#5DE372`; heading hierarchy; WCAG 2.1 A/AA contrast aims; no colour-only meaning; plain language; avoid directional-only instructions.
- **Why it works:** Outdoor brand stays inclusive and readable.
- **Limitations:** Partner/content style guide may be thinner than internal product DS.
- **Inform AT:** Bake contrast rules and non-colour status into Gate 2 explorations; write UI copy without “see left/right only” instructions.

### E2. Apple App of the Year announcement (AllTrails features)

- **URL:** https://www.prnewswire.com/news-releases/alltrails-named-apples-2023-iphone-app-of-the-year-302001617.html
- **Pattern:** Local community feed; stats & achievements; trail previews; navigation improvements.
- **Why it works:** Combines utility, inspiration, and celebration.
- **Limitations:** Press release; feature set is outdoor-specific.
- **Inform AT:** Pair practical progress tools with an inspiring activity surface for friends.

### E3. Red Antler — AllTrails brand work

- **URL:** https://www.redantler.com/work/all-trails
- **Pattern:** Inclusive outdoor storytelling; path framing for big and small adventures.
- **Why it works:** Lowers intimidation; welcomes beginners and experts.
- **Limitations:** Brand film/identity case, not UI spec.
- **Inform AT:** Tone should welcome money-anxious users, not only finance-confident ones.

### E4. Achievements badge swipe interaction (60fps.design)

- **URL:** https://60fps.design/shots/alltrails-achievements-badges-swipe-interaction
- **Pattern:** Horizontal badge carousel with scale emphasis on selected badge.
- **Why it works:** Makes browsing achievements feel tangible and delightful.
- **Limitations:** Motion demo; may conflict with reduce-motion if mandatory.
- **Inform AT:** Milestone history can be browsable; provide static fallback.

### E5. IXD Pratt — AllTrails design critique

- **URL:** https://ixd.prattsi.org/2025/02/design-critique-alltrails-ios-app-2/
- **Pattern:** Dual affordances (button + gesture); inline explanation for difficulty; dynamic filter result counts; pause-before-finish forcing function.
- **Why it works:** Reduces errors and evaluation gaps.
- **Limitations:** Student critique; not official AllTrails research.
- **Inform AT:** Explain statuses in place (e.g. visible-member totals); use confirmation steps for destructive/exit flows already required by product rules.

### E6. Carey Spies — AllTrails design system notes

- **URL:** https://careyspies.design/denali-launch
- **Pattern:** Semantic tokens; simplify foundations; accessibility as a system goal; move beyond ad-hoc Material/Bootstrap mixes.
- **Why it works:** Designers can assemble UI without guessing.
- **Limitations:** Personal case study; may not match current production.
- **Inform AT:** Prefer semantic foundations over one-off screen styling in later gates.

### E7. Secondary — AllTrails social newsfeed concept (Shannon Crandall)

- **URL:** https://www.shancran.com/alltrails-social-newsfeed
- **Pattern:** Friends vs community filters; likes/comments; audience picker; notification affordances.
- **Why it works:** Shows how outdoor apps think about social layering.
- **Limitations:** **Concept portfolio**, not shipped AllTrails UI — treat as inspirational only.
- **Inform AT:** Keep MVP feed scoped to approved event types; audience/privacy picking resonates with AT privacy controls.

---

## F. Cross-cutting / method references

### F1. PRS §15 Design Principles (authoritative product)

- **Path:** `/cursor/stores/self/docs/product/specification-v1.md` (§15)
- **Pattern:** Six approved discovery principles.
- **Why it works:** Prevents Gate 2 from drifting into generic SaaS or decorative finance UI.
- **Limitations:** Principles are directional, not a visual system.
- **Inform AT:** All research recommendations must map back here (`design-principles.md`).

### F2. Gate 1.1 product rules amendment

- **Path:** `/cursor/stores/self/docs/product/amendments/gate-1-1-product-rules.md`
- **Pattern:** Privacy+targets, milestones, recovery, pauses, lifecycle, etc.
- **Why it works:** Defines states the UI must express honestly.
- **Limitations:** Not a design doc.
- **Inform AT:** Territories and flows must visualise these states — not invent alternate rules.

### F3. Reconciled vision (design principles table)

- **Path:** `/cursor/stores/self/docs/product/vision.md`
- **Pattern:** Restates §15 and social-savings positioning.
- **Why it works:** Keeps research tied to product mission.
- **Limitations:** Defers visual identity to Gate 2.
- **Inform AT:** Use as north star copy when writing design rationale.

---

## G. Reference quality legend

| Tag | Meaning |
| --- | --- |
| Official product/brand/DS | Highest weight for Observed patterns |
| Help centre / accessibility statement | High weight for behaviour & a11y |
| Reputable case study / critique | Medium — triangulate |
| Secondary capture / portfolio concept | Low — inspirational; verify before locking direction |
| Internal product docs | Binding for requirements; read-only in this gate |

---

## H. Gaps / further verification suggested in Gate 2.2

- Live App Store screenshot passes for current Strava/AllTrails challenge UIs (patterns shift frequently).
- Trading 212 official brand PDF if obtainable (current public system docs are thin).
- Monzo in-app (vs web) token documentation if any is publicly released later.
- Material Design 3 motion/accessibility pages when mapping predictable patterns to web components (PRS §15 reference) — consult at flow/system time, not as visual identity.
