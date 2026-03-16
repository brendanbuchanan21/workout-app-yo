# RIR Progression Model

## Where This Is Used

- **Backend:** `backend/src/services/workoutGenerator.ts` — `getRirForWeek()` function
- **Backend:** `backend/src/routes/training.ts` — session creation, today endpoint, template application
- **Frontend:** `frontend/app/(tabs)/train.tsx` — RIR display in workout header, set logging inputs, fatigue estimation model
- **Feature:** Determines the target RIR for each week of a mesocycle, controlling how close to failure the user trains as the block progresses

## How It Works

RIR (Reps in Reserve) decreases across a mesocycle, progressively pushing the lifter closer to failure as they adapt. The system uses configurable parameters:

- **Starting RIR** — how far from failure the first week begins
- **RIR Floor** — the minimum RIR allowed (may differ for compound vs isolation exercises)
- **RIR Decrement** — how much RIR drops per week
- **Deload RIR** — the RIR used during the deload week

### Formula

```
targetRir(week) =
  if (week === deloadWeek) → deloadRir
  else → max(rirFloor, startingRir - (week - 1) * rirDecrement)
```

### Defaults and Configurable Ranges

| Parameter | Default | Range | Notes |
|-----------|---------|-------|-------|
| Starting RIR | 3 | 2-5 | Beginners: 4-5. Intermediate: 3. Advanced: 2-3 |
| RIR Floor (compounds) | 1 | 0-3 | Squat/deadlift/bench: 1-2. Rows/OHP: 1 |
| RIR Floor (isolations) | 0 | 0-2 | Safe to reach failure on machines and single-joint work |
| RIR Decrement per week | 1 | 0.5-1 | Use 0.5 for longer mesocycles (6+ weeks) |
| Deload RIR | 6 | 4-7 | Light effort, focus on movement quality |
| Mesocycle length | 4 weeks + deload | 3-6 weeks + deload | Must fit the RIR progression |

### Validation Rule

The accumulation phase must be long enough to fit the progression:

```
accumulationWeeks >= (startingRir - rirFloor) / rirDecrement
```

### Example Progressions

**Standard 4+1 (default):** Starting RIR 3, Floor 0, Decrement 1/week

| Week | Target RIR |
|------|-----------|
| 1 | 3 |
| 2 | 2 |
| 3 | 1 |
| 4 | 0 |
| 5 | 6 (deload) |

**Conservative 5+1:** Starting RIR 4, Floor 1, Decrement 1/week

| Week | Target RIR |
|------|-----------|
| 1 | 4 |
| 2 | 3 |
| 3 | 2 |
| 4 | 1 |
| 5 | 1 (floor) |
| 6 | 6 (deload) |

**Long block 6+1:** Starting RIR 4, Floor 1, Decrement 0.5/week (round to nearest int for display)

| Week | Target RIR |
|------|-----------|
| 1 | 4 |
| 2 | 4 |
| 3 | 3 |
| 4 | 3 |
| 5 | 2 |
| 6 | 1 |
| 7 | 6 (deload) |

### Compound vs Isolation RIR Offset

The research supports different RIR targets for compound vs isolation exercises within the same week:

- **Compound exercises** (squat, bench, deadlift, rows): Use the week's prescribed RIR as-is, with a higher floor (default: 1)
- **Isolation exercises** (curls, lateral raises, extensions): Can go 1 RIR lower than compounds, with a lower floor (default: 0)

This is because compound lifts carry higher injury risk at failure and greater systemic fatigue, while isolations are safe to push harder.

## Research Basis

### Why Progressive RIR Reduction Works

Training further from failure produces less fatigue per unit of stimulus. Starting a mesocycle at higher RIR allows:
1. Volume to accumulate without excessive fatigue
2. Progressive overload through intensity (closer to failure) week over week
3. A deload to dissipate fatigue before the next block

Going too close to failure too early front-loads fatigue and reduces training quality in later weeks.

