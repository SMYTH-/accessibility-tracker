# Gate 2.1 — Competitor & Analog Analysis

| Field | Value |
| --- | --- |
| Gate | 2.1 — Design Research |
| Status | Ready for product-owner review |
| Creative preference (research only) | Fintech clarity (Monzo, Wise, Trading 212) + social accountability (Strava, AllTrails) |
| Product baseline | PRS v1.0 §15 and §10.1; Gate 1.1 amendment (read-only) |
| Scope | Observed patterns and design recommendations only — no product-requirement changes |

**How to read this document:** **Observed** = patterns documented from public product, brand, or design-system sources. **Recommendation** = creative guidance for Gate 2 exploration — not a binding product constraint, and not a licence to invent MVP features. **Approved MVP** = behaviours already frozen in the PRS / Gate 1.1. **Optional design exploration** = interaction ideas that may be moodboarded later; they are **not** MVP requirements.

---

## 1. Research frame

Accountability Tracker is a **social savings accountability** product (not a bank, budgeter, or custody app). Users report savings manually; money stays in their own banks. Design may therefore learn from:

- **Clarity and trust** in consumer fintech (amounts, progress, privacy, self-reported labelling).
- **Habit loops and group energy** in social activity products (feeds, challenges, streaks, recognition).

Cross-cutting principles from PRS §15: **Trust Before Decorations**, Social by Design, Reward Meaningful Progress, Distinctive Visual Identity, Accessible and Predictable, Mobile First.

Accessibility target from PRS §10.1: **WCAG 2.2 AA** (do not raise or lower this bar in research).

---

## 2. Product-by-product snapshot

### 2.1 Monzo — fintech clarity + warm personality

