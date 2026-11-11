# Accountability Tracker

Product Requirements Specification — v1.0

| Field | Value |
| --- | --- |
| Project | Accountability Tracker |
| Product type | Social savings accountability SaaS |
| Document version | 1.0 |
| Approval date | 11 November 2026 |
| Status | Gate 1 Approved — Frozen Baseline |
| Current milestone | Gate 2 — Design Discovery |
| Implementation status | Not authorised |

---

## 1. Executive Summary

Accountability Tracker is a social savings accountability platform designed to help groups of friends save money consistently through shared challenges, individual financial goals, progress tracking and gamification.

The application encourages users to develop better savings habits by introducing social accountability, visible progress, commitment tracking and milestone recognition.

Unlike conventional budgeting applications, Accountability Tracker focuses on behavioural motivation and accountability, rather than expense categorisation or financial management.

Users save money in their own external bank accounts. The application does not hold, transfer, invest, manage or custody funds.

The initial MVP uses manually recorded, self-reported savings contributions.

Future versions may introduce read-only Open Banking integrations to verify savings progress through regulated providers.

### 1.1 Product Vision

Make saving money more motivating by turning individual financial goals into shared commitments, friendly challenges and measurable progress.

### 1.2 Product Mission

Help friends build sustainable saving habits by creating an environment where financial commitments are visible, progress is celebrated and participants encourage one another to reach their goals.

### 1.3 Core Value Proposition

Accountability Tracker combines:

- Individual savings targets.
- Shared group challenges.
- Social accountability.
- Transparent progress tracking.
- Commitment-based gamification.
- Positive reinforcement.
- Privacy controls.

The product should feel like a motivating social experience rather than a traditional financial dashboard.

---

## 2. Target Audience

### 2.1 Primary Audience

Groups of friends who want to save money together or encourage one another to develop better financial habits.

Example scenarios include:

- Friends saving for a holiday.
- Groups saving for festivals or events.
- Friends completing a 90-day savings challenge.
- Individuals encouraging each other to build emergency funds.
- Friends working towards different personal savings goals within a shared challenge.

### 2.2 Secondary Audiences

Potential future audiences include:

- Couples.
- Households.
- University students.
- Workplace savings groups.
- Online communities.

These are not primary MVP audiences.

### 2.3 User Needs

Users need to:

1. Create a clear savings commitment.
2. Set a realistic personal target.
3. Participate in a shared challenge.
4. Record savings without moving money through the application.
5. Understand their progress.
6. See how their friends are progressing.
7. Receive encouragement and recognition.
8. Recover from missed commitments.
9. Control the visibility of their financial information.
10. Trust the accuracy and security of the application.

---

## 3. Approved Product Decisions

The following decisions were approved during Gate 1 and form the frozen product baseline.

| Category | Approved Decision |
| --- | --- |
| Primary audience | Friends saving together |
| Platform | Mobile-first responsive web application |
| Challenge model | Individual savings targets within shared challenges |
| Challenge access | Private and invitation-only |
| Membership approval | Challenge owner approves membership requests |
| Savings targets | Each participant chooses their own target |
| Challenge duration | Custom start and end dates |
| Savings tracking | Manually recorded, self-reported contributions |
| Default visibility | Savings amounts visible to challenge members |
| Privacy | Participants can opt out of sharing amounts |
| Private contributions | Excluded from other members’ visible group totals |
| Commitments | Weekly savings commitments |
| Time zone | Commitment periods use the challenge’s configured time zone |
| Missed commitments | Marked missed, with recovery and pause options |
| Pauses | Apply prospectively |
| Contributions | Corrections allowed with audit history |
| Target changes | Prospective for commitment assessments |
| Membership exit | Access revoked; active-member totals adjusted |
| Historical data | Minimum necessary history retained |
| Financial custody | No money held, transferred or invested |
| MVP monetisation | No paid subscriptions |
| Future monetisation | Freemium model to be validated |

