# UI Refactor Brief

## Purpose

This refactor is about presentation, hierarchy, and product clarity, not adding more data.

The app already has strong underlying signal:

- strength over time
- volume over time
- exercise-level trends
- cross-screen historical context

The problem is that the presentation does not consistently surface that signal with enough clarity or conviction.

## Product Stance

This app is signal, not prescription.

The product should help the user read their training, not tell them how to train.

The UI should behave like an instrument panel:

- clear
- calm
- precise
- nonjudgmental
- interpretation-forward

## Core Principle

Reveal patterns clearly enough that users can draw their own conclusions.

## What The UI Should Emphasize

- change over time
- comparison against a baseline
- timeframe context
- recency
- variance or stability
- relationship between overview and drill-down

## What The UI Should Avoid

- flat lists of equally weighted stats
- controls dominating the top of the screen
- too many chips, tabs, and filters competing for attention
- generic status language that feels like coaching
- cards that feel like database rows
- making charts feel secondary when they are the best evidence

## Tone

Copy and layout should feel:

- observational
- analytical
- restrained
- confident

The app should say:

- what changed
- compared to when
- at what level
- how strong the signal is

The app should not say:

- what the user should do next
- whether a result is good or bad
- prescriptive training advice

## Hierarchy Rules

Every screen should have one clear hero.

That hero can be:

- a chart
- a comparison block
- a summary metric with context

Everything else should support that hero, not compete with it.

Controls should follow meaning whenever possible.

The user should see the signal before they see the filtering system.

## Screen Roles

Overview screens should answer:

- what is changing overall

Category screens should answer:

- where the signal is coming from

Detail screens should answer:

- what is happening in this specific metric, lift, or trend over time

Action screens should answer:

- what the user needs in order to complete the current task

These screens should not all feel visually identical.

## Current Design Tension

The app has strong data, but many surfaces present it in a uniform card/list language.

That creates a few problems:

- important information does not stand out enough
- insight screens can feel like indexes
- charts are sometimes buried instead of leading
- drill-down pages can feel more compelling than their parent pages

Example:

The exercise detail screen feels strong because it tells a focused story.
Some parent progress screens feel weaker because they present a collection of entries rather than a clear analytical view.

## Refactor Goals

1. Make the signal more legible without becoming prescriptive.
2. Strengthen visual hierarchy across the app.
3. Give charts and comparisons more of the emotional weight.
4. Make overview screens feel like insight surfaces, not directories.
5. Make list items feel like signal previews rather than stat containers.
6. Create stronger distinction between overview, drill-down, and action screens.

## Refactor Sequence

We will refactor one screen at a time.

Suggested order:

1. Progress
2. Exercise detail
3. Volume
4. Home
5. Train / program overview

## Screen Checklist

Before changing any screen, answer:

1. What is the primary question this screen answers?
2. What is the hero element?
3. What evidence supports the hero?
4. Which controls are necessary up front, and which can move lower?
5. Does this screen show signal, or just data?
6. Does the screen invite interpretation without drifting into advice?

## Component Rules

Cards should do at least one of these:

- show a trend
- show a comparison
- show a status with context
- preview a deeper story

If a card only holds a number and a label, it is probably too weak.

Lists should not be the main experience unless the user is actively browsing or searching.

When possible, a list item should preview why clicking into it is worth it.

## Progress Screen Direction

The Progress area should feel like an analytical dashboard first and a catalog second.

That means:

- a stronger top-level summary
- richer exercise previews
- clearer timeframe framing
- charts or trend indicators appearing earlier

The exercise detail page is a useful reference point for the visual standard.

Its strength is not just aesthetics. It has a clear narrative:

- current state
- peak reference
- recent history
- then vs now

Other insight surfaces should borrow that clarity.

## Decision Filter

When evaluating any new UI, ask:

- does this improve signal clarity?
- does this reduce noise?
- does this preserve user interpretation?
- does this make the most important pattern easier to see in under 3 seconds?

If not, it is probably decoration or drift.

## Working Method

For each screen:

1. Define the screen question.
2. Define the hero.
3. Remove or demote competing elements.
4. Make the most important comparison obvious.
5. Keep copy observational.
6. Ship the change before moving to the next screen.
