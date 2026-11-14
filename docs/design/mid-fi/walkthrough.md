# Mid-fi PO walkthrough

Short click-path for product-owner **re-review** after 58957a4 gaps.

**Open:** [`index.html`](./index.html) · side panel jumps · **Reset scenario** restores £1,190 / Alex sharing / self view.

---

## Path A — Record £50 shows the change (£1,190 → £1,240)

1. **Reset scenario** (side panel) so Home starts clean.  
2. **Home** — Personal **£1,190 of £2,000 · Current 60%**, separate **50% Halfway · reached**, weekly **Not started**, Sharing members only **£3,030 of £5,500**.  
3. Tap **Record savings** — fixed **£50**; helper notes £1,190 → £1,240.  
4. Read sharing-member callout (*Your contribution is included…*).  
5. **Continue** → Confirm: **Saved £50** · personal **£1,240 of £2,000 (62%) · was £1,190** · Halfway already reached · **Your streak · 3 weeks** · total updates to **£3,080 of £5,500**.  
6. Tap **Done** → Home now shows **£1,240 / 62%**, commitment **Completed**, sharing total **£3,080**.  
   - **OPEN — requires product-owner approval:** exact post-confirm navigation.

---

## Path B — Challenge activity

1. Bottom nav → **Challenge** (self view).  
2. Streak / commitment strip **before** roster and feed.  
3. Roster tracks recorded state for Alex; Sam **65%**; Riley 43%; Jordan **Private**.  
4. Sharing-member total explains whose figures are included.  
5. Nav: **Home · Challenge · Activity · Profile** — **no Leaderboard**.

---

## Path C — Privacy opt-out → simulated approved-member view

1. **Profile** → **Financial privacy**.  
2. Default: visible to **approved challenge members** (not private-by-default).  
3. Turn **on** **Hide monetary information (opt-out)**.  
4. Warning: **Opting out cannot undo what others already saw.**  
5. Tap **Save** → prototype opens **Challenge** as a **simulated approved-member view** (banner).  
6. Check: **Alex** shows **Private** (no amount, no target); Sharing-member total is **£1,840 of £3,500** (Sam + Riley only — Alex and Jordan excluded).  
7. Banner → **View as Alex (you)** — Alex still sees own personal figures; opted-out Alex remains excluded from the Sharing members only total.  
8. Optional: Profile → **Demo: approved-member view** to re-enter the simulation without re-saving.

---

## Path D — Join disclosure (before joining)

1. Profile → **Demo: join disclosure** (or `#join`).  
2. Disclosure **before** request join; invite preview had no amounts.  
3. Cannot-undo warning.  
4. **Continue to request join** disabled until acknowledgement checked.

---

## Review checklist

- [ ] Home starts **£1,190**; after Done shows **£1,240** matching confirm  
- [ ] Confirm stays **Saved £50** and matches dashboard update  
- [ ] “Your streak” consistent  
- [ ] 50% milestone ≠ current %  
- [ ] Contribution sharing-member copy present  
- [ ] Opt-out Save → member view: Alex amount/target gone; excluded from total  
- [ ] Self view still shows Alex’s own figures  
- [ ] Join ack prerequisite · no Leaderboard · OPEN flags intact  

---

## Stop

Prototype is for **re-review only**. Implementation requires separate approval. Frozen product docs were not modified.