Approved decisions must not be silently modified by AI agents.

Any proposed change requires a documented change request and explicit product-owner approval.

---

## 4. Core Product Model

### 4.1 Challenges

A challenge represents a shared savings initiative involving multiple participants.

Each challenge contains:

- Unique identifier.
- Challenge title.
- Optional description.
- Owner.
- Start date.
- End date.
- Currency.
- Configured time zone.
- Challenge status.
- Approved participants.
- Individual savings goals.
- Contribution activity.
- Progress and milestone information.

Challenges are private by default.

Only authorised members may access challenge information.

### 4.2 Challenge Ownership

The user who creates a challenge becomes its owner.

The owner can:

- Manage invitations.
- Approve or decline membership requests.
- View approved members.
- Manage membership.
- Access challenge settings.

Ownership transfer and owner-departure behaviour remain detailed design decisions.

### 4.3 Individual Savings Goals

Every participant chooses their own savings target within a challenge.

For example:

Challenge: Summer Holiday Fund

- Participant A: £1,000 target.
- Participant B: £750 target.
- Participant C: £1,500 target.
- Participant D: £500 target.

The challenge represents a shared purpose, but individual commitments remain independent.

Participants are not required to contribute equal amounts.

### 4.4 Group Progress

Group progress is calculated using eligible participant contributions and targets.

The application must distinguish:

- A user’s personal reported savings.
- A user’s personal target.
- Their percentage progress.
- The combined visible reported savings.
- The combined visible target.
- The challenge’s overall participation status.

Members who opt out of sharing monetary amounts must have their private contributions excluded from other members’ visible group totals.

The interface must not misrepresent visible totals as the complete amount saved by every participant.

---

## 5. MVP Functional Requirements

All requirements in this section are considered P0 unless otherwise stated.

### AUTH-01 — Authentication

Users must be able to:

- Register an account.
- Verify their email address.
- Sign in securely.
- Sign out.
- Recover access to their account.

**Acceptance Criteria**

- Authentication is required for private challenge access.
- Invalid credentials do not grant access.
- Sessions are handled securely.
- Password recovery uses secure, time-limited mechanisms.
- Unauthorised users cannot access protected resources.

### PROF-01 — User Profiles

Users must be able to:

- Set a display name.
- View their profile.
- Update basic profile information.

Profile information must not expose unnecessary personal or financial data.

### CHAL-01 — Create Challenge

Authenticated users can create a private challenge.

**Required fields:**

- Challenge name.
- Start date.
- End date.
- Currency.
- Time zone.

**Optional fields:**

- Description.

**Acceptance Criteria**

- Required fields are validated.
- The end date must follow the start date.
- Challenge creation is atomic.
- The creator becomes the owner.
- The challenge is private.
- Successful creation leads to the challenge overview.
- Invalid submissions produce clear error messages.

### CHAL-02 — Invitations

Challenge owners can generate private invitation links.

**Acceptance Criteria**

- Invitation links cannot be used to bypass membership approval.
- Links can be revoked.
- Links have an expiry mechanism.
- Invitees must authenticate before requesting membership.
- Invalid or expired links cannot create membership requests.
- Invitations do not expose private challenge financial data.

### CHAL-03 — Membership

Invitees can request to join a challenge.

Challenge owners can approve or decline requests.

**Acceptance Criteria**

- Pending users cannot access private financial information.
- Approval grants the appropriate membership permissions.
- Declined users do not gain access.
- Members can leave challenges.
- Owners can remove members.
- Removed members immediately lose access.
- Duplicate memberships are prevented.

### GOAL-01 — Individual Savings Targets

Every approved participant can create their own savings target.

**Acceptance Criteria**

- Targets are positive monetary amounts.
- Targets use the challenge currency.
- Different participants may choose different amounts.
- Participants cannot modify another member’s target.
- Target changes are recorded.
- Changes to targets apply prospectively for commitment assessment.

