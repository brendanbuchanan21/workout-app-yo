# Muscle Development Signal Spec

## Purpose

This document defines the implementation spec for a muscle-group-level development signal.

The goal is to answer:

- where does the app have credible evidence of development right now?

This is not a direct estimate of hypertrophy.
It is an evidence-based inference built from training data already tracked by the app.

## Why This Exists

The current product already tracks valuable signals:

- exercise-level progression
- weekly volume by muscle group
- activity consistency
- body weight context

But the top of `Progress` does not currently answer the most useful question:

- which body areas appear to be progressing, holding, or lacking signal?

This spec defines the model and delivery path for that answer.

## Product Framing

Recommended names:

- `Development Signals`
- `Muscle Progress`
- `Progress Signals`

Avoid:

- `Hypertrophy Score`
- `Growth Score`
- `Muscle Gain`

Those names overclaim precision.

## Core Model

The signal is defined as:

- matched-effort performance trend
- interpreted in the context of recent volume
- gated by confidence and exposure sufficiency

Short version:

`muscle development signal = matched-effort performance trend + stimulus sufficiency check + confidence gate`

## Time Window

Use a rolling `8-week` window by default.

Split the window into:

- prior block: weeks 1-4
- recent block: weeks 5-8

Reason:

- muscle-group-level interpretation is slower and noisier than exercise-level progression
- 8 weeks provides a more stable read for hypertrophy-relevant signal
- it fits the app's periodized training model better than a shorter window

## Inputs

For each muscle group, use:

- completed working sets in the last 8 weeks
- load, reps, and RIR for relevant exercises
- weekly volume by muscle group
- active block guardrails
- phase intent as context only

## Existing Building Blocks

The app already has two useful internal signals:

### Signal 1: Volume Context

Current code:

- `backend/src/routes/volume.ts`
- `backend/src/services/recommendationEngine.ts`

Current role:

- compare current-week volume against productive guardrails
- identify below / within / above-range exposure

### Signal 2: Exercise-Level Progression

Current code:

- `backend/src/services/progressionAnalysis.ts`
- `backend/src/routes/progression.ts`

Current role:

- classify an exercise as `progressing`, `stalled`, or `regressing`
- use matched-effort performance as primary signal
- use effort-banded e1RM as fallback or companion context

The muscle-group signal should build on these rather than replacing them.

## Research Alignment

The implementation should stay aligned with three evidence constraints:

1. Volume matters for hypertrophy, but volume alone is not growth.
2. Strength and e1RM are informative but not direct measures of hypertrophy.
3. Comparable performance at similar effort is a stronger proxy than load changes alone.

This justifies:

- matched-effort performance as the primary directional signal
- volume as context and plausibility check
- confidence gating when exposure is sparse

## Output States

Each muscle group should be assigned one of four states:

- `developing`
- `holding`
- `mixed`
- `low_signal`

These states should be conservative and explainable.

### `developing`

Use when:

- one or more relevant exercises show credible matched-effort improvement
- no regression signal dominates
- recent exposure is sufficient
- recent volume is not clearly below productive range

### `holding`

Use when:

- performance is broadly maintained
- exposure is sufficient
- there is no clear upward or downward directional read

### `mixed`

Use when:

- progression and regression both appear in the evidence set
- or performance improves while volume/exposure meaningfully weakens interpretation
- or the contributing exercises disagree materially

### `low_signal`

Use when:

- there is not enough recent exposure
- there are too few usable exercise histories
- most evidence is low-confidence fallback
- data gaps are too large for a trustworthy call

## Confidence Levels

Each muscle group should also carry a confidence field:

- `high`
- `medium`
- `low`

Confidence should affect ordering and UI emphasis.

If confidence is too weak, prefer `low_signal` over a directional label.

## Exercise Inclusion Rules

For the first pass:

- only include exercises where the muscle is the `primary muscle`
- require at least `4 completed sessions` in the 8-week window for an exercise to contribute directional evidence
- exercises below that threshold can still appear in supporting context, but should not drive the state

This keeps the first implementation simpler and more trustworthy.

## Exposure Sufficiency Rules

A muscle group should be considered to have sufficient exposure if it has at least one of:

- `6+ completed sessions` touching that muscle in the 8-week window
- `2+ relevant exercises` with usable progression history
- `1 strong exercise-level signal` plus recent weekly volume that is not below floor

If none of these are met, default toward `low_signal`.

## Volume’s Role

Volume is contextual, not primary.

Volume should:

- verify that enough recent stimulus existed
- help decide whether the signal is credible
- explain why a signal becomes `mixed`
- help push sparse cases into `low_signal`

Volume should not:

- independently create `developing`
- override strong matched-effort evidence unless exposure is clearly insufficient

## Body Weight’s Role

Body weight is context only.

It should not determine the muscle-group state.

It can later appear in supporting copy such as:

- `Developing while body weight is stable`
- `Holding during a cut`

But it should not be part of the core decision tree.

## Decision Tree

For each muscle group:

1. Gather all relevant exercises where that muscle is primary.
2. Filter to exercises with at least 4 completed sessions in the last 8 weeks.
3. Run the existing progression classifier for each exercise.
4. Keep only credible exercise signals when aggregating:

- ignore low-confidence progression/regression calls
- allow stalled signals if they are not `limited_data`

5. Compute muscle-level exposure context:

- prior average weekly sets
- recent average weekly sets
- recent volume context relative to guardrails: `below`, `within`, `above`

