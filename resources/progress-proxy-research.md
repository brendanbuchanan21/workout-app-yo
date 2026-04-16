# Muscle Growth Progress Proxies: Research Review

## Central Question

The entire purpose of Iron Cadence is to help the user pack on muscle. Doing
that requires the app to detect **progress** — but actual hypertrophy (muscle
cross-sectional area) cannot be measured directly outside a lab. Everything we
can measure is a proxy.

This document answers: **which proxies are scientifically valid, which should
the app lean on, and how should the app use them to recommend action?**

This doc is the *measurement and recommendation* counterpart to
`progressive-overload-research.md`. The two cover different halves of the
same training loop and should be read together.

**What `progressive-overload-research.md` answers:** *what should the user do
to grow?* It is the **prescription** half. It establishes the underlying
science of *why* volume and proximity to failure are the levers that matter
— the Schoenfeld / Pelland dose-response data, the load vs rep equivalence
results from Plotkin and Chaves, the Refalo and Robinson proximity-to-failure
findings, and the conclusion that volume should be the primary training-block-
level progression variable with load/reps as the within-session variable. It
is how the app decides what to *prescribe* in the first place.

**What this doc answers:** *is what the user is doing actually working, and
what should the app tell them to change?* It is the **detection and
correction** half. It takes the dose-response and proximity-to-failure
evidence as *given* — this doc does not re-argue why volume × RIR is the
right thing to track, it argues that *because* volume × RIR is the right
thing to track, hard sets per muscle per week is the cleanest stimulus proxy
the app can compute. Then it asks the next question that the prescription
doc does not address: how does the app know the prescription is *working*,
and what does it recommend when it isn't?

**Why both are needed:** the two halves form a closed loop. Prescription
without detection is blind — the app would dose volume by formula and never
know if it was too much, too little, or wrong for this particular user.
Detection without prescription has nothing to act on — the app would tell
the user "your bench is stalled" with no opinion on what to do about it. The
recommendation layer in Section 7 of this doc is the bridge: it converts
detection signals into prescription adjustments, which in turn produce new
training data, which feeds back into detection. Both docs are required to
make that loop close.

**The reading order:** read `progressive-overload-research.md` first if you
want to understand why the app prescribes what it prescribes. Read this doc
first if you want to understand how the app knows whether the prescription
is working and how it should change course. Either order works in
isolation; the picture is only complete with both.

---

## 1. THE TWO CATEGORIES OF PROXIES

There are two fundamentally different things you can measure, and conflating
them is the most common mistake hypertrophy apps make:

| Category | What it tells you | Lag | Noise |
|---|---|---|---|
| **Stimulus proxies (input)** — what you did to your body | Whether you are *giving* the body a growth signal | Immediate | Low |
| **Adaptation proxies (output)** — how your body responded | Whether the body *actually grew* | Weeks to months | High |

Both are required.

- **Stimulus proxies** answer "is the program dosed correctly *right now*?"
  They are derived from session logs and are available the moment a workout
  ends. They are low-noise and high-frequency, so they make excellent
  short-term feedback signals.
- **Adaptation proxies** answer "is the program *working* over the long arc?"
  They are derived from output measures (performance, body composition, etc.)
  and lag the underlying biological reality by weeks. They are high-noise on
  short timescales and only become reliable across multi-week windows.

If you only track stimulus, you can chase volume blindly without knowing
whether it's growing you. If you only track adaptation, you panic at week-to-
week noise in measurements that take months to move.

---

## 2. TIER 1 PROXIES: LEAN HARD ON THESE

### 2.1 Hard sets per muscle per week, at sufficient proximity to failure (STIMULUS)

This is the single most evidence-backed lever in hypertrophy science. It is
documented exhaustively in `resources/progressive-overload-research.md`. The
short version, for proxy purposes:

- **Pelland et al. 2026** (220 hypertrophy effects, 67 studies, 2,058
  participants): 100% posterior probability that volume has a positive effect
  on hypertrophy. ~0.24% hypertrophy gain per additional set at the average
  weekly volume of 12.25 sets, with diminishing returns. Direct vs indirect
  set classification matters (indirect sets at 0.5x weighting).
- **Schoenfeld, Ogborn & Krieger 2017**: graded dose-response of +0.023 effect
  size per weekly set.
- **Refalo et al. 2023** and **Robinson et al. 2024**: a "hard set" is one
  taken to within ~0–3 RIR. Beyond ~4–5 RIR, sets contribute much less to
  growth — they barely count toward the dose. This means raw set counts are
  misleading if effort is not controlled.
- **Implication for the app:** weekly hard sets per muscle, computed with
  fractional direct/indirect weighting and filtered by RIR proximity, is the
  cleanest stimulus proxy available. It should be the **headline number** for
  each muscle, every week. This is already implemented (see `volume.ts`,
  `workoutGenerator.ts`, `insights.ts`, and the volume guardrails).

### 2.2 Performance progression at matched effort (ADAPTATION, fast-moving)

This is the most underrated proxy and the one most missing from typical
hypertrophy apps. It is the *fastest output signal we have* — it indicates
that the contractile machinery has adapted on a session-to-session basis,
without waiting weeks for body composition changes to manifest.

**The logic:** if a user can lift the same weight for more reps at the same
RIR — or more weight for the same reps at the same RIR — the muscle has
gotten stronger at that fiber length and contraction speed. Over weeks, this
is a strong correlate of hypertrophy in the moderate rep range (~5–15 reps).

- **Plotkin et al. 2022** and **Chaves et al. 2024** establish that load
  progression and rep progression produce equivalent hypertrophy outcomes
  — meaning *either* form of matched-effort improvement is a valid growth
  proxy. (Both papers are summarized in `progressive-overload-research.md`.)