### Should Trainees Go to Failure (RIR 0)?

The research shows a **trivial, non-significant advantage** for training to failure vs stopping 1-2 reps short:

- **Refalo et al. (2023)** meta-analysis of 15 studies found an effect size of 0.19 (trivial) for failure vs non-failure training on hypertrophy. Not statistically significant.
- **Robinson et al. (2024)** meta-regression confirmed hypertrophy improves closer to failure, but the relationship is not steep. Going from 2 RIR to 0 RIR provides minimal additional stimulus.
- For **strength**, Robinson et al. found gains were "similar across a wide range of RIR."
- Training to failure does increase injury risk, especially on compound movements where technique degrades.

**Conclusion:** RIR 0 is acceptable on isolation/machine exercises but generally unnecessary and potentially counterproductive on heavy compounds. The default compound floor of RIR 1 is well-supported.

### RIR Accuracy

People's ability to estimate RIR affects how useful the system is:

- **Zourdos et al. (2016)** validated the RIR-based RPE scale. Experienced lifters showed strong correlation (r = -0.88) between bar velocity and RPE.
- **2022 meta-analysis** (414 participants): Average RIR underestimation of ~1 rep (people think they're closer to failure than they are).
- Accuracy is highest at 0-1 RIR (~90%), drops below 50% at 3+ RIR.
- Accuracy improves with training experience and with subsequent sets (set 3 is more accurate than set 1).
- Lower rep ranges (heavier loads) produce more accurate estimates.

**App implication:** The system should trust user-reported RIR but recognize that early-week, high-RIR estimates are less reliable. The fatigue model accounts for this.

### Population-Specific Considerations

| Population | Starting RIR | RIR Floor | Notes |
|-----------|-------------|-----------|-------|
| Beginner | 4-5 | 2 | Poor RIR accuracy, technique priority, low stimulus threshold |
| Intermediate | 3 | 1 (compounds), 0 (isolations) | Standard progression |
| Advanced | 2-3 | 1 (compounds), 0 (isolations) | Need higher intensity, better RIR accuracy |
| Older adults (65+) | 4-5 | 2 | Cardiovascular concerns at failure, lower RIR accuracy |
| During a cut | +1 to normal | +1 to normal | Impaired recovery in caloric deficit |

### Deload Protocols

- **Duration:** 5-7 days (mean 6.4 days from Bell et al. 2024 survey)
- **Frequency:** Every 4-6 weeks (mean 5.6 weeks)
- **Volume reduction:** 40-60% (most common: halve the number of sets)
- **RIR during deload:** 5-7 (light effort)
- **Placement:** Typically the final week of a mesocycle

Two valid approaches:
1. **Reduce volume, maintain intensity** — better for preserving strength
2. **Reduce both** — better when fatigue is very high

## Sources

### 1. Zourdos et al. (2016) — RIR-Based RPE Scale Validation

- **What:** Development and validation of the RIR-based RPE scale using bar velocity as an objective criterion
- **Key finding:** Strong inverse correlation between bar velocity and RPE in experienced lifters (r = -0.88), weaker in novices (r = -0.77)
- **Used for:** Foundational validity of the RIR system
- **URL:** https://pmc.ncbi.nlm.nih.gov/articles/PMC4961270/

### 2. Refalo et al. (2023) — Proximity-to-Failure and Hypertrophy Meta-Analysis

- **What:** Meta-analysis of 15 studies comparing training to failure vs non-failure for muscle hypertrophy
- **Key finding:** Trivial effect size (0.19) favoring failure training, not statistically significant
- **Used for:** Justifying that RIR 1-2 is nearly as effective as RIR 0 for hypertrophy, supporting compound RIR floor of 1
- **URL:** https://pmc.ncbi.nlm.nih.gov/articles/PMC9935748/

### 3. Robinson et al. (2024) — Dose-Response for RIR vs Strength/Hypertrophy

- **What:** Meta-regression examining the relationship between proximity to failure and both hypertrophy and strength outcomes
- **Key findings:** Hypertrophy improves closer to failure but with diminishing returns. Strength gains similar across a wide RIR range.
- **Used for:** Supporting the progressive RIR model and validating that strength doesn't require failure training
- **URL:** https://pubmed.ncbi.nlm.nih.gov/38970765/

### 4. Remmert et al. (2023) — RIR Accuracy Across Populations

- **What:** Examined RIR estimation accuracy in trained and untrained men and women
- **Key finding:** Accuracy depends on proximity to actual failure, rep range, and number of sets performed, not just training experience
- **Used for:** Understanding limitations of user-reported RIR, informing how the app should weight RIR data
- **URL:** https://journals.sagepub.com/doi/10.1177/00315125231169868

### 5. 2022 Meta-Analysis — RIR Underestimation

- **What:** Meta-analysis of 414 participants examining RIR estimation accuracy
- **Key finding:** Average underestimation of ~1 rep (people think they're closer to failure than reality)
- **Used for:** The app should be aware that logged RIR may be ~1 rep lower than actual RIR
- **Citation:** Referenced in Stronger by Science and MASS Research Review analyses

### 6. Bell et al. (2024) — Deloading Practices Survey

- **What:** Survey of strength and physique athletes on deloading practices
- **Key findings:** Mean deload duration 6.4 days, mean frequency every 5.6 weeks, most common approach is 50% volume reduction
- **Used for:** Default deload parameters
- **URL:** https://pmc.ncbi.nlm.nih.gov/articles/PMC10948666/

### 7. Bell et al. (2023) — Coaches' Perceptions of Deloading (Delphi Consensus)

- **What:** Delphi method consensus study among strength and conditioning coaches
- **Key finding:** Broad agreement on volume reduction as primary deload mechanism, with intensity maintenance preferred
- **Used for:** Validating the deload approach
- **URL:** https://pmc.ncbi.nlm.nih.gov/articles/PMC10511399/

### 8. Helms et al. (2018) — RPE as Autoregulation Method

- **What:** Comparison of autoregulated RPE-based programs vs fixed-load programs over 12 weeks
- **Key finding:** Autoregulated group showed greater squat improvements
- **Used for:** Supporting RIR/RPE as a valid programming framework over fixed percentages

### 9. RIR Validity in Older Adults (2025)

- **What:** Validation study of RIR accuracy in adults aged 65+
- **Key finding:** Lower accuracy than younger adults, with underestimation at RIR 2 and RIR 4
- **Used for:** Higher default starting RIR and floor for older populations
- **URL:** https://www.sciencedirect.com/science/article/pii/S053155652500213X

### 10. Renaissance Periodization (Israetel) — Mesocycle RIR Framework

- **What:** Coaching framework for RIR-based mesocycle programming
- **Key recommendations:** Start at 3-4 RIR, end at 0-1 RIR. RIR 0 acceptable on isolations/machines. Volume increases alongside intensity. Deload every 4th week.
- **Used for:** Default progression model, compound vs isolation floor distinction
- **URL:** https://rpstrength.com/blogs/articles/progressing-for-hypertrophy

## Limitations

- All retention and RIR values are population averages from trained subjects. Individual variation is significant.
- RIR accuracy is inherently imperfect, especially at 3+ RIR. The system works best for intermediate-to-advanced trainees.
- The model uses a single RIR decrement rate. Some advanced programs use undulating RIR within a week (heavy/light days), which is not currently supported.
- Compound vs isolation classification is binary. Some exercises fall in between (e.g., dumbbell rows).
- The model does not currently account for training frequency, caloric status, sleep, or stress, all of which affect recovery and appropriate RIR targets.
- Female lifters may tolerate closer proximity to failure with less fatigue accumulation (PMC9908800), but the model uses male-derived data as the conservative default.