| Dimension | Observed |
| --- | --- |
| Typography | Proprietary Monzo Sans (Display for marketing hierarchy; Text for UI/body). Bold, friendly grotesk character; marketing also uses expressive display faces (e.g. Oldschool Grotesk in brand refresh). |
| Colour | Hot coral as primary brand signal, with deep navy and soft white; secondary palette for energy; intentional restraint of coral in UI where red can read as error ([Monzo brand refresh](https://monzo.com/blog/weve-had-a-little-makeover); [web design-system notes](https://monzo.com/blog/reimagining-monzo-com-building-a-modular-high-fidelity-web-design-system-that-scales)). |
| Money presentation | Large primary balance; pots named and imaged as goals; goal amount under saved amount with progress bar ([Pots Goals](https://monzo.com/blog/2018/08/02/pots-goals); [Pots marketing](https://monzo.com/features/pots)). |
| Navigation / IA | Account-centric home; pots as persistent goal “vision board” on home; progressive disclosure for savings types. |
| Motion / a11y | Semantic tokens; WCAG-oriented web system; app respects OS reduce-motion; high-contrast themes in Labs; accessibility statement emphasises OS text size / colour / screen reader ([accessibility statement](https://monzo.com/accessibility-statement); community reduce-motion note). |

**Recommendation (creative):** Learn from Monzo’s *clarity of money hierarchy* and *goal-as-named-object* feeling. For Accountability Tracker, the analogous “object” is the challenge + personal target, with self-reported amounts labelled clearly. Avoiding literal coral, card motif, or proprietary type is a **creative recommendation** to keep exploration original — not a product ban on any specific hue or face.

### 2.2 Wise — fintech clarity + systemised foundations

| Dimension | Observed |
| --- | --- |
| Typography | Official system: Inter as default functional face; Wise Sans for short, bold display / success moments; international glyphs used sparingly ([wise.design typography](https://wise.design/foundations/typography)). |
| Colour | Bright Green `#9FE870` + Forest Green `#163300` + white / green-tinted neutrals; secondary palette introduced after green is established; product screens are white-space heavy with Forest Green for interactivity and Bright Green as accent ([wise.design colour](https://wise.design/foundations/colour)). |
| Money / goals | Jars / savings-goal flows emphasise currency, name, funding, and progress; marketing patterns show app UI with savings pots ([Card Cluster Image](https://wise.design/patterns/card-cluster-image)). |
| Motion | Snappy, fluid, intuitive — not hyperactive; natural easing; flashing-colour limits; captions/transcripts for video; pause control for auto-moving media >5s ([motion](https://wise.design/foundations/motion-system); [media button](https://wise.design/components/media-button)). |
| Transitions | Upwards = new flow; sideways = continuation; modals/sheets for supplementary tasks ([transitions](https://wise.design/foundations/transitions)). |
| Accessibility | Colour combinations documented as good/bad; content greys with green tint; list items warn against colour-only meaning; custom screen-reader labelling guidance. |

**Recommendation (creative):** Treat Wise as a **reference for design-system maturity** — semantic colour roles, content greys, intentional motion, transition grammar. Prefer original type and palette choices over adopting Wise green or Inter-as-brand (aligns with PRS Distinctive Visual Identity and project frontend preferences). These are creative guidance, not locked token constraints.

### 2.3 Trading 212 — fintech clarity + data density

| Dimension | Observed |
| --- | --- |
| Visual system | Dark, minimal product chrome; scarce cyan action colour (~`#00A7E1` / `#01A7E1`) reserved for interactive/must-notice elements; muted greys for secondary text (marketing site / store-listing colour analyses; [pretzel.design capture](https://www.pretzel.design/i/f7yl3tz-commission-free-investing-for-everyone-trading-212); Mozaika token decode from store screenshots). |
| Typography | Marketing/product reporting cites Aeonik (weights ~300–500) and compact metric hierarchy. |
| Data presentation | Portfolio value as hero metric; charts and performance as primary content; high information density with restrained chrome. |
| IA | Invest/trade platforms historically struggled with clutter; redesign case studies emphasise simplifying long-term goals vs trading noise ([Invest platform case study](https://www.dantsonkov.com/t212-invest)). |

**Recommendation (creative):** Borrow **metric scarcity** (one primary number, one accent action colour, muted secondary) for personal progress and visible-member totals. Prefer not defaulting Accountability Tracker to dark-mode-first (social warmth preference); apply the density discipline without the trading aesthetic. Accent and mode choices remain open for Gate 2.2 exploration.

### 2.4 Strava — social accountability + habit loops

| Dimension | Observed |
| --- | --- |
| Brand colour | Strava Orange `#FC5200` used sparingly for key actions — not large backgrounds ([brand guidelines excerpts](https://developers.strava.com/guidelines/); partner brand PDF). |
| Core loop | One recorded activity feeds streak, challenges, achievements, feed, and rankings ([gamification case synthesis](https://gamification.gamebizconsulting.com/case-studies/strava/)). |
| Feed | Activity-generated cards (map + metrics + achievements); kudos as one-tap recognition; comments; visibility controls ([Help: Clubs/Challenges/Community](https://support.strava.com/en-us/collections/19657598-clubs-challenges-and-community)). |
| Streaks | Weekly streak framing (activity within a week window); personal streak often surfaces before community feed ([UXSnaps feed lessons](https://www.uxsnaps.com/fitness-activity-feed)). |
| Challenges | Clear goal, time remaining, progress, rewards, leaderboards; private group challenges among friends ([Strava Help collections](https://support.strava.com/en-us/collections/19657598-clubs-challenges-and-community)). |
| Achievements | Named titles / trophies with transparent earning rules; identity-worthy recognition rather than opaque badges. |

**Recommendation (creative):** Map Strava’s loop to Accountability Tracker’s **approved MVP** **eligible contribution** as the single meaningful action that advances personal progress, weekly commitment, milestones (25/50/75/100% per G1.1-08), streak (with automatic recovery per G1.1-09), and privacy-respecting activity feed. Prefer “personal status before social scroll.” Do not copy orange, map heroes, or competitive segment culture — wealth/competition framing conflicts with Reward Meaningful Progress. **Kudos-style reactions are Observed elsewhere and may be explored as optional design explorations only — they are not MVP requirements.**

### 2.5 AllTrails — social progress + approachable exploration

| Dimension | Observed |
| --- | --- |
| Brand | Dark green `#142800` + neon green `#5DE372`; inclusive outdoor storytelling ([AllTrails style guide PDF](https://assets-global.website-files.com/650d0d523ce1729e6e4e0626/650d47c95f79fc1f3665097c_AllTrails%20Style%20Guide.pdf); Red Antler brand work). |
| Progress / achievements | Stats & achievements experiences; badge carousels with motion emphasis on selected badge ([60fps.design](https://60fps.design/shots/alltrails-achievements-badges-swipe-interaction); Apple App of the Year feature list). |
| Social | Local/community activity feeds; follow friends; share activities; likes/comments patterns in product and design explorations. |
| UX clarity | Difficulty labels with inline explanation; dynamic filter feedback; pause-before-finish forcing function on live tracking ([IXD critique](https://ixd.prattsi.org/2025/02/design-critique-alltrails-ios-app-2/)). |
| Accessibility | Style guide cites WCAG 2.1 A/AA aims; 4.5:1 normal text / 3:1 large; don’t convey meaning by colour alone; heading order and plain language. |

**Recommendation (creative):** Borrow **approachable progress storytelling**, **explain-in-place labels** (e.g. “visible-member total” per G1.1-06), and **achievement browsing that celebrates completion without shaming**. Avoid trail-map literalism and neon-green brand cloning as creative guidance for originality — not as a hard product palette ban. Competitor WCAG 2.1 citations are Observed; Accountability Tracker’s target remains **WCAG 2.2 AA** (PRS §10.1).

---

## 3. Cross-cutting analysis by research objective

### 3.1 Typography, hierarchy, and financial data presentation

**Observed**

- Fintech leaders separate **display** (moments of brand/celebration) from **functional** type (balances, forms, labels).
- Primary monetary figure is the largest number on screen; supporting figures (target, remaining, %) sit in a fixed secondary tier.
- Tabular / consistent numeral treatment and muted secondary labels keep dense screens scannable (Trading 212 / Strava metric grids).
- Goal containers are named and personalised (Monzo pots; Wise jars).

**Recommendations for Accountability Tracker (creative)**

- Explore a three-tier type system: celebration display (milestones/streaks), UI sans for chrome, and a dedicated **financial numerals** style (weight + tracking tuned for GBP amounts). Exact families remain open.
- Challenge dashboard hierarchy: (1) personal progress amount vs target, (2) commitment status this week, (3) visible-member group progress with explicit labelling, (4) recent activity.
- Always pair amounts with context labels (“self-reported”, “visible members”) — **Trust Before Decorations**.

### 3.2 Mobile navigation and information architecture

**Observed**

- Mobile-first products use shallow bottom navigation with a dominant “home” that answers “how am I doing?” first.
- Challenges/groups live as first-class destinations, not buried settings (Strava Groups; challenge detail pages).
- Fintech flows use directional transition grammar (Wise upwards vs sideways) so users know if they started a new task or continued one.
- AllTrails uses dual affordances (explicit button + gesture) for primary modes.

**Recommendations (creative)**

- Mobile-first web shell: Home (personal + active challenges), Challenge (deep context), Activity (feed), Profile/Settings — exact labels to be decided in Gate 2.2 IA, not invented as requirements here.
- Keep invitation, privacy, pause, and correction flows as intentional “upward” tasks with clear dismiss/back.
- Desktop = same IA, denser multi-pane layout; do not invent a separate product model.

### 3.3 Progress visualisation and achievements

**Observed**

- Progress bars under balances (Monzo goals); rings/percentages in savings-goal patterns.
- Milestone celebrations at clear thresholds.
- Achievements work best when **named**, **rule-transparent**, and **worth repeating to friends** (Strava); AllTrails emphasises browsable badge collections with motion focus.

**Recommendations (creative + MVP-aligned)**

- Visualise **personal % of target** and **weekly commitment fulfilment** as primary progress; surface G1.1-08 milestones (25/50/75/100%) as celebration moments, not wealth leaderboards (**approved MVP** behaviours).
- Group progress must use **visible-member** aggregates only (G1.1-06) with non-inferential treatment of private members (**approved MVP**).
- Prefer consistency milestones (streaks, commitments kept) over amount-based ranking — Reward Meaningful Progress.

### 3.4 Social activity feeds and group challenges

**Observed**

- Strong feeds are **event-generated**, not composition-heavy (Strava activities; AllTrails community activity).
- Lightweight recognition (kudos) outperforms obligatory posting.
- Challenge pages show: goal, time left, personal progress, group context, and who joined.
- Feed noise is a known failure mode (e.g. flood of “joined challenge” events) — concatenation/filtering matters.

**Recommendations**

- **Approved MVP:** Feed items from existing product events only (approved joins, reported contributions subject to privacy, commitments completed, milestones, challenge completed) — as already scoped in reconciled requirements; do not invent new social post types in research.
- **Optional design exploration only (not MVP):** A one-tap encouragement / kudos-analogue affordance on permitted activity may be moodboarded in later design gates if desired. It must not be treated as an MVP requirement or used to expand product scope.
- Challenge home = shared purpose + individual targets side-by-side (PRS model), not equal-split pots.

### 3.5 Motivation, streaks, and positive reinforcement

**Observed**

- Strava: weekly streak windows; personal streak before social content; recovery-friendly framing vs daily death spirals.
- Monzo: celebrate goal reached; personal imagery for emotional attachment to goals.
- AllTrails: stats snapshots that inspire return without only shaming incomplete trails.

**Recommendations (creative + MVP-aligned)**

- Align streak UI with approved **automatic recovery** and **prospective pause** rules (G1.1-09, G1.1-11): copy and visuals must feel non-punitive when a period is missed then recovered.
- Celebrate consistency and milestone crossings; avoid “top saver” wealth flex.
- Personal goal naming/imagery (challenge title + personal target framing) can create Monzo-like attachment without custody metaphors that imply money is held in-app.

### 3.6 Colour, motion, and interaction design

**Observed**

- Strong brands pick one scarce accent and protect it (Strava orange; Trading 212 cyan; Monzo coral used carefully in UI).
- Wise documents motion principles and transition types; Monzo ties motion to delight but respects reduce-motion.
- AllTrails / Strava use motion to emphasise selection and success, not decoration.

**Recommendations (creative)**

- Prefer a distinctive primary accent that is not a near-clone of hot coral, Wise green, Strava orange, or Trading cyan, and that does not collide with semantic success/error roles. This is **creative guidance for originality**, not a binding ban list of hues.
- Motion budget: progress fill, milestone celebration, feed item entrance — all honour `prefers-reduced-motion` (supports WCAG 2.2 AA expectations).
- Interaction: large tap targets for **approved MVP** “record contribution”; predictable Material Design 3 patterns for sheets/dialogs without Material aesthetic cloning (PRS §15). Encouragement controls remain **optional design exploration only**.

### 3.7 Accessibility and responsive behaviour

**Observed**

- Wise publishes contrast pairings and SR labelling guidance; Monzo publishes accessibility commitments and high-contrast experiments; AllTrails style guide cites WCAG 2.1 A/AA.
- Responsive fintech marketing systems stress content density across locales; AllTrails warns against directional-only instructions.

**Recommendations (binding a11y target + creative layout guidance)**

- Target **WCAG 2.2 AA** as the accessibility floor for Gate 2 exploration — exact PRS §10.1 target. Include keyboard accessibility, visible focus states, semantic controls, accessible validation, sufficient colour contrast, and screen-reader-compatible information. Do not invent a higher or lower bar.
- Competitor documents that cite WCAG 2.1 are **Observed** only; they do not redefine AT’s target.
- Financial figures must remain legible when OS text scaling is increased; avoid locking key amounts in non-wrapping hero treatments that clip.
- Status (missed / recovered / paused / private) must never rely on colour alone — icon + text.
- Responsive: single-column mobile challenge dashboards; desktop may show personal + group progress concurrently without adding new metrics.

---

## 4. Synthesis — how the two clusters work together

| Fintech clarity contributes | Social accountability contributes | Combined for Accountability Tracker |
| --- | --- | --- |
| Trustworthy amount hierarchy | Event-generated feed | Clear money + living social proof |
| Named goals / pots / jars | Group challenges & clubs | Shared challenge with independent targets |
| Scarce accent + calm chrome | Streaks & (optional) lightweight recognition | Motivation without dashboard clutter |
| Explicit privacy & labelling | Visibility controls on activities | Privacy-first social finance |
| Reduce-motion & contrast systems | Achievement storytelling | Inclusive celebration of consistency |

**Anti-patterns to avoid (Observed failure risks + creative guidance)**

- Trading-floor dark dashboards that feel cold for friend groups.
- Public competitive leaderboards that emphasise who saved the most money.
- Generic purple/gradient SaaS or cream-serif fintech clichés (conflicts with Distinctive Visual Identity and project design preferences — creative guidance).
- Composition-heavy social feeds that demand posting instead of logging a contribution.
- Direct imitation of any competitor’s proprietary type, colour, or illustration system — prefer original exploration informed by principles, not clone palettes.

---

## 5. Open design questions for Gate 2.2+ (not product-requirement changes)

These are design-exploration questions only; they do not alter Gate 1 rules:

1. Exact mobile IA labels and tab count.
2. Visual metaphor for progress (bar vs ring vs track) that stays distinctive.
3. Whether (and how) to explore an optional encouragement interaction (kudos analogue) — **not an MVP requirement**.
4. How private members appear in lists without leaking amounts.
5. Motion language for milestone 25/50/75/100% celebrations.

---

## 6. Provenance

- Product constraints: `docs/product/specification-v1.md` §15 and §10.1; Gate 1.1 amendment; reconciled vision/requirements (read-only).
- Competitive sources listed in `docs/design/research/references.md`.
- Creative preference authorised for research only; **not** a final visual identity.