- **Critical caveat:** strength and hypertrophy are *dissociated* especially
  early on (neural gains dominate the first ~6–10 weeks) and at extreme rep
  ranges (1–3RM strength gains can outpace hypertrophy; >20-rep endurance work
  understates it). The hypertrophy-relevant version of this proxy is
  **mid-rep performance progression at controlled RIR** (~5–15 reps, 1–3 RIR).
- **Why "matched effort" is critical:** an absolute PR ("you hit 100 kg today
  for the first time") does not control for whether the user pushed harder
  this session than last. A matched-effort PR ("at the same RIR as last time,
  you got more reps or more load") *does*, and that controlled comparison is
  what makes it a clean adaptation signal rather than a noisy single-session
  output.
- **Implication for the app:** the app should compute, per exercise, a
  **progressing / stalled / regressing** classification based on rep and load
  at matched RIR over the last N sessions (typically 3–4). This is the
  fastest legitimate growth signal Iron Cadence can derive from existing data.
  Currently *partially* implemented — `sessionAutoregulation.ts` has the
  decline-detection primitives but they are consumed only for next-session
  prescription, not surfaced as a user-facing progress signal.

---

## 3. TIER 2 PROXIES: USEFUL WHEN INTERPRETED CAREFULLY

### 3.1 Estimated 1RM trend (ADAPTATION, mid-speed)

E1RM (Brzycki, Epley, and similar formulas) estimates a one-rep max from a
submaximal set using a known weight × reps relationship.

- **Validity range:** accurate to ~95–98% in the 3–8 rep range. Accuracy
  degrades beyond 10 reps because individual variation in muscular endurance
  becomes the dominant signal rather than maximal strength.
- **Interpretation:** a *rising* e1RM at constant body weight strongly
  suggests adaptation (could be neural, could be myofibrillar; both happen
  together for the first ~1–2 years of training). A *flat* e1RM despite
  sufficient volume is the earliest warning sign that something is off
  (recovery, sleep, calories, exercise selection).
- **Relationship to matched-effort progression (2.2):** e1RM is a *companion*
  proxy, not a replacement. Matched-effort is the cleaner signal because it
  controls for the RIR confound; e1RM is noisier because it converts a single
  set's reps into an extrapolated 1RM that depends on the formula and on
  whether the user was actually near failure. E1RM is most useful as a
  quick-glance trend chart over 4–8 weeks, not as a session-to-session
  decision input.
- **Implication for the app:** already tracked in `StrengthTab.tsx` via
  `exerciseDetailService.ts`. Could be enriched with a categorical
  progressing / stalling / regressing classification rather than just a chart.

### 3.2 Body weight trend vs declared phase intent (ADAPTATION, slow)

Body weight trend is a valid slow-moving growth proxy — but *only* when the
app knows the user's intended nutrition phase. The critical insight is that
**the app does not need nutrition logging to get this context.** A single
user-declared variable — "I am currently bulking / cutting / maintaining" —
is sufficient to make the body weight chart interpretable.

- **Realistic natural lean-mass rates** (multiple sources):
  - Novice (year 1): ~1–2 lb of lean mass per month
  - Intermediate: ~0.5 lb per month
  - Advanced (3+ years): ~0.25 lb per month
- **Total body weight should rise faster than this in a surplus** because of
  glycogen, water, and some fat gain. Conversely, total body weight can be
  flat while lean mass is rising if fat is being lost in parallel
  (recomposition), most plausible in novices and returning lifters.
- **Window matters:** a 7–14 day rolling average is required to cut through
  daily noise (food intake, hydration, GI content, sodium, etc.). A single
  weigh-in is meaningless for trend purposes.
- **What phase intent unlocks:**
  - **Bulk declared + weight rising** → on track.
  - **Bulk declared + weight flat** → not actually in a surplus; eat more.
  - **Cut declared + weight dropping** → on track.
  - **Cut declared + weight rising** → adherence problem.
  - **Maintenance declared + weight stable** → on track.
  Without the phase declaration, all of these look the same: a line going
  up, down, or sideways with no meaning attached.
- **What phase intent costs:** one selector (bulk / cut / maintain) and
  optionally a target rate field ("I want to gain/lose ~X lbs/week"). No
  calorie logging, no macro tracking, no food photos.
- **When to ask:** at the start of every new training block (program
  creation). This is the natural moment where the user is already thinking
  about their goals for the upcoming block. The phase declaration becomes
  part of block setup alongside split type, days per week, and length —
  not a setting buried in a menu. This also ties the phase to the
  `TrainingBlock`, not to the user globally, so each block carries its own
  phase context. A 6-week bulk block followed by a 4-week cut block
  automatically adjusts the recommendation engine at the block boundary
  with no manual switching.
- **Data model:** the `NutritionPhase` schema already has `phaseType` and
  `targetWeightChangePerWeek`. However, since the phase is a per-block
  decision, it may be cleaner to store it directly on `TrainingBlock`
  (which already has volume-related fields like `volumeTargets` and
  `customGuardrails`) rather than requiring a separate `NutritionPhase`
  record. Implementation decision — either works.
- **Status in Iron Cadence:** body weight is logged via the `BodyWeight`
  model and shown as a chart in `WeightTab.tsx`. **With a phase selector
  added to the block creation flow, body weight rejoins the model as
  Signal 3.** No nutrition logging required.

---

## 4. TIER 3 PROXIES: SCIENTIFICALLY VALID, OUT OF SCOPE FOR IRON CADENCE

These are real proxies that the app **will not** lean on, because each
requires something the app cannot deliver in a phone-only training-flow
context. They are listed here for completeness so the omission is intentional
rather than accidental.

- **Progress photos.** Arguably the highest-signal at-home adaptation proxy
  when done consistently — the eye picks up on regional muscle development
  that the scale and tape miss. Validity depends entirely on standardization
  (same lighting, poses, time of day, hydration state) and a 2–4 week
  comparison cadence. Excluded because it requires image storage
  infrastructure and a separate user habit beyond what training already asks
  of them.
- **Body part circumferences.** Single-point circumference measurements are
  poor predictors of muscle CSA in the short term — confounded by fat and
  water (Stokes 1981 and follow-ups). However, *serial* measurements at
  consistent anatomical landmarks over 6+ months do correlate with underlying
  muscle change. Excluded because it requires the user to consistently tape
  the same sites with the same technique, which is a habit the app cannot
  enforce.
- **Body composition (BIA / DEXA).** DEXA is the practical gold standard but
  requires periodic lab visits. Consumer BIA scales are individually
  unreliable (±3–5% body fat) but their *trend* over 4+ weeks is meaningful.
  Excluded because both require external hardware or lab visits.

Iron Cadence will derive its progress signals exclusively from in-app training
data and the existing body weight log. No new logging burden on the user.

---

## 5. TIER 4 PROXIES: DO NOT LEAN ON THESE

Listed here so they are explicitly rejected, not just absent.

- **Soreness / pump.** Soreness reflects unaccustomed stimulus, not growth —
  it decreases as the user adapts to a new exercise even if growth is
  ongoing. Pump correlates with cell swelling, which is acute and does not
  predict chronic hypertrophy. Both are subjective, both vary by individual,
  neither belongs in a recommendation engine.
- **Raw tonnage (kg × reps × sets) without intensity context.** Confounds
  effort with junk volume. A user can game tonnage by doing more easy sets
  with no proportional growth signal. Tonnage may be reported as a
  *secondary* metric for context, but not as a headline number.
- **Single-session PRs in isolation.** Day-to-day output swings ±10% based on
  sleep, caffeine, food timing, and mood. Only PR *trends* over multiple
  sessions matter. The existing PR feed in the app is fine because it is a
  feed (multi-session context); single-session PR celebrations divorced from
  trend should be avoided.
- **Weekly subjective ratings alone** (the orphaned `WeeklyCheckIn` model).
  Useful as a *confound-detector* alongside objective signals (e.g., "you
  rated sleep 2/10 this week and your performance is regressing — these are
  related"), but not as a primary growth metric on their own.

---

## 6. THE THREE-SIGNAL UNIFIED MODEL

Iron Cadence has **three signals** it can compute from data the user already
provides (training logs + body weight log + a single phase-intent
declaration):

> **A user is making muscle-growth progress when, over a 4–8 week window,
> all three of these are green:**
> 1. **Stimulus delivered** — weekly hard sets per muscle inside the
>    guardrails, RIR target met (Tier 1 stimulus, already tracked)
> 2. **Performance moving at matched effort** — more reps or more load at the
>    same RIR on key lifts (Tier 1 adaptation, biggest gap)
> 3. **Body weight trending in the intended direction for the declared phase**
>    — rising on a bulk, dropping on a cut, stable on maintenance (Tier 2,
>    unlocked by phase intent, not nutrition logging)

### Phase-dependent interpretation of Signal 2

The meaning of Signal 2 (matched-effort performance) **changes depending on
the declared phase**, which is why Signal 3 is critical context:

- **During a bulk:** performance should be progressing. A stall means the
  training dose or exercise selection needs adjustment — the user has the
  calories to support adaptation.
- **During a cut:** some performance loss is *expected* because the user is
  in a caloric deficit. The success metric shifts from "improving" to
  "minimizing loss." A slow regression (1–2 reps lost over several weeks) is
  *acceptable*, not a failure. The recommendation engine should NOT fire
  "add a set" or "deload" for expected cut-phase regression.
- **During maintenance:** performance should hold steady or progress slowly.
  Behavior is similar to a bulk but with lower expectations.

### Diagnostic states (three-signal)

| Signal 1 (stimulus) | Signal 2 (performance) | Signal 3 (weight vs phase) | Interpretation |
|---|---|---|---|
| Green | Progressing | On track | Growth is highly likely. Hold the program. |
| Green | Stalled | Bulk, weight rising | Training is dosed correctly and food is in. The dose is the likely issue — add a set or swap variation. |
| Green | Stalled | Bulk, weight flat | Not actually in a surplus. Eat more before touching training variables. |
| Green | Slow regression | Cut, weight dropping | Expected. Muscle is being preserved. Hold intensity, hold volume at maintenance. |
| Green | Rapid regression | Cut, weight dropping fast | Deficit is too aggressive. Slow the cut — add 100–200 kcal/day. |
| Green | Regressing | Bulk or maintain | Recovery debt. Deload. |
| Red | Any | Any | Hit volume targets first before changing anything else. |

### What the app cannot see: recovery

The three-signal model substantially improves diagnostic power over two
signals, but it has a remaining blind spot: **the app cannot directly measure
recovery.** It has no HRV, no sleep data, no subjective wellness ratings.
A regression in performance can be caused by insufficient training dose,
excessive training dose, poor sleep, illness, life stress, or caloric
deficit — and the app can only distinguish the last one (via phase intent).

This means the recommendation engine will sometimes misattribute a recovery-
driven regression to a training problem (or vice versa). This is mitigated
by three strategies:

**1. Make the app's blindness explicit.** Every recommendation should lead
with what the app can and cannot see:

> *"Your bench has regressed for 2 weeks. Based on your training data, this
> looks like recovery debt — consider a deload. But the app cannot see your
> sleep, food, or stress. If any of those is off, fix that first."*

This costs nothing and shifts the user from blind compliance to informed
hypothesis-testing.

**2. Pre-session readiness rating (proposed).** A single 1–10 slider
presented when the user starts a workout: "How recovered do you feel today?"
Five seconds, one tap. This provides a subjective recovery signal that the
app can aggregate weekly and use to distinguish "stalled with recovery 8/10"
(probably a dose problem) from "stalled with recovery 3/10 all week"
(probably a lifestyle problem). This is a deliberate exception to the
"no new logging" rule, justified by the diagnostic value it uniquely
provides. The weekly average of daily readiness ratings is well-correlated
with actual recovery status in the training science literature.

**3. Frame recommendations as hypotheses, not commands.** The difference
between "Deload chest this week" and "Likely recovery debt — try a deload.
If that doesn't restore performance in 1 week, the issue is probably outside
training" is small in language and large in user behavior.

### Honest limitations

- The app cannot directly *see* hypertrophy. It infers growth from training
  data + body weight + phase intent. The signals are aligned with growth on
  average, but they are not direct proof.
- Without direct recovery measurement, the app cannot always distinguish
  training problems from lifestyle problems. It mitigates this with explicit
  blindness disclosure, optional readiness ratings, and hypothesis framing.
- These are deliberate trade-offs in favor of low-friction tracking. Signals
  1 and 2 come from data the user is already producing. Signal 3 requires
  one additional input: the phase declaration (a single selector, not a
  logging workflow).

---

## 7. THE RECOMMENDATION LAYER: FROM SIGNAL TO ACTION

Detecting that a signal is red is only half the job. Each signal needs to map
to a concrete, evidence-backed recommendation. This is what closes the loop
on "use this data to help me grow."

**Critically, the recommendations are phase-dependent.** The same signal
state produces different recommendations during a bulk vs a cut vs
maintenance. This section covers the phase-independent logic first, then the
phase-specific overrides.

### 7.0 Growth volume vs maintenance volume

Before diving into per-signal recommendations, the framework requires two
volume concepts that differ by phase:

- **Growth volume** — the dose needed to *build new muscle*. This is the
  volume range the app currently targets during a bulk: MEV (~10 sets/muscle/
  week) ramping toward MAV (~12–20 sets/muscle/week), with diminishing
  returns per the Pelland 2026 and Schoenfeld 2017 dose-response data.
  Volume is the primary lever. The direction is up.
- **Maintenance volume (MV)** — the dose needed to *preserve existing muscle*.
  This is substantially less than growth volume. **Bickel et al. 2011** showed
  that reducing training volume by up to two-thirds while maintaining
  intensity preserved both strength and muscle mass for up to 32 weeks. In
  practice, MV is roughly **1/3 to 1/2 of growth volume** — for a muscle
  that grows at 12–16 sets/week, maintenance is ~6–8 sets/week.

The key insight: **the body preserves muscle that is being LOADED under high
tension, not muscle that has high volume.** The signal that tells the body
"keep this tissue" is mechanical tension at high proximity to failure — heavy
loads, close to failure (Schoenfeld 2010, Refalo 2023). This is an
*intensity* signal, not a *volume* signal.

| Phase | Primary goal | Volume target | Primary lever |
|---|---|---|---|
| Bulk | Grow new muscle | Growth volume (MEV → MAV) | Volume (add sets when stalled) |
| Cut | Preserve existing muscle | Maintenance volume (~1/2 of growth) | Intensity (maintain load + RIR) |
| Maintenance | Hold muscle, hold performance | Between MV and growth volume | Both, balanced |

**Sources:** Bickel et al. 2011 (volume reduction + intensity maintenance
preserves muscle for 32 weeks); Helms et al. 2014 (contest prep
recommendations for natural bodybuilders: maintain intensity, reduce volume
modestly); Israetel et al. 2021 (MEV/MAV/MRV framework).

### 7.1 Signal 1 — Stimulus (volume + RIR)

Phase-independent recommendations:

| State | Recommendation |
|---|---|
| RIR distribution **trending soft** (most sets at RIR 4+) | "Push closer to failure — sets above RIR 4 contribute much less to growth" |
| RIR distribution **all at failure** | "Back off to RIR 1–2 — failure on every set accelerates fatigue without proportional growth gains" |
| Volume in target band, RIR appropriate | "Hold volume — your stimulus is dialed in" |

Phase-dependent volume recommendations:

| State | Bulk | Cut | Maintenance |
|---|---|---|---|
| Below floor for 3+ weeks | "Add 1–2 sets to {muscle}" | "You've dropped below maintenance volume — add 1–2 sets back. Preservation requires a minimum dose." | "Add 1–2 sets to {muscle}" |
| Above ceiling for 3+ weeks | "Drop 1–2 sets or deload — accumulated fatigue is outweighing growth" | "You're carrying unnecessary fatigue on reduced calories. Drop 2–3 sets toward maintenance volume." | "Drop 1–2 sets or deload" |
| Volume at growth levels during a cut | N/A | "Settle volume toward maintenance (~1/2 of growth phase). You can't recover from growth-phase volume on a deficit." | N/A |
| Volume below maintenance during a bulk | "Well below optimal — ramp volume up toward MEV immediately" | N/A | "Below maintenance — add sets to preserve" |

### 7.2 Signal 2 — Matched-effort performance (the stagnation detector)

This is where the recommendation engine diverges most sharply by phase.

#### During a bulk (or maintenance)

The standard escalation ladder applies. The app attempts within-session
load/rep progression continuously via double progression. When that stalls:

| State (per exercise, 3+ sessions at matched RIR) | Recommendation |
|---|---|
| **Progressing** | "Hold current dose. {exercise} is working." |
| **Stalled** | "Add 1 set to {exercise} next week" → still stalled after 1–2 weeks → "Swap variation" → still stalled → "Deload, then resume" |
| **Regressing** | "Recovery problem. Deload {exercise} this week (drop volume 40–60%, push RIR up to 5–6)" |
| **Stalled across most exercises** | "System-wide signal — try a 1-week deload" |

**Why volume first when stalled (not load, not recovery):** by the time the
stall fires, the app has already tried to push load/reps via double
progression every session — and it has failed for 3+ sessions. The stall IS
the signal that load progression has hit a temporary ceiling. Adding volume
drives the chronic hypertrophy that *raises* that ceiling. The added set is
not supposed to make today's session better — it makes next month's session
better by growing the muscle (see Section 7.0 for the acute-vs-chronic
distinction). This matches the volume adjustment rules in
`session-autoregulation-model.md` and the volume-as-primary-lever conclusion
in `progressive-overload-research.md`.

If adding volume doesn't unstick performance in 1–2 weeks, the dose is not
the problem. The escalation moves to exercise variation (stimulus quality),
then to deload (recovery debt). Each rung exists because the previous rung
was tried and failed — the escalation is diagnostic, not arbitrary.

#### During a cut

The entire framework shifts. The goal is **preservation**, not growth.

| State (per exercise, 3+ sessions at matched RIR) | Recommendation |
|---|---|
| **Maintaining** (same reps, load, RIR) | "You're preserving muscle. Hold everything. The cut is going well." |
| **Slow regression** (1–2 reps lost over weeks) | "Expected in a deficit. Hold load, hold intensity. Don't add volume, don't panic." |
| **Rapid regression** (significant drops in load or reps) | "Deficit may be too aggressive, or volume dropped too low. Check: still hitting ~6–8 sets/muscle/week? If yes, slow the cut (add 100–200 kcal/day)." |
| **Volume below maintenance floor** | "You've cut too many sets. Add 1–2 back. Preservation requires a minimum dose." |

Key differences from the bulk ladder:

- **"Add a set" is suppressed.** You cannot recover from more work on fewer
  calories. Adding volume during a cut is counterproductive — it adds fatigue
  without driving growth that the body lacks the calories to support.
- **"Hold load" replaces "add load."** Maintaining the same weight on the
  bar is the strongest preservation signal. Do not drop weight unless forced
  to by performance. The priority is: protect load > protect RIR > protect
  volume.
- **Success is redefined.** Maintaining performance = winning. Slow
  regression = acceptable. The matched-effort signal flips from a *growth*
  detector to a *muscle-loss* detector.
- **Rapid regression triggers caloric adjustment, not training adjustment.**
  If performance is falling fast despite maintaining intensity and volume,
  the deficit is too steep — the recommendation is to eat slightly more, not
  to change the training.

**Sources:** Bickel et al. 2011 (1/3 volume maintained muscle for 32 weeks
at full intensity); Helms et al. 2014 (natural bodybuilding contest prep:
maintain intensity, reduce volume modestly, accept slower recovery).

### 7.3 Signal 3 — Body weight vs declared phase intent

| Declared phase | Weight trend | Recommendation |
|---|---|---|
| Bulk | Rising at target rate | "On track." |
| Bulk | Rising faster than target | "Gaining faster than intended — likely adding excess fat. Reduce calories slightly." |
| Bulk | Flat or dropping | "You're not actually in a surplus. Increase calories before touching training variables." |
| Cut | Dropping at target rate | "On track." |
| Cut | Dropping faster than target | "Deficit is too aggressive — risk losing lean mass. Add 100–200 kcal/day." |
| Cut | Flat or rising | "Adherence issue — the deficit isn't happening. Recheck intake." |
| Maintenance | Stable (±0.5% over 2 weeks) | "On track." |
| Maintenance | Drifting up or down | "Weight is drifting — adjust intake to stabilize." |

### 7.4 Cross-signal recommendations (the highest-value layer)

The most valuable recommendations come from triangulating all three signals.

#### During a bulk

- **Stimulus green + performance progressing + weight rising** → "Hold.
  Everything is working. Don't fix what isn't broken."
- **Stimulus green + performance stalled + weight rising** → "Food is in,
  volume is in, but {exercise} isn't moving. Add 1 set or swap variation."
  (NOT "eat more" — the calories are fine.)
- **Stimulus green + performance stalled + weight flat** → "Eat more. Your
  training is fine; you're under-fueled for growth." (NOT "add volume" —
  adding stimulus on top of insufficient calories is counterproductive.)
- **Stimulus green + performance regressing + weight rising** → "Recovery
  debt despite eating enough — deload."
- **Stimulus below floor + performance any** → "Hit volume targets first.
  Don't change anything else until the basics are covered."
- **Stimulus above ceiling + performance flat/regressing** → "Drop sets
  and/or deload. Past the point of useful volume."

#### During a cut

- **Stimulus at maintenance + performance maintaining + weight dropping** →
  "Perfect cut. You're preserving muscle while losing fat. Change nothing."
- **Stimulus at maintenance + slow regression + weight dropping** →
  "Expected. Hold intensity, hold volume. The cut is working."
- **Stimulus at maintenance + rapid regression + weight dropping fast** →
  "Deficit too aggressive. Slow the cut — add 100–200 kcal/day."
- **Stimulus below maintenance + any regression** → "Volume too low — you're
  losing the stimulus needed to preserve muscle. Add sets back to
  maintenance level."
- **Stimulus at growth levels + any state** → "Carrying too much volume for
  a cut. Settle toward maintenance. You can't recover from growth-phase
  training on a deficit."

#### During maintenance

Behaves like a mild bulk. The standard escalation ladder applies (load
progression → add set → swap variation → deload), with slightly lower
expectations for rate of progress.

### 7.5 The escalation ladder — why this order

When within-session load/rep progression stalls during a **bulk**, the
recommendation engine escalates in this order:

| Step | When | Why this order |
|---|---|---|
| 1. Add 1 set | First stall (3+ sessions flat) | Most evidence-backed lever (Pelland 2026), most reversible, cleanest diagnostic signal (one variable changed) |
| 2. Swap variation | Adding volume didn't help after 1–2 weeks | It's not a dose problem — it's a stimulus quality problem. Try a different angle/movement. |
| 3. Deload | Volume + variation didn't help | It's not dose or stimulus quality — it's recovery debt. A week of reduced volume and higher RIR lets the body catch up. |
| 4. Check outside the gym | Deload didn't restore progress | It's not training at all. Sleep, food, or stress is the bottleneck. This is where Signal 3 (body weight vs phase) helps most. |

**During a cut**, the escalation ladder is different because the goal is
different:

| Step | When | Why |
|---|---|---|
| 1. Hold | Performance maintaining or slowly regressing | Expected. The deficit explains it. |
| 2. Check volume floor | Rapid regression | Ensure sets haven't dropped below maintenance volume (~6–8/muscle/week). If they have, add back to MV. |
| 3. Slow the cut | Rapid regression despite volume at MV | The deficit is too steep. Add calories. |
| 4. Deload | Regression despite calories + volume adjustment | Recovery debt on top of a cut. Brief deload, then resume. |

**Why "add a set" never appears during a cut:** adding work to a system with
impaired recovery (caloric deficit) increases fatigue without driving growth
the body lacks the calories to support. The better lever is to protect what
you have (intensity + maintenance volume) and adjust the *deficit* if
preservation is failing. Volume is the growth lever; intensity is the
preservation lever. During a cut, you are in preservation mode.

---

## 8. APP-SPECIFIC GAP ANALYSIS

### Tier 1 — Stimulus (Hard sets per muscle per week × proximity to failure)

- **Have:** `ExerciseSet` captures target & actual weight/reps/RIR. Per-muscle
  weekly volume in `backend/src/routes/volume.ts`. Volume guardrails
  (floor/ceiling) per muscle in `backend/src/services/workoutGenerator.ts`.
  Insight detectors for above-ceiling / below-floor / declining-trend in
  `frontend/src/utils/insights.ts`. Fractional set counting (direct vs
  indirect 0.5x) per Pelland 2026.
- **Missing:** A user-facing view that shows the *relationship* between
  effort delivered (RIR distribution) and growth-quality sets. Today the app
  counts any logged set as 1; it does not filter out the soft-effort sets
  that the science says barely contribute. A "junk volume vs growth volume"
  distinction would tighten this layer.
- **Priority:** Polish, not gap. This layer is the strongest in the app.

### Tier 1 — Matched-effort performance progression

- **Have:** Absolute PRs (`prService.ts`, `PRsTab.tsx`, `PRFeedView.tsx`).
  E1RM trend per exercise (`StrengthTab.tsx`, `exerciseDetailService.ts`).
  Decline detection over consecutive sessions inside
  `sessionAutoregulation.ts`.
- **Missing — biggest gap on the adaptation side:** there is no view that
  answers *"at the same RIR I'm pulling on the same exercise, am I doing
  more reps or more load than I was 4 weeks ago?"* The PR tracker is binary
  (PR / no PR). The e1RM chart is sensitive to single-set noise. The
  autoregulation service has the right primitives but its output is consumed
  internally for next-session prescription, not surfaced as a progress
  signal to the user.
- **Priority:** Highest implementation gap. The data is already in the
  database — only computation and presentation are missing. A
  `progressionAnalysis` service that classifies each exercise as
  progressing / stalled / regressing at matched RIR would deliver the
  fastest legitimate growth signal the app can compute.

### Tier 2 — E1RM trend

- **Have:** Latest E1RM, peak E1RM, slope-based trending, line chart per
  exercise in `StrengthTab.tsx`.
- **Missing:** A categorical progressing / stalling / regressing
  classification. Just looking at a chart leaves diagnosis to the user.
- **Priority:** Low-effort enrichment of an existing view.

### Signal 3 — Body weight vs declared phase intent

- **Have:** `BodyWeight` model with manual logging, chart in `WeightTab.tsx`.
  `NutritionPhase` model already in the Prisma schema with `phaseType`
  (cut/bulk/maintain) and `targetWeightChangePerWeek`. `TrainingBlock` model
  already has structured fields for volume targets and guardrails.
- **Missing:** a phase selector (bulk / cut / maintain + optional target
  rate) in the **block creation flow** — asked at the start of every new
  program alongside split type, days/week, and length. The connection
  between the phase declaration and the body weight chart (7–14 day rolling
  average, comparison to target rate, "on track / too fast / too slow"
  status). The recommendation engine logic that consumes phase context to
  adjust all of Signal 1 and Signal 2's behavior per Section 7.
- **Data model decision:** store the phase on `TrainingBlock` directly
  (cleanest, since phase is a per-block decision) or create a
  `NutritionPhase` record linked to the block. Either works; storing on
  `TrainingBlock` avoids an extra join.
- **Priority:** High. This is the cheapest possible input (one selector
  during block setup, no logging workflow) that unlocks the most diagnostic
  power (Signal 3, phase-dependent recommendations, the recovery blindness
  mitigation for cut-phase regression).

### The recommendation layer (does not exist)

- **Missing:** a `recommendationEngine` service that consumes the three
  detectors (volume guardrails, matched-effort progression, body weight vs
  phase) and the declared phase intent, applies the phase-dependent per-
  signal and cross-signal rules from Section 7, and emits a prioritized list
  of `Recommendation { signal, severity, message, suggestedAction }`. This
  is the brain that converts proxies into "do X next week."
- **Phase-dependent logic is the most complex part.** The engine needs
  separate recommendation pathways for bulk, cut, and maintenance — including
  swapping the volume floor from MEV to MV during a cut, suppressing the
  "add a set" escalation during a cut, redefining "success" from
  "progressing" to "maintaining/slowly regressing" during a cut, and
  triggering caloric adjustment recommendations during a cut when regression
  is rapid.
- **Where it should live:** new
  `backend/src/services/recommendationEngine.ts`. Surfacing in two places —
  contextual CTAs in `InsightsTab` and the new matched-effort view (e.g.,
  "Add 1 set to chest" button next to the stalled-chest insight during a
  bulk), and a consolidated top-3 recommendation list on the eventual
  home-screen panel.
- **Priority:** Build alongside the matched-effort detector. Detectors
  without an engine leave the user reading charts; the engine is the payoff.

### Pre-session readiness rating (proposed, does not exist)

- **Missing:** a single 1–10 slider shown when a workout is started: "How
  recovered do you feel today?" Stored as a field on `WorkoutSession` or a
  separate lightweight model. Aggregated weekly into a recovery trend.
- **What it buys:** the ability to distinguish "stalled with good recovery"
  (dose problem) from "stalled with poor recovery" (lifestyle problem).
  Without it, the recommendation engine cannot differentiate these cases and
  may misattribute lifestyle-driven regression to training problems.
- **Priority:** Medium. Not required for the core three-signal model to work,
  but substantially improves the quality of recommendations in edge cases.
  A deliberate exception to the "no new logging" rule, justified by its
  unique diagnostic value.

---

## 9. SYNTHESIS: WHAT DOES THE EVIDENCE SAY?

### What we know with high confidence

1. **Volume × proximity to failure is the cleanest stimulus proxy** for
   hypertrophy. (Pelland 2026, Schoenfeld 2017, Refalo 2023, Robinson 2024)
2. **Matched-effort performance progression at moderate reps (5–15) is the
   fastest valid adaptation proxy** that does not require body composition
   measurement. Load progression and rep progression are equivalent. (Plotkin
   2022, Chaves 2024)
3. **E1RM is a useful supplementary trend** in the 3–8 rep range, with
   accuracy degrading past 10 reps. It is noisier than matched-effort
   progression but easier to chart.
4. **Body weight trend is a growth signal when paired with phase intent.**
   A simple phase declaration (bulk / cut / maintain) is sufficient — full
   nutrition logging is not required.
5. **Maintenance volume is ~1/3 to 1/2 of growth volume.** Muscle is
   preserved by intensity (load + RIR), not by high volume. (Bickel 2011,
   Helms 2014)
6. **The recommendation engine must be phase-dependent.** The same
   performance signal (stalled, regressing) means different things during a
   bulk vs a cut and warrants different interventions.
7. **Single-session output is high-noise** (~±10% day-to-day swings). All
   adaptation proxies require multi-session windows to be reliable.
8. **Pump, soreness, and tonnage-without-effort are not valid growth
   proxies.** They should not drive recommendations.

### What the three-signal model cannot do

1. Directly measure recovery. The app cannot see sleep, HRV, or subjective
   wellness (unless the optional readiness rating is implemented). When
   lifestyle is the root cause of a regression, the app may misattribute it
   to training. Mitigated by explicit blindness disclosure and hypothesis
   framing on all recommendations.
2. Detect recomposition (lean mass up, fat down, weight flat) — this would
   require body composition data that is out of scope.
3. See hypertrophy directly. Every signal is an inference.

### Answering the central question

**"Which proxies are scientifically valid, which should the app lean on, and
how should it use them?"**

Iron Cadence should lean on **three signals**:

1. **Hard sets per muscle per week × proximity to failure** as the stimulus
   proxy. Already strong in the app.
2. **Matched-effort performance progression per exercise** as the adaptation
   proxy. The biggest current gap.
3. **Body weight trend vs declared phase intent** as the slow-moving context
   signal. Unlocked by a single phase selector, not nutrition logging. The
   `NutritionPhase` schema already has the fields; only the UI is missing.

It should treat **e1RM** as supplementary context, not as a growth-detection
input. It should explicitly **not** track photos, circumferences, or body
composition (out of scope for the app's form factor and the user's flow). It
should **never** lean on soreness, pump, raw tonnage, or single-session PRs
as growth signals.

The three signals should feed a single **phase-dependent recommendation
engine** that emits different interventions depending on whether the user is
bulking, cutting, or maintaining:

- **During a bulk:** the escalation ladder is load progression → add set →
  swap variation → deload. Volume is the growth lever. Cross-reference with
  Signal 3 to distinguish "training problem" (weight rising, performance
  stalled → adjust training) from "food problem" (weight flat, performance
  stalled → eat more).
- **During a cut:** the framework shifts to preservation mode. Intensity
  (maintain load + RIR) is the preservation lever. Volume settles to
  maintenance (~1/2 of growth phase). Success is redefined as maintaining or
  slowly regressing performance, not improving it. "Add a set" is suppressed.
  Rapid regression triggers a caloric adjustment, not a training adjustment.
- **During maintenance:** behaves like a mild bulk with slightly lower
  expectations.

This framework produces the diagnosis the user is looking for: *am I making
progress, and what should I change if I'm not?* — with the answer calibrated
to what the user is actually trying to do (grow, preserve, or hold).

---

## Summary Table: Proxy Validity for Hypertrophy in Iron Cadence

| Proxy | Tier | Type | App Status | Decision |
|---|---|---|---|---|
| Hard sets/muscle/wk × RIR | 1 | Stimulus | Strongly tracked | **Signal 1** (headline) |
| Matched-effort performance progression | 1 | Adaptation, fast | Partial — biggest gap | **Signal 2** (build) |
| Body weight vs declared phase intent | 2 | Adaptation, slow | Logged + schema exists, needs phase UI | **Signal 3** (wire up phase selector) |
| Estimated 1RM trend | 2 | Adaptation, mid | Tracked | Supplementary |
| Pre-session readiness rating | — | Recovery, subjective | Not tracked | **Proposed** (optional) |
| Progress photos | 3 | Adaptation, slow | Schema only | **Out of scope** |
| Body circumferences | 3 | Adaptation, slow | Not tracked | **Out of scope** |
| Body composition (BIA / DEXA) | 3 | Adaptation, slow | Not tracked | **Out of scope** |
| Soreness / pump | 4 | — | Not tracked | **Do not build** |
| Raw tonnage (no effort context) | 4 | — | Computed internally | **Do not promote** |
| Single-session PRs in isolation | 4 | — | Tracked as feed only | **Do not headline** |

---

## Cross-References

This document assumes the evidence summarized in the project's other research
notes. Read together:

- `progressive-overload-research.md` — volume dose-response, load vs rep
  progression, proximity-to-failure evidence, periodization. The "how to
  drive growth" counterpart to this "how to detect growth" document.
- `rir-progression-model.md` — how the app prescribes RIR across a training block,
  including RIR floors per movement type. Establishes what counts as a
  "controlled effort" set for matched-effort comparisons.
- `rep-fatigue-model.md` — within-session rep drop-off prediction. Used to
  set realistic per-set rep estimates and to identify junk-volume patterns.
- `session-autoregulation-model.md` — the matched-effort progression
  primitives (decline detection, double progression, performance scoring,
  volume adjustment rules) that already exist in the codebase. The future
  `progressionAnalysis` service should build on these.
- `tempo-research.md` — explicit decision not to track tempo. Same kind of
  "scientifically valid but explicitly out of scope" reasoning applied here
  to photos / circumferences / body comp.

---

## Sources

### Primary citations

- [Pelland JC et al. 2026 — The Resistance Training Dose Response (Sports Medicine)](https://pubmed.ncbi.nlm.nih.gov/41343037/)
- [Schoenfeld BJ, Ogborn D, Krieger JW. 2017 — Volume dose-response meta-analysis](https://pubmed.ncbi.nlm.nih.gov/27433992/)
- [Krieger JW. 2010 — Single vs multiple sets meta-analysis](https://pubmed.ncbi.nlm.nih.gov/20300012/)
- [Refalo MC et al. 2023 — Proximity-to-failure systematic review](https://pubmed.ncbi.nlm.nih.gov/36334240/)
- [Robinson ZP et al. 2024 — Proximity-to-failure dose-response meta-regression](https://pubmed.ncbi.nlm.nih.gov/38970765/)
- [Plotkin DL et al. 2022 — Load vs rep progression](https://pmc.ncbi.nlm.nih.gov/articles/PMC9528903/)
- [Chaves TS et al. 2024 — Overload progression protocols](https://pubmed.ncbi.nlm.nih.gov/38286426/)
- [Helms ER et al. 2018 — RIR-based RPE scale validation](https://pubmed.ncbi.nlm.nih.gov/27574913/)
- [Zourdos MC et al. 2016 — Original RPE-RIR scale](https://pubmed.ncbi.nlm.nih.gov/26049792/)
- [Schoenfeld BJ et al. 2021 — Repetition continuum re-examination (loading recommendations)](https://pmc.ncbi.nlm.nih.gov/articles/PMC7927075/)
- [Bickel CS et al. 2011 — Exercised and non-exercised muscle volume reduction preserves function](https://pubmed.ncbi.nlm.nih.gov/21451146/)
- [Helms ER et al. 2014 — Evidence-based recommendations for natural bodybuilding contest prep](https://pubmed.ncbi.nlm.nih.gov/24864135/)
- [Schoenfeld BJ. 2010 — Mechanisms of muscle hypertrophy](https://pubmed.ncbi.nlm.nih.gov/20847704/)

### E1RM formula validity

The Brzycki and Epley formulas are accurate to ~95–98% in the 3–8 rep range
and degrade beyond 10 reps as muscular endurance variation begins to dominate
the signal. There is no single peer-reviewed validation paper that subsumes
all formulas; the practical accuracy bounds are documented across the
training-science literature including in the Schoenfeld 2021 repetition
continuum review.

### Evidence-based reviews

- [Stronger By Science — Volume Review](https://www.strongerbyscience.com/volume/)
- [Stronger By Science — Progressive Overload Strategies](https://www.strongerbyscience.com/progressive-overload-strategies/)
- [Stronger By Science — Hypertrophy Range: Fact or Fiction?](https://www.strongerbyscience.com/hypertrophy-range-fact-fiction/)

### Books

- Israetel MA, Hoffmann JR, Davis MC, Feather J. *Scientific Principles of
  Hypertrophy Training.* Renaissance Periodization, 2021.
- Helms ER, Morgan A, Valdez A. *The Muscle and Strength Pyramid: Training.*
  2nd edition, 2019.