6. Assign the muscle-group state:

### `low_signal` if:

- no usable exercise progression data exists
- or exposure sufficiency is not met
- or nearly all evidence is low-confidence fallback

### `developing` if:

- at least one credible progressing exercise exists
- no credible regressing exercise dominates
- exposure sufficiency is met
- recent volume is not below floor

### `holding` if:

- no credible progressing signal
- no credible regressing signal
- at least one credible stalled or maintained signal exists
- exposure sufficiency is met

### `mixed` if:

- progression and regression both exist
- or progression exists but recent volume/exposure materially weakens the interpretation
- or different exercises disagree too much for a clean directional read

## Confidence Rules

### `high`

Use when:

- 2+ relevant exercises have usable history
- total matched-effort evidence is strong
- exposure is continuous across the 8 weeks
- recent volume is within productive range

### `medium`

Use when:

- 1 exercise provides strong evidence
- or multiple exercises exist but evidence density is moderate

### `low`

Use when:

- evidence is sparse
- continuity is weak
- the read relies mostly on fallback evidence

## Summary Copy Rules

Each muscle group should include a one-sentence summary.

Good examples:

- `Comparable performance is improving across quad work with recent volume staying in a productive range.`
- `Chest performance is broadly maintained, with recent exposure supporting a holding read.`
- `Back work shows mixed evidence, with one lift improving while another has softened.`
- `Calves do not have enough recent exposure for a trustworthy directional read.`

Avoid:

- coaching language
- recommendations
- moralized judgments

## API Contract

Add a new endpoint:

- `GET /training/muscle-development-signals`

### Query Parameters

Optional:

- `range=8w`

First pass can hardcode `8w`, but the response should return the analyzed window for clarity.

### Response Shape

```ts
{
  range: "8w",
  analyzedWeeks: 8,
  generatedAt: string,
  signals: Array<{
    muscle: string,
    state: "developing" | "holding" | "mixed" | "low_signal",
    confidence: "high" | "medium" | "low",
    summary: string,
    drivers: string[],
    topExercises: Array<{
      exerciseName: string,
      status: "progressing" | "stalled" | "regressing",
      confidence: "high" | "medium" | "low",
      detail: string
    }>,
    priorAvgWeeklySets: number,
    recentAvgWeeklySets: number,
    volumeContext: "below" | "within" | "above" | "insufficient",
    sessionsTouchingMuscle: number
  }>
}
```

## Sorting Rules

For the top-level `Progress` hero, sort signals by:

1. state priority
2. confidence
3. evidence density

Suggested state priority:

- `developing`
- `mixed`
- `holding`
- `low_signal`

This helps the top of the screen surface the most useful reads first.

## Backend Implementation Plan

### Step 1

Create a new service:

- `backend/src/services/muscleDevelopmentSignals.ts`

Responsibility:

- aggregate exercise-level progression into muscle-group-level states

### Step 2

Reuse or lightly refactor existing progression logic from:

- `backend/src/services/progressionAnalysis.ts`

Possible extraction target:

- a function that can analyze a single exercise over a specific recent window

### Step 3

Compute 8-week muscle-level volume context using the same training data shape already used in:

- `backend/src/routes/volume.ts`

### Step 4

Add a new route:

- `backend/src/routes/muscleDevelopment.ts`

Mounted under:

- `/training/muscle-development-signals`

### Step 5

Return ranked muscle-group signals for the current user and active block

## Frontend Implementation Plan

### Step 1

Replace the current `Progress` hero with a new `Development Signals` module.

### Step 2

The hero should show:

- top 3-5 muscle groups
- state
- confidence
- one-line summary

### Step 3

Each row should be tappable.

First-pass tap behavior:

- switch to the most relevant existing lens
- likely `strength` or `volume`
- optionally preselect the tapped muscle

Later:

- add a dedicated muscle-group drill-down view

## First UI Shape

Recommended first-pass hero:

- title: `Development Signals`
- subtitle: `Where the clearest evidence of progress is showing up over the last 8 weeks.`
- ranked rows such as:

- `Quads — Developing`
- `Chest — Holding`
- `Back — Mixed`
- `Calves — Low Signal`

Each row includes:

- state pill
- confidence label or icon treatment
- summary copy

## Non-Goals

The first pass should not:

- estimate actual muscle gain
- create one global full-body score
- use body weight as a core determinant
- aggregate secondary-muscle contributions
- provide prescriptive recommendations in the `Progress` hero

## Open Questions

These should be decided before implementation if possible:

1. Should `mixed` rank above or below `holding` in the UI?
2. Should recent volume below floor always block `developing`, or only reduce confidence?
3. Should phase intent modify thresholds, or remain context-only in v1?
4. Should the first pass include only active-block data, or all recent completed sessions regardless of block boundaries?

## Recommended First-Pass Defaults

Use these unless there is a strong reason not to:

- active block plus all completed sessions within the last 8 weeks
- primary muscle only
- matched-effort progression as primary directional signal
- volume below floor weakens or blocks `developing`
- phase intent shown in copy, not in the state logic

## Success Criteria

This feature is successful if:

1. The top of `Progress` answers `where am I actually progressing right now?`
2. The read is explainable from visible evidence.
3. The app avoids fake precision.
4. Sparse data produces `low_signal` instead of a misleading directional claim.
5. The resulting hero feels more valuable than a generic stats dashboard.