### GOAL-02 — Weekly Commitments

Participants can define a recurring weekly savings commitment.

For example:

A participant commits to saving £25 per week.

**Acceptance Criteria**

- Commitments must be valid positive amounts.
- Commitments are assessed using the challenge time zone.
- Eligible contributions determine whether a commitment is met.
- Completed, missed and paused periods are distinguishable.
- Historical assessments are not silently rewritten by later commitment changes.

### SAVE-01 — Record Contributions

Participants can manually record money saved outside the application.

Each contribution contains:

- Amount.
- Currency.
- Associated user.
- Associated challenge.
- Contribution date.
- Creation timestamp.
- Relevant audit information.

**Acceptance Criteria**

- Only authorised participants can record contributions.
- Users cannot create contributions for other participants.
- Amounts must be positive.
- Monetary values must use precise minor-unit calculations.
- Invalid amounts are rejected.
- Duplicate submissions are prevented through idempotency.
- Successful contributions update progress.
- Contributions are clearly labelled as self-reported.

### SAVE-02 — Correct Contributions

Participants can correct previously recorded contributions.

**Acceptance Criteria**

- Users can only correct their own contributions.
- Corrections preserve an audit history.
- Historical changes are traceable.
- Affected progress is recalculated.
- Relevant milestones and commitment assessments are updated according to documented rules.
- Corrections do not silently destroy previous records.

### DASH-01 — Personal and Group Dashboard

The challenge dashboard must display:

- Challenge title.
- Challenge dates.
- Challenge status.
- Participant information.
- Personal savings target.
- Personal reported savings.
- Personal progress percentage.
- Visible group progress.
- Recent permitted activity.
- Relevant streaks and milestones.

**Acceptance Criteria**

- Calculations are accurate.
- Private amounts are not exposed.
- Empty states are provided.
- Loading and error states are handled.
- Layouts are responsive.
- Financial information is clearly labelled.

### SOC-01 — Social Activity

Members can view a challenge activity feed.

Potential activity includes:

- New approved participants.
- Reported savings contributions.
- Completed weekly commitments.
- Milestones reached.
- Challenge completion.

**Acceptance Criteria**

- Activity respects privacy preferences.
- Hidden amounts do not appear in feeds.
- Activity cannot be used to bypass membership permissions.
- Financial information is not publicly accessible.

### GAME-01 — Commitment Streaks

The application tracks consistent completion of weekly commitments.

**Acceptance Criteria**

- A week is completed when eligible savings meet the commitment.
- Missed periods are recorded.
- Paused periods are distinguishable from missed periods.
- Pauses apply prospectively.
- Users can recover from missed commitments.
- Recovery allows a new streak to begin.
- Historical missed periods remain accurate.
- Streak calculations are deterministic and testable.

### PRIV-01 — Financial Visibility

Savings amounts are visible to fellow challenge members by default.

Participants must be informed of this before joining.

They may opt out of sharing monetary amounts.

**Acceptance Criteria**

- Financial visibility is explained before participation.
- Users explicitly acknowledge the disclosure.
- An opt-out is available.
- Privacy is enforced server-side.
- Hidden amounts cannot be retrieved through unauthorised API requests.
- Hidden amounts do not appear in group totals visible to other members.
- Activity feeds respect visibility settings.
- Privacy changes take effect across relevant interfaces.
- Users are informed that previously viewed information cannot be made unseen.

### ACC-01 — Account Controls

Users must be able to:

- Export their personal information.
- Request account deletion.
- Understand how their data is handled.

**Acceptance Criteria**

- Exported information is limited to data the user is authorised to receive.
- Account deletion revokes active access.
- Personal data is deleted or anonymised according to documented retention requirements.
- Necessary historical records are handled consistently with privacy obligations.

### NOTIF-01 — Essential Notifications

The MVP must support essential account and invitation-related emails.

Examples:

- Email verification.
- Account recovery.
- Membership approval or rejection.

Optional weekly reminders and achievement notifications are P1.

---

## 6. Gamification Rules

Gamification should encourage sustainable saving habits.

It must not encourage users to save beyond their financial means.

### 6.1 Core Mechanics

The MVP includes:

- Weekly commitment tracking.
- Current streak.
- Completed commitment history.
- Missed commitment indicators.
- Progress milestones.
- Challenge completion recognition.

### 6.2 Fairness

Users should be rewarded for consistency relative to their own commitments.

Raw savings amounts should not be the primary measure of achievement.

For example, a participant consistently saving £20 per week should be recognised for meeting their commitment, even if another participant saves £200.

### 6.3 Missed Commitments

When a weekly commitment is not met:

- The period is marked missed.
- Historical progress is preserved.
- The user can continue saving.
- A new streak can begin.
- The interface should provide supportive feedback.

### 6.4 Pauses

Participants can pause commitments prospectively.

Paused periods must not be represented as successful savings weeks.

The application must distinguish completed, missed and paused periods.

### 6.5 Excluded Mechanics

The MVP must not include:

- Financial penalties.
- Real-money wagering.
- Cash prizes.
- Public wealth rankings.
- Punitive financial scoring.
- Pressure to save unaffordable amounts.

---

## 7. Privacy and Financial Data

### 7.1 Data Classification

Although the application does not hold money, it processes potentially sensitive personal financial information.

Financial data must be treated as confidential.

### 7.2 Privacy Defaults

Within a private challenge:

- Monetary amounts are visible to approved members by default.
- Users are informed before joining.
- Users may opt out.
- Opted-out amounts are excluded from other members’ visible group totals.
- Private financial information is never exposed to pending members or unauthorised users.

### 7.3 Data Access

Access must be based on authenticated identity, membership and permissions.

Client-side visibility controls are not sufficient.

All sensitive operations require server-side authorisation.

### 7.4 Auditability

Contribution corrections and relevant changes must be auditable.

Audit records should capture appropriate information about:

- The actor.
- The affected record.
- The action.
- The timestamp.
- The relevant previous and updated values.

Audit data must itself be protected from unauthorised access.

### 7.5 Data Minimisation

Collect only the information required to provide the service.

The MVP does not require:

- Bank account credentials.
- Bank account numbers.
- Transaction feeds.
- Identity documents.
- Payment card details.
- Access to users’ external savings accounts.

### 7.6 Regulatory Considerations

Before public beta, complete the appropriate UK GDPR and privacy assessments, including:

- Lawful basis and transparency.
- Data minimisation.
- Retention and deletion.
- User rights.
- Processor arrangements.
- Security safeguards.
- International data transfers where relevant.

Future Open Banking features require a separate regulatory and integration assessment.

---

## 8. Membership and Challenge Lifecycle

### 8.1 Joining

A participant must:

1. Receive a valid invitation.
2. Authenticate.
3. Request membership.
4. Receive owner approval.
5. Review financial visibility disclosures.
6. Confirm participation.

Only then may they access the challenge’s protected information.

### 8.2 Leaving

When a member leaves:

- Their active membership ends.
- Their access is revoked.
- Their contributions are excluded from current active-member totals.
- Minimum necessary historical information is retained.
- Personal information is handled under documented retention and deletion rules.

### 8.3 Removal

Challenge owners can remove participants.

Removal must immediately revoke access.

### 8.4 Challenge Completion

A challenge reaches its end date and transitions to a completed state.

The application presents a summary of eligible reported savings, participation and milestones.

The precise rules for post-completion corrections and archival access must be defined before implementation.

---

## 9. Core User Journeys

### Journey A — Create a Challenge

1. Register or sign in.
2. Select Create Challenge.
3. Enter challenge information.
4. Confirm the details.
5. Create the challenge.
6. Receive an invitation link.
7. Share it with friends.

