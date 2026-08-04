# Alpha Tester Guide

> Historical note: this guide documents the private alpha validation phase. The responsive web product is now publicly released; current behavior and limitations are documented in `README.md` and `docs/PROJECT_STATUS.md`.

## Purpose

This alpha tests whether the subnetting Journey, optional learning material, Guided Practice, and optional timed practice are clear and useful.

## Limited-link access

The URL is unlisted and asks search engines not to index it, but it is **not private or access-controlled**. Anyone with the URL can open or forward it. Do not enter sensitive or personal information.

This is an independent standalone project. External resources are linked for convenience; inclusion does not imply affiliation, partnership, or endorsement.

## Recommended devices

Start on a phone browser because mobile functionality is the primary target. If possible, continue testing in a tablet or desktop browser.

There are no current Apple or Android app-store builds. Native packaging is deferred.

## What to test

### 1. Main Journey

1. Select **Start Journey**.
2. Enter a network address using the four octet fields.
3. Submit an incorrect answer and review the feedback.
4. Submit the correct answer and continue.
5. Reload the page.
6. Confirm **Continue Journey** resumes at the first incomplete question.

The Journey is untimed. Learning and Timed Mode do not gate or change Journey progress.

### 2. Learn Subnetting

1. Select **Learn Subnetting**.
2. Compare the block-size and binary-boundary methods.
3. Review worked examples.
4. Complete the six-step guided lesson.
5. Complete all four Guided Practice scenarios.
6. Try one new `/26–/29` example without app hints and explain your method aloud.

Learning and Guided Practice are optional, unscored, and do not award ranks or badges.

### 3. Timed Mode

1. Select **Play Timed Mode**.
2. Confirm the setup title and instructions are readable.
3. Try the two-minute preset.
4. Submit three incorrect answers.
5. Confirm hints become available only after the third incorrect attempt.
6. Reveal a hint and confirm the available score decreases.
7. Complete a timed solve if possible.
8. Optionally repeat with the four-minute preset.

If time expires, confirm the typed answer remains visible and **Continue Without Timer** allows score-free practice.

### 4. Local Rank and Badges

1. Return to the main menu.
2. Select **Local Rank & Badges**.
3. Review personal points, rank progress, and earned badges.
4. If a badge is available, try sharing it.

Timed practice results are local, session-only, and unverified. They are not a public leaderboard, competitive ranking, certification, or server-verified credential.

## Progress behavior

Journey completion is saved in the current browser and survives reloads on the same site.

It does not sync between a phone and desktop, between browsers, or between devices. Clearing site data or using storage-restricted/private browsing may remove or block it.

Timed scores, ranks, and badges remain session-local and can disappear when the page session ends.

Do not use this alpha for high-stakes assessment or verified student ranking.

## Mobile checks

Please specifically report:

- Whether all four octets remain on one readable line
- Whether the keyboard hides the active input or button
- Whether typed digits and the caret remain visible
- Whether anything overlaps or scrolls horizontally
- Whether browser Back behaves as expected
- Whether rotation or returning from another tab causes a problem

## Feedback requested

Include:

- Device and browser
- Section and step
- What you expected
- What happened
- Screenshot or recording, if possible
- Whether instructions were clear
- Whether any interaction felt confusing, stressful, or unfair
- Which learning method was easiest to understand
- Whether you could solve a new example without hints

Do not include passwords, private account information, or sensitive personal information.

## Known limitations

- No account or cross-device synchronization
- Timed scores/ranks/badges are session-local
- No server-authoritative scores or rankings
- No verified public badges or credentials
- No public student leaderboard
- Physical iPhone WebKit verification is tracked separately from desktop emulation
- Native packaging and store distribution are deferred
