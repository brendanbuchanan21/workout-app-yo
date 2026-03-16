# Session Autoregulation: Prescribing the Next Workout

## Decision: Dynamic Double Progression + Rep Trend Monitoring

After reviewing the literature, we use a **Dynamic Double Progression** system combined with **session-over-session rep trend monitoring** to prescribe load, volume, and flag overreaching.

## Core Principle

The most reliable automated signal for hypertrophy programming is: **can you match or beat your previous session's reps at the same weight?**

- Reps increasing at same weight → adaptation occurring, keep going
- Reps maintaining → near current adaptive capacity, hold
- Reps declining for 2+ consecutive sessions → MRV likely exceeded, reduce volume

We require **2+ consecutive sessions of decline** before adjusting volume down, to avoid overreacting to a single bad day (sleep, stress, nutrition).

## Load Prescription: Dynamic Double Progression

Each set is treated independently:

1. Assign a rep range (e.g., 8-12 reps) and a target RIR
2. Athlete trains at a given weight
3. When a set hits the **top of the rep range at target RIR**, increase weight for that set next session
4. Weight increment: 5 lbs (2.27 kg) upper body, 10 lbs (4.54 kg) lower body
5. Reps will drop toward the bottom of the range at the new weight
6. Build back up again

### RIR-Load Interaction

| Scenario | Action |
|----------|--------|
| Hit top of rep range AND at/above target RIR | Increase load next session |
| Within rep range AND at target RIR | Hold load |
| Below rep range OR below target RIR (too hard) | Hold load |
| Above rep range AND RIR well above target | Increase load (under-stimulated) |

### Sandbagging Detection

If reported RIR is consistently 3+ above target across multiple sets/sessions, the user is likely not pushing hard enough. Flag this to the user rather than silently adjusting, since the root cause is effort, not programming.

## Volume Prescription

Volume follows the mesocycle's planned progression (base + 1 set every 2 weeks) with performance-based overrides:

### Session Performance Score

Each session generates a performance assessment per exercise based on:

1. **Rep trend** (primary signal, 50% weight): Compare best reps at each weight vs. previous session of the same workout. Scored as: improving (+1), maintaining (0), declining (-1).

2. **Completion rate** (25% weight): Completed sets / planned sets. Below 80% flags a problem.

3. **RIR deviation** (25% weight): Average difference between actual and target RIR. Consistently low RIR (trying too hard) or high RIR (not hard enough) are both informative.

### Volume Adjustment Rules

| Performance Pattern | Volume Action |
|----|-----|
| Reps improving or holding, completion >= 90% | Follow planned volume progression |
| Reps improving, all sets hitting top of range | Consider adding 1 set (approaching MEV ceiling) |
| Reps declining for 1 session | Hold current volume, flag for monitoring |
| Reps declining for 2+ consecutive sessions | Remove 1-2 sets, suggest lighter load |
| Completion rate below 70% | Reduce volume, flag possible overreach |
| RIR consistently 0 when target is 2+ | Reduce load or volume, flag overexertion |

### Deload Triggers

The planned deload (last week of mesocycle) always occurs. An **early deload** is suggested if:
- Performance declines across 3+ exercises in the same session for 2+ consecutive sessions
- User reports inability to complete planned volume repeatedly

## Intra-Session Fatigue Assessment

Track rep drop-off from Set 1 to final set within each exercise:

| Rep Drop-Off | Interpretation |
|-------------|---------------|
| 0-15% | Low fatigue, productive |
| 15-30% | Moderate fatigue, normal for 3-4 sets |
| 30-40% | High fatigue, approaching practical limits |
| 40%+ | Excessive fatigue, junk volume territory |

This informs whether adding more sets to an exercise would be productive or just accumulate fatigue without stimulus.

## What We Track Per Exercise Per Session

For autoregulation to work, the system needs to store and compare:

1. **Per set**: weight (kg), reps, RIR, completed flag
2. **Per exercise per session**: number of sets completed, best set (weight x reps)
3. **Cross-session comparison**: same exercise, same workout slot (e.g., "Push A, Bench Press"), comparing rep performance at matching weights

## What We Do NOT Automate

- **Exercise selection**: If a user swaps an exercise mid-workout, we preserve that choice for future sessions but don't force it. Exercise swaps are preference signals.
- **Nutrition/sleep confounds**: We cannot separate training fatigue from life stress. Performance declines could be non-training-related, so we flag rather than auto-adjust.
- **Force deloads**: We suggest, not enforce. The user decides.

## Implementation: Next Session Prescription

The system fetches the **3 most recent completed sessions** for the same day label to enable consecutive decline detection (N vs N-1, N-1 vs N-2).

### Per-Exercise Algorithm