**Success:** A private challenge exists and the owner can invite participants.

### Journey B — Join a Challenge

1. Open invitation link.
2. Sign in or register.
3. Review challenge information.
4. Request membership.
5. Wait for owner approval.
6. Review visibility information.
7. Choose privacy preferences.
8. Set an individual savings target.
9. Join the challenge experience.

**Success:** The participant can access the challenge with appropriate permissions.

### Journey C — Record Savings

1. Open a challenge.
2. Select Record Savings.
3. Enter an amount.
4. Confirm the contribution.
5. View updated personal progress.
6. See the relevant permitted activity.

**Success:** The contribution is recorded exactly once and calculations are correct.

### Journey D — Review Group Progress

1. Open a challenge.
2. View personal progress.
3. Review visible member progress.
4. Review group activity.
5. View milestones and commitments.

**Success:** The user understands how the group is progressing without seeing private financial information.

### Journey E — Recover from a Missed Week

1. Open the challenge.
2. See the missed commitment.
3. Review progress and available actions.
4. Continue contributing or pause future commitments.
5. Begin rebuilding their streak.

**Success:** The user can resume participation without historical information being falsified.

---

## 10. Non-Functional Requirements

### 10.1 Accessibility

Target WCAG 2.2 AA.

Include:

- Keyboard accessibility.
- Visible focus states.
- Semantic controls.
- Accessible validation.
- Sufficient colour contrast.
- Screen-reader-compatible information.
- Reduced-motion support.

### 10.2 Responsive Design

The application must be designed mobile-first.

Support modern mobile, tablet and desktop layouts.

Core workflows must remain usable on small screens.

### 10.3 Reliability

Financial calculations must be deterministic.

Avoid floating-point monetary arithmetic.

Use database transactions for related changes.

Prevent accidental duplicate submissions.

### 10.4 Security

Include:

- Secure authentication.
- Server-side authorisation.
- Least-privilege access.
- Input validation.
- Secure session handling.
- Protection against common web vulnerabilities.
- Appropriate rate limiting.
- Encryption in transit and at rest.
- Secret management.
- Audit logging.
- Dependency security review.

### 10.5 Testing

Every feature requires appropriate automated coverage.

The testing strategy must include:

**Unit tests**

- Financial calculations.
- Commitment schedules.
- Streak rules.
- Validation.
- Progress calculations.

**Integration tests**

- Database operations.
- Membership permissions.
- Contribution corrections.
- Privacy enforcement.
- Transactional behaviour.

**End-to-end tests**

- Authentication.
- Challenge creation.
- Invitations.
- Membership approval.
- Savings recording.
- Privacy changes.
- Challenge completion.

**Security testing**

- Unauthorised access.
- Cross-user data exposure.
- Privilege escalation.
- Input manipulation.

### 10.6 Quality Gates

A feature is complete only when:

- Acceptance criteria pass.
- Relevant automated tests pass.
- TypeScript and lint checks pass.
- Accessibility is reviewed.
- Responsive layouts are reviewed.
- Security-sensitive changes are reviewed.
- Outstanding defects are documented.
- Product-owner approval is obtained where required.

---

## 11. MVP Exclusions

The following are explicitly excluded from MVP:

- Open Banking.
- Bank account integrations.
- Money transfers.
- Custody of funds.
- Payment processing.
- Cash prizes.
- Financial penalties.
- Public challenges.
- Public leaderboards.
- Direct messaging.
- Real-time group chat.
- AI-generated financial advice.
- Native mobile applications.
- Subscription billing.
- Employer programmes.
- Financial product recommendations.

Any proposed addition requires scope review.

---

## 12. Future Product Roadmap

### Phase 1 — MVP

Validate whether social accountability improves engagement with personal savings goals.

**Core capabilities:**

- Private challenges.
- Individual goals.
- Manual contributions.
- Shared progress.
- Commitment streaks.
- Privacy controls.

