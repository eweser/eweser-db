---
title: Callouts Test
---

# Callouts Test Note

<!-- Tests: all 13 callout types + foldable (+ and -) + nested callouts -->

## Basic Note Callout

> [!note]
> This is a note callout with no title override.

> [!note] Custom Note Title
> This note callout has a custom title.

## Abstract / Summary / TL;DR

> [!abstract]
> Abstract callout content.

> [!summary]
> Summary callout content.

> [!tldr]
> TL;DR callout content.

## Info

> [!info]
> Informational callout. Great for supplementary context.
> Supports **bold**, _italic_, and `code`.

## Todo

> [!todo]
>
> - [ ] Task one
> - [ ] Task two
> - [x] Completed task

## Tip / Hint / Important

> [!tip]
> A helpful tip!

> [!hint]
> Hint callout.

> [!important]
> Important callout.

## Success / Check / Done

> [!success]
> Everything worked!

> [!check]
> Check callout.

> [!done]
> Done callout.

## Question / Help / FAQ

> [!question]
> Is this working?

> [!help]
> Help callout.

> [!faq]
> Frequently asked question callout.

## Warning / Caution / Attention

> [!warning]
> Be careful with this.

> [!caution]
> Caution callout.

> [!attention]
> Attention callout.

## Failure / Fail / Missing

> [!failure]
> Something failed.

> [!fail]
> Fail callout.

> [!missing]
> Missing callout.

## Danger / Error

> [!danger]
> Danger! High risk.

> [!error]
> Error callout.

## Bug

> [!bug]
> This is a known bug. See [[Wiki Links]] for details.

## Example

> [!example]
> Here is an example:
>
> ```typescript
> const x = 42;
> ```

## Quote / Cite

> [!quote]
> "Quote callout content goes here."
> — Author Name

> [!cite]
> Citation callout.

## Foldable Callouts

Expanded by default (use `+`):

> [!note]+ Expanded by Default
> This callout starts expanded.

Collapsed by default (use `-`):

> [!note]- Collapsed by Default
> This callout starts collapsed.

## Nested Callouts

> [!warning] Outer Warning
> This is the outer callout.
>
> > [!info] Inner Info
> > This is nested inside the warning.
> >
> > > [!tip] Deeply Nested
> > > Three levels deep!
> > > Back in the outer callout.

## Callout With Multi-Line Content

> [!info] Multi-Line Callout
> First paragraph inside the callout.
>
> Second paragraph inside the same callout.
>
> - List item one
> - List item two
>
> **Bold text** and [[Wiki Links|a wiki link]] inside a callout.