```
inputs:
  lastSession    = most recent completed session (N)
  olderSessions  = [session N-1, session N-2] (as available)
  targetRIR      = mesocycle RIR for current week
  repRange       = [low, high] from exercise catalog

1. DECLINE DETECTION
   declineRatio(A, B) = fraction of weight-matched sets where A.reps < B.reps
   consecutiveDeclines = 0
   if declineRatio(N, N-1) > 0.5:
     consecutiveDeclines = 1
     if declineRatio(N-1, N-2) > 0.5:
       consecutiveDeclines = 2

2. FATIGUE ASSESSMENT
   fatigueDropOff = (set1Reps - lastSetReps) / set1Reps  (at same weight)

3. VOLUME ADJUSTMENT
   if consecutiveDeclines >= 2:     remove 1 set (min 1)
   elif fatigueDropOff >= 0.4:      remove 1 set (junk volume)
   elif allSetsTopOfRange AND fatigueDropOff < 0.15:  add 1 set (max 6)
   else: hold current set count

4. LOAD PRESCRIPTION (per set, Dynamic Double Progression)
   for each set:
     if prevReps >= topOfRepRange AND prevRIR >= targetRIR AND consecutiveDeclines == 0:
       nextWeight = prevWeight + increment
       nextTargetReps = bottomOfRepRange
     else:
       nextWeight = prevWeight
       nextTargetReps = min(prevReps + 1, topOfRepRange)
     nextTargetRIR = mesocycle RIR for this week

5. FLAGS
   - Sandbagging: avgRIR >= targetRIR + 3
   - Completion rate below 70%
   - Single-session decline (monitoring)
   - 2+ session decline (volume reduced)
```

### Session-Level Notes

- If 2+ exercises hit consecutive decline with volume reduction → suggest deload
- If 3+ exercises show any decline → warn about broad performance drop

## Fractional Volume Counting (Enhancement)

Per Pelland et al. (2026), volume tracking is more accurate when distinguishing direct vs indirect sets:
- A bench press set = 1 direct chest set + 0.5 indirect tricep/front delt set
- A barbell row set = 1 direct back set + 0.5 indirect bicep set

This makes per-muscle-group volume and MRV detection more precise. The `secondaryMuscles` field in our ExerciseCatalog already captures this relationship; we count secondary muscles at 0.5x when computing weekly volume per muscle group.

## Sources

1. Helms, E.R., et al. (2016). "Application of the Repetitions in Reserve-Based Rating of Perceived Exertion Scale for Resistance Training." *Strength and Conditioning Journal*, 38(4).

2. Tuchscherer, M. (2016). "Fatigue Percents Revisited." *Reactive Training Systems*. Tracks e1RM decline across sets as a fatigue indicator.

3. Israetel, M., et al. "Training Volume Landmarks for Muscle Growth." *RP Strength*. Defines MEV, MAV, MRV framework for per-muscle-group volume.

4. Nuckols, G. "The New Approach to Training Volume." *Stronger by Science*. Volume increases relative to habitual levels outperform arbitrary high-volume prescriptions.

5. Evolved Training Systems. "Dynamic Double Progression." Treats each set independently for load progression decisions.

6. MASS Research Review. "A Progression Framework for Hypertrophy." Decision tree for when to add/hold/remove volume based on performance trends.

7. PMC 7927075 (2021). "Loading Recommendations for Muscle Strength, Hypertrophy, and Local Endurance: A Re-Examination of the Repetition Continuum." Hypertrophy across wide rep ranges when approaching failure.

8. PMC 12336695 (2025). "Autoregulated resistance training: systematic review and meta-analysis." Autoregulated approaches produce comparable or superior outcomes to fixed programming.

9. PMC 7575491 (2020). "Autoregulation in Resistance Training: Addressing the Inconsistencies." Framework for standardizing autoregulation terminology and methods.

10. Springer (2025). "RIR Estimation Accuracy." Accuracy degrades at higher rep ranges (12+) and lighter loads; improves with training experience.

11. Journal of Applied Physiology (2024). Volume increases based on previous habitual volume produce better hypertrophy outcomes than arbitrary volume assignments.

12. PMC 9302196 (2022). "Resistance Training Volume Optimization: Umbrella Review." Higher volumes generally produce more hypertrophy up to individual limits.

## Limitations

- RIR accuracy is poor in beginners; the system should weight objective data (reps, load) more heavily than subjective RIR for newer users
- Cannot account for non-training stressors (sleep, nutrition, life stress)
- Double progression works best within moderate rep ranges (6-15); very high rep work (20+) makes small load jumps less meaningful
- The 2-session decline rule may be too slow for aggressive overreaching scenarios but prevents premature deloading from single bad sessions