### Phase 2 — Social Engagement

Potential additions:

- Reactions.
- Encouragement messages.
- Achievement badges.
- Challenge templates.
- Improved reminders.
- Expanded social challenges.

### Phase 3 — Verified Savings

Potential additions:

- Read-only Open Banking.
- Verified contribution detection.
- Connected savings accounts.
- Automated progress updates.
- Reconciliation between reported and verified amounts.

Requires additional security, commercial and regulatory assessment.

### Phase 4 — Monetisation

Explore freemium subscriptions.

Potential premium features:

- Unlimited challenges.
- Advanced analytics.
- Enhanced accountability tools.
- Premium challenge formats.
- Bank verification where commercially viable.
- Household and group subscriptions.

Pricing and willingness to pay must be validated.

---

## 13. Product Success Metrics

Initial beta targets are hypotheses, not established benchmarks.

| Metric | Initial Target |
| --- | --- |
| User activation | 60% create or join a challenge |
| Social activation | 50% of challenges have 2+ members |
| First contribution | 60% within 7 days of joining |
| Four-week retention | 35% of activated users |
| Repeat engagement | 40% contribute in 3 of their first 4 weeks |

Metrics should be reviewed after early user research and private beta.

Qualitative feedback should assess:

- Whether the social experience increases motivation.
- Whether sharing amounts feels comfortable.
- Whether progress is easy to understand.
- Whether gamification is encouraging.
- Whether participants would recommend the product.
- Whether users would pay for premium features.

---

## 14. Risks and Assumptions

### Product Risks

- Users may not want to share savings amounts.
- Social pressure may discourage participation.
- Self-reported contributions may be inaccurate.
- Gamification may fail to improve long-term engagement.
- Users may lose interest after completing one challenge.
- Users may not be willing to pay.

### Technical Risks

- Financial calculation errors.
- Incorrect access controls.
- Privacy leaks through group totals or activity.
- Duplicate contributions.
- Inconsistent historical calculations.
- Poor performance as challenge history grows.

### Commercial Risks

- Low retention.
- High acquisition costs.
- Limited willingness to pay.
- Open Banking costs exceeding subscription revenue.
- Competition from existing finance and habit-tracking products.

These risks must be monitored and addressed progressively.

---

## 15. Design Principles

The approved design discovery principles are:

**Trust Before Decoration**

Financial information must be clear, reliable and easy to interpret.

**Social by Design**

Shared progress and accountability should be central to the experience.

**Reward Meaningful Progress**

Gamification should celebrate consistency rather than wealth.

**Distinctive Visual Identity**

Avoid generic SaaS dashboards, excessive gradients and interchangeable component patterns.

**Accessible and Predictable**

Use established interaction patterns and accessibility principles, including relevant Material Design 3 guidance, without adopting a generic visual aesthetic.

**Mobile First**

Core journeys should feel natural on mobile browsers while scaling to desktop.

---

## 16. Proposed Technology Direction

The following stack is proposed, not yet technically approved.

| Layer | Candidate |
| --- | --- |
| Frontend | React |
| Framework | Next.js App Router |
| Language | TypeScript |
| Database | PostgreSQL |
| Database hosting | Supabase |
| ORM | Drizzle |
| Authentication | Supabase Auth |
| Styling | Tailwind CSS v4 |
| UI primitives | shadcn/ui and accessible primitives |
| Component documentation | Storybook |
| Unit testing | Vitest |
| Component testing | React Testing Library |
| E2E testing | Playwright |
| CI/CD | GitHub Actions |
| Monitoring | Sentry |
| Product analytics | PostHog |
| Subscription billing | Stripe, future phase |

Final technical decisions belong to Gate 3 — Architecture.

No application scaffolding or implementation is authorised during Gate 2.

---

## 17. AI-Assisted Development Governance

The project will use a specification-driven development process.

### Product Owner

The human product owner approves:

