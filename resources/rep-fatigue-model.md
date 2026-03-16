# Rep Fatigue Estimation Model

## Where This Is Used

- **Frontend:** `frontend/app/(tabs)/train.tsx` — `openSetInput()` function
- **Feature:** When logging sets during a workout, the app pre-fills estimated reps for upcoming sets based on the user's performance on earlier sets in the same exercise

## How It Works

The model estimates rep drop-off across sets using two factors:

1. **Baseline failure retention** — How many reps you'd retain set-to-set if training to absolute failure with ~2 min rest
2. **RIR modifier** — Scales the drop-off down based on how far from failure the user is training (higher RIR = less fatigue accumulation = less rep loss)

### Formula

```
dropOff = 1 - failureRetention[setPosition]
adjustedRetention = 1 - (dropOff * rirModifier[targetRir])
estimatedReps = round(set1Reps * adjustedRetention)
```

### Constants

**Failure retention (sets to failure, ~2 min rest):**

| Set | Retention |
|-----|-----------|
| 1   | 100%      |
| 2   | 70%       |
| 3   | 55%       |
| 4   | 50%       |
| 5   | 45%       |

**RIR modifier (scales the drop-off):**

| Target RIR | Modifier |
|------------|----------|
| 0 (failure)| 1.00     |
| 1          | 0.73     |
| 2          | 0.55     |
| 3+         | 0.45     |

### Example

Set 1 logged: 225 lbs, 10 reps, RIR 3

| Set | Failure drop-off | After RIR 3 adjustment | Estimated reps |
|-----|-----------------|------------------------|---------------|
| 1   | 0%              | 0%                     | 10            |
| 2   | 30%             | 30% x 0.45 = 13.5%    | 9             |
| 3   | 45%             | 45% x 0.45 = 20.3%    | 8             |
| 4   | 50%             | 50% x 0.45 = 22.5%    | 8             |

Weight carries forward unchanged. RIR stays at the session target.

## Sources

### 1. Stronger by Science — Set-to-Set Rep Drop-Off Meta-Analysis

- **What:** Meta-analysis of 29 studies examining rep retention across 4+ sets to failure with fixed load
- **Key finding:** Reps retained per set follow a percentage curve (70%, 55%, 50%, 45%), not a flat decrease. Fatigue plateaus after ~5 sets.
- **Used for:** Baseline `failureRetention` values
- **URL:** https://www.strongerbyscience.com/reps-sets/

### 2. PMC3899651 — Effect of Different Rest Intervals on Squat Performance

- **What:** Study measuring squat volume across 4 sets to failure at ~8RM with 1, 2, and 5 minute rest periods
- **Key finding:** At 2 min rest, retention was 73% (set 2), 61% (set 3), 43% (set 4). At 5 min rest, retention was 91%, 81%, 64%. Rest period is the biggest single variable.
- **Used for:** Validating the ~2 min rest baseline. Future improvement could incorporate rest period adjustments.
- **URL:** https://pmc.ncbi.nlm.nih.gov/articles/PMC3899651/

### 3. PMC9908800 — Proximity-to-Failure and Neuromuscular Fatigue

- **What:** Study on trained subjects doing 6 sets of leg press at 3-RIR, 1-RIR, and 0-RIR (failure), measuring rep decrease from first to final set
- **Key findings:**
  - 0-RIR (failure): 59% total rep decrease (males), 51% (females)
  - 1-RIR: 43% decrease (males), 37% (females)
  - 3-RIR: 29% decrease (males), 25% (females)
  - 3-RIR maintained the most consistent rep counts and best velocity maintenance
- **Used for:** Deriving `rirModifier` values. Ratios calculated as: 1-RIR modifier = 43/59 = 0.73, 3-RIR modifier = 29/59 = 0.49 (rounded to 0.45)
- **URL:** https://pmc.ncbi.nlm.nih.gov/articles/PMC9908800/

### 4. PMC4961270 — Application of the RIR-Based RPE Scale

- **What:** Validation study for using Reps in Reserve as a method of autoregulating training intensity
- **Used for:** General framework supporting RIR as a valid fatigue management tool
- **URL:** https://pmc.ncbi.nlm.nih.gov/articles/PMC4961270/

## Limitations

- The model assumes ~2 minute rest periods between sets. Shorter rest would increase drop-off, longer rest would decrease it.
- Individual variation is significant. These are population averages from trained subjects.
- The model uses male data from the RIR study. Female lifters typically show less fatigue accumulation (could be a future refinement).
- Compound vs isolation exercises may have slightly different fatigue curves, but the percentage model is a reasonable approximation for both.
- The estimates are suggestions, not prescriptions. Users can always adjust the pre-filled values.
