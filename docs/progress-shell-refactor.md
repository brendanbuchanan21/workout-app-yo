# Progress Shell Refactor

## Scope

This document covers the top-level `Progress` screen shell only.

It does not redesign the internal content of:

- `StrengthTab`
- `VolumeTab`
- `PRsTab`
- `ActivityTab`
- `WeightTab`

Those will be refactored after the shell is corrected.

Current shell file:

- `frontend/app/(tabs)/progress.tsx`

## Why This Screen Is First

This is the densest signal surface in the product, but the current layout makes navigation more prominent than insight.

The user lands on:

- a title
- a large segmented control
- a full sub-screen

That means the page asks the user to choose a lens before showing them a clear signal.

This is backwards for a screen called `Progress`.

## Primary Screen Question

What is changing in training right now?

This question should be answered before the user starts filtering by lens.

## Current Problems

1. The tab control is visually dominant too early.
2. The shell has no hero layer.
3. There is no top-level summary tying together strength, volume, PRs, and activity.
4. The page feels like a container for separate tools rather than a coherent analytical surface.
5. The strongest insight experiences sit one layer deeper than the parent screen.

## Refactor Goal

Make `Progress` feel like a dashboard hub first and a view switcher second.

## New Hierarchy

The screen should be structured in this order:

1. Screen heading
2. Hero summary
3. Secondary lens switcher
4. Active lens content

This ensures the user sees signal before controls.

## Proposed Shell Structure

### 1. Screen Heading

Keep:

- title: `Progress`

Add:

- short observational subheading

Example direction:

- `A clear read on how your training is changing.`

This should set tone, not coach.

### 2. Hero Summary

Add a top summary card or summary cluster above the lens switcher.

This should synthesize across datasets already loaded by the shell.

The hero should answer:

- what stands out right now
- over what horizon
- in what area

It should not prescribe action.

### Hero Content Principles

The hero should use evidence already available in the shell:

- PR recency
- activity consistency
- volume comparisons
- bodyweight trend if relevant

It should be compact and scannable.

It should not try to summarize every domain equally.

### Hero Candidate Modules

Good candidates:

- `Recent signal`
- `This week vs previous`
- `Training pulse`

Example content:

- PR count over recent history
- current week training volume vs previous week
- recent training frequency or streak

The hero is not a final insight engine. It is a framing layer.

## 3. Lens Switcher

The current segmented row should be demoted.

### Current problem

The tabs visually compete with the content and feel like the main feature.

### Refactor direction

Change the switcher into a lighter horizontal chip row.

Properties:

- scrollable horizontally if needed
- less padded than the current segmented control
- clearly secondary to the hero
- still easy to tap

This makes the active content feel like part of one screen rather than a hard mode change.

## 4. Active Lens Content

The selected lens content remains below the switcher.

The shell should not force the internal tabs to change yet.

This refactor only changes:

- framing
- hierarchy
- section spacing
- control priority

## Default Lens

The default lens should remain `Insights` for now.

Reason:

- it is the closest thing to a top-level interpretive surface
- it better matches the screen name than `Strength` or `PRs`

We can revisit the default after the hero is implemented and the internal tabs are improved.

## Visual Direction

The shell should feel:

- calmer
- more editorial
- less control-heavy

That means:

- more spacing between sections
- stronger distinction between heading, hero, switcher, and body
- less emphasis on container chrome for the switcher
- at least one top-level block that feels purpose-built for this screen

## Data Reuse

The shell already fetches:

- weight entries
- exercise volume comparison
- activity data

This is enough to build a first-pass hero without adding major new API work.

Possible later enhancement:

- add PR feed summary or progression summary to the shell hero once the first-pass structure lands

## First Implementation Pass

The first code pass should do only this:

1. Add a subheading below `Progress`.
2. Add a hero summary block above the lens switcher.
3. Replace the current full-width segmented control with a lighter horizontal chip switcher.
4. Preserve existing tab content and data flows.

This keeps the change high leverage and low risk.

## Hero Summary: First Pass Recommendation

Use a 3-card summary cluster:

- `Volume shift`
- `Training activity`
- `Body weight`

Each card should show:

- current state
- comparison baseline
- minimal interpretation

Examples:

- `Week 7 volume +12% vs prior`
- `4 active days in the last 30d`
- `Body weight -0.8 lbs over 7d`

If data is missing, fall back to neutral copy rather than hide the structure completely.

## Copy Rules

Use observational language.

Good:

- `Up vs prior week`
- `Near recent peak`
- `Stable over the last 7 days`
- `No recent entries`

Avoid:

- `You should`
- `Needs work`
- `Behind`
- `On track`

## Non-Goals

This pass will not:

- redesign `StrengthTab`
- redesign exercise cards
- redesign `VolumeTab`
- add new backend endpoints
- change information architecture outside the `Progress` shell

## Success Criteria

The shell refactor is successful if:

1. The user can understand something meaningful about their progress in under 3 seconds.
2. The page feels like one analytical surface rather than a stack of unrelated tabs.
3. Controls no longer dominate the first impression.
4. The selected lens feels like an exploration path, not the starting burden.

## Next Step After Shell

After the shell lands, the next refactor should be:

- `StrengthTab`

Reason:

- it currently contains high-value signal in a list-first structure
- it is the clearest place where drill-down quality exceeds parent-screen quality