- Product requirements.
- Design directions.
- Architecture decisions.
- Significant implementation milestones.
- Release readiness.

### Planning Agent

Responsible for:

- Refining approved specifications.
- Breaking work into reviewable tasks.
- Identifying dependencies.
- Defining acceptance criteria.

Cannot independently change approved product requirements.

### Design Agent

Responsible for:

- Design research.
- Visual exploration.
- User flows.
- Component specifications.
- Design-system documentation.

Cannot independently change business logic.

### Builder Agent

Responsible for:

- Implementing approved tasks.
- Writing relevant tests.
- Following architecture and design specifications.
- Reporting changes and limitations.

Cannot approve its own work.

### QA Agent

Responsible for:

- Independent testing.
- Playwright browser tests.
- Regression checks.
- Accessibility observations.
- Defect reporting.

Should test a stable implementation rather than an actively changing working tree.

### Security Reviewer

Responsible for:

- Authentication and authorisation review.
- Privacy enforcement.
- Data access risks.
- Dependency and configuration risks.

Cannot independently authorise release.

### Agent Operating Rules

- No unauthorised scope changes.
- No silent modification of approved specifications.
- No unreviewed production deployments.
- No destructive operations without approval.
- No credentials committed to source control.
- Every feature must be testable.
- Every milestone must produce reviewable evidence.
- Agents must stop at approval gates.

---

## 18. Delivery Milestones

| Gate | Milestone | Status |
| --- | --- | --- |
| 1 | Product Discovery | Approved |
| 2 | Design Discovery | Planning |
| 3 | Technical Architecture | Not started |
| 4 | Design System and Foundation | Not started |
| 5 | MVP Implementation | Not started |
| 6 | Independent QA and Security Review | Not started |
| 7 | Private Beta | Not started |
| 8 | Monetisation Validation | Not started |

Progression between gates requires explicit product-owner approval.

---

## 19. Deferred Detailed Decisions

The following are not changes to the approved product direction, but require further specification before relevant implementation work begins:

- Maximum participants per challenge.
- Maximum active challenges per user.
- Invitation expiry duration.
- Invitation revocation behaviour.
- Challenge ownership transfer.
- Owner account deletion.
- Exact weekly commitment boundaries.
- Contribution backdating limits.
- Correction and reversal semantics.
- Treatment of overpayments and excess contributions.
- Time-zone and daylight-saving edge cases.
- Challenge cancellation.
- Post-completion edits.
- Historical data retention periods.
- Group aggregate privacy edge cases.
- Notification frequency.
- Exact achievement thresholds.
- Currency support beyond the initial market.
- Accessibility testing methodology.
- Product analytics consent and event definitions.

These decisions must be documented and approved before implementation of affected features.

---

## 20. Gate 1 Approval Record

| Field | Value |
| --- | --- |
| Milestone | Product Discovery |
| Version | 1.0 |
| Status | Approved |
| Approval date | 11 November 2026 |

The product owner has approved:

- Target audience.
- Product vision.
- Social challenge model.
- Individual savings targets.
- Custom challenge duration.
- Private invitations and owner approval.
- Default financial visibility and privacy opt-out.
- Privacy-safe visible group totals.
- Weekly commitment tracking.
- Missed commitment recovery and pauses.
- Audited contribution corrections.
- Prospective target changes.
- Membership exit principles.
- MVP boundaries.
- No financial custody.

This specification forms the approved baseline for subsequent work.

### Next Authorised Activity

**Gate 2 — Design Discovery**

**Authorised activities:**

- Competitive research.
- UX research and analysis.
- Visual identity exploration.
- Information architecture.
- User-flow documentation.
- Wireframing.
- Design-system planning.
- Component research.
- Design validation.

**Not authorised:**

- Application scaffolding.
- Database implementation.
- Production component development.
- Authentication implementation.
- Deployment configuration.
- Subscription integration.

Gate 1 is closed. Gate 2 is open for design planning and research only.
