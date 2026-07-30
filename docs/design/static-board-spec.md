# Static Backgammon Board Specification

## Purpose

This specification defines the visual and geometry decisions required to implement a static SVG backgammon board milestone with minimal follow-up decision-making.

In scope:

- desktop layout
- phone layout
- SVG coordinate system
- board regions and dimensions
- point-index-to-screen mapping
- default and flipped orientations
- point geometry formulas
- checker geometry and stack compression rules
- bar rendering
- bear-off rendering
- component/module boundaries
- static fixtures
- static-board acceptance criteria

Out of scope:

- checker selection
- legal or recommended move highlights
- drag and drop
- dice
- animations
- move generation or move application
- coaching interactions
- persistence
- model integration

## Domain integration assumptions

Use the existing deterministic domain package as-is.

Relevant existing exports:

- Player
- PointIndex
- PointOccupancy
- BoardPosition
- STANDARD_STARTING_POSITION
- getPointOccupancy
- countPlayerCheckers

Board numbering assumptions already established in domain:

- points are permanently numbered 1 through 24
- white moves 24 toward 1
- black moves 1 toward 24
- orientation changes never renumber points

## Layout specification

### Desktop layout

Intent:

- board workspace is the dominant area
- board workspace is about 70 percent width
- coaching placeholder area is about 30 percent width
- minimal header above
- minimal action row below
- board centered inside board workspace
- no permanent nav rail
- no dashboard card grid

Suggested page regions:

- Header: full width, compact
- Main content: two columns, 7fr and 3fr
- Actions: full width, compact row below board and coaching

Desktop wireframe:

+---------------------------------------------------------------+
| Header |
+-----------------------------------------+---------------------+
| Board workspace (about 70%) | Coaching (about 30%)|
| | |
| [ centered SVG board ] | Placeholder copy |
| | |
+-----------------------------------------+---------------------+
| Action row (compact buttons/placeholders) |
+---------------------------------------------------------------+

### Phone layout

Intent:

- board spans available width
- coaching content appears below board
- controls are touch-friendly
- no side-by-side coaching panel on narrow screens
- no bottom-sheet decision yet

Phone wireframe:

+------------------------------------------+
| Header |
+------------------------------------------+
| Board workspace |
| [ full-width SVG board ] |
+------------------------------------------+
| Action row (touch targets) |
+------------------------------------------+
| Coaching placeholder |
+------------------------------------------+

## SVG coordinate system and named constants

Use:

- viewBox: 0 0 1200 800

Named constants for geometry:

- VIEWBOX_WIDTH = 1200
- VIEWBOX_HEIGHT = 800
- BOARD_TOP = 40
- BOARD_BOTTOM = 760
- BOARD_MID_Y = 400
- CENTER_GAP_HALF = 80
- TOP_POINT_APEX_Y = BOARD_MID_Y - CENTER_GAP_HALF = 320
- BOTTOM_POINT_APEX_Y = BOARD_MID_Y + CENTER_GAP_HALF = 480

Fixed horizontal regions:

- LEFT_BEAR_OFF_X0 = 0
- LEFT_BEAR_OFF_X1 = 90
- LEFT_HALF_X0 = 90
- LEFT_HALF_X1 = 560
- BAR_X0 = 560
- BAR_X1 = 640
- RIGHT_HALF_X0 = 640
- RIGHT_HALF_X1 = 1110
- RIGHT_BEAR_OFF_X0 = 1110
- RIGHT_BEAR_OFF_X1 = 1200

Derived widths:

- HALF_WIDTH = 470
- BAR_WIDTH = 80
- BEAR_OFF_WIDTH = 90
- QUADRANT_POINT_COUNT = 6
- QUADRANT_SLOT_WIDTH = HALF_WIDTH / 6 = 78.333333
- POINT_X_INSET = 6
- POINT_STACK_HEIGHT = TOP_POINT_APEX_Y - BOARD_TOP = 280

Vertical interpretation:

- top row uses BOARD_TOP to TOP_POINT_APEX_Y
- bottom row uses BOARD_BOTTOM to BOTTOM_POINT_APEX_Y
- center movement gap uses TOP_POINT_APEX_Y to BOTTOM_POINT_APEX_Y

## Default point mapping

Default visual mapping in white-home-right orientation.

Top row, left to right:

13, 14, 15, 16, 17, 18 | bar | 19, 20, 21, 22, 23, 24

Bottom row, left to right:

12, 11, 10, 9, 8, 7 | bar | 6, 5, 4, 3, 2, 1

Compact diagram:

Top: [13][14][15][16][17][18] |BAR| [19][20][21][22][23][24]
Bottom: [12][11][10][ 9][ 8][ 7] |BAR| [ 6][ 5][ 4][ 3][ 2][ 1]

Complete default point-mapping table:

| Row    | Left-to-right slot | Point index |
| ------ | -----------------: | ----------: |
| Top    |                  1 |          13 |
| Top    |                  2 |          14 |
| Top    |                  3 |          15 |
| Top    |                  4 |          16 |
| Top    |                  5 |          17 |
| Top    |                  6 |          18 |
| Top    |                  7 |          19 |
| Top    |                  8 |          20 |
| Top    |                  9 |          21 |
| Top    |                 10 |          22 |
| Top    |                 11 |          23 |
| Top    |                 12 |          24 |
| Bottom |                  1 |          12 |
| Bottom |                  2 |          11 |
| Bottom |                  3 |          10 |
| Bottom |                  4 |           9 |
| Bottom |                  5 |           8 |
| Bottom |                  6 |           7 |
| Bottom |                  7 |           6 |
| Bottom |                  8 |           5 |
| Bottom |                  9 |           4 |
| Bottom |                 10 |           3 |
| Bottom |                 11 |           2 |
| Bottom |                 12 |           1 |

Consistency note:

- white home board is points 1 through 6 (right side on bottom row)
- black home board is points 19 through 24 (right side on top row)

## Orientation

Orientation type for rendering layer:

- BoardOrientation = white-home-right | white-home-left

Default orientation:

- white-home-right

Flipped orientation rule:

- render the same domain point mapping, then rotate board geometry 180 degrees around the viewBox center at 600, 400
- do not renumber points in data
- if debug text labels are shown, labels may be counter-rotated for readability

Suggested transform for flipped board group:

- translate(600 400) rotate(180) translate(-600 -400)

## Point geometry

### Row and slot formulas

Inputs:

- pointIndex in 1..24

Row rule:

- top row if pointIndex is 13..24
- bottom row if pointIndex is 1..12

Global horizontal slot rule where slot is 0..11 in left-to-right visual order:

- top row: slot = pointIndex - 13
- bottom row: slot = 12 - pointIndex

Half selection:

- left half if slot is 0..5
- right half if slot is 6..11

Local slot inside selected half:

- localSlot = slot if left half
- localSlot = slot - 6 if right half

### Triangle vertex formulas

Given half start x coordinate halfX0 and localSlot:

- slotX0 = halfX0 + localSlot * QUADRANT_SLOT_WIDTH
- slotX1 = slotX0 + QUADRANT_SLOT_WIDTH
- xLeft = slotX0 + POINT_X_INSET
- xRight = slotX1 - POINT_X_INSET
- xCenter = (xLeft + xRight) / 2

Top triangle points downward:

- v1 = (xLeft, BOARD_TOP)
- v2 = (xRight, BOARD_TOP)
- v3 = (xCenter, TOP_POINT_APEX_Y)

Bottom triangle points upward:

- v1 = (xLeft, BOARD_BOTTOM)
- v2 = (xRight, BOARD_BOTTOM)
- v3 = (xCenter, BOTTOM_POINT_APEX_Y)

Alternating appearance:

- alternate by visual slot parity within each row
- stable rule: toneA if slot is even, toneB if slot is odd

Stable identifiers:

- one group per point with id pattern point-<index>
- each group carries data-point-index attribute

## Checker geometry and stacking

Checker shape:

- circle

Constants:

- CHECKER_DIAMETER = 52
- CHECKER_RADIUS = 26
- CHECKER_BASE_GAP = 4
- CHECKER_NORMAL_STEP = CHECKER_DIAMETER + CHECKER_BASE_GAP = 56
- MAX_NORMAL_STACK = 5
- STACK_TOP_MARGIN = 8

Horizontal center:

- checkerCx = xCenter of that point slot

Vertical stack bounds:

- top row stack area: BOARD_TOP + STACK_TOP_MARGIN through TOP_POINT_APEX_Y - STACK_TOP_MARGIN
- bottom row stack area: BOARD_BOTTOM - STACK_TOP_MARGIN through BOTTOM_POINT_APEX_Y + STACK_TOP_MARGIN

Stack direction:

- top row grows downward from outer edge
- bottom row grows upward from outer edge

Compression rule:

- if checkerCount <= MAX_NORMAL_STACK use CHECKER_NORMAL_STEP
- if checkerCount > MAX_NORMAL_STACK compress center-to-center spacing so the full stack remains inside available stack height

Pseudocode:

1. n = checkerCount
2. topAvailable = (TOP_POINT_APEX_Y - STACK_TOP_MARGIN) - (BOARD_TOP + STACK_TOP_MARGIN)
3. bottomAvailable = (BOARD_BOTTOM - STACK_TOP_MARGIN) - (BOTTOM_POINT_APEX_Y + STACK_TOP_MARGIN)
4. availableTravel = availableHeight - CHECKER_DIAMETER
5. step = CHECKER_NORMAL_STEP when n <= 5 else min(CHECKER_NORMAL_STEP, availableTravel / (n - 1))
6. top first center y = BOARD_TOP + STACK_TOP_MARGIN + CHECKER_RADIUS
7. bottom first center y = BOARD_BOTTOM - STACK_TOP_MARGIN - CHECKER_RADIUS
8. top checker i center y = firstY + i * step
9. bottom checker i center y = firstY - i * step

Rendering source:

- checker rendering is derived only from PointOccupancy player and checkerCount

## Bar rendering

Use position.bar values only.

Bar regions in default orientation:

- upper bar region for white bar checkers
- lower bar region for black bar checkers

Bar vertical regions:

- BAR_TOP_REGION_Y0 = BOARD_TOP
- BAR_TOP_REGION_Y1 = BOARD_MID_Y - 10
- BAR_BOTTOM_REGION_Y0 = BOARD_MID_Y + 10
- BAR_BOTTOM_REGION_Y1 = BOARD_BOTTOM

Rules:

- upper and lower bar stacks never overlap
- each bar stack uses the same circle and compression logic as point stacks, constrained to its own region
- under flipped orientation, rotate geometry only; domain bar counts and player ownership are unchanged

## Bear-off tray rendering

Use position.borneOff values only.

Static milestone representation:

- compact stacked checker marks or slots
- no edge-on realism
- no bearing-off animation

Default orientation assignment:

- white borne-off checkers in right tray
- black borne-off checkers in left tray

Vertical placement:

- split each tray into top and bottom logical zones
- place each player in a dedicated zone to keep separation obvious

Suggested default zones:

- white in lower zone of right tray
- black in upper zone of left tray

Note:

- this is intentionally simple for static milestone clarity and can be revisited for realism in a later visual-polish pass

## Visual direction and tokens

Visual style:

- restrained physical-board-inspired look
- warm board surface
- alternating point tones
- strong light vs dark checker contrast
- subtle borders
- no gradients required
- no elaborate shadows
- no external image assets

CSS custom properties to define centrally:

- --board-surface: #b67c4f
- --point-tone-a: #e7c69e
- --point-tone-b: #8d3f2c
- --checker-light: #f3f0e8
- --checker-dark: #2a2a2e
- --checker-outline: #1a1a1a
- --board-frame: #6f4327
- --bar-surface: #5b351f
- --bearoff-surface: #a86e43

## Future visual states vocabulary

Documented for later milestones only:

- selected checker
- legal destination
- recommended destination
- last move
- checker that would be hit
- invalid selection

Semantics to preserve:

- selected is distinct from recommended
- legal is distinct from best
- color alone is insufficient; pair color with shape, stroke style, pattern, marker, or iconography

## Proposed implementation structure

Proposed web structure for the later implementation task:

- apps/web/src/features/board/BackgammonBoard.tsx
- apps/web/src/features/board/BackgammonBoard.module.css
- apps/web/src/features/board/boardGeometry.ts
- apps/web/src/features/board/boardGeometry.test.ts
- apps/web/src/features/board/Point.tsx
- apps/web/src/features/board/CheckerStack.tsx
- apps/web/src/features/board/Checker.tsx
- apps/web/src/features/board/boardFixtures.ts

Boundary rule:

- point-index mapping and checker-position calculations are pure functions in boardGeometry.ts
- these functions must not depend on React

## Static fixtures

Provide these fixtures for development and screenshots in the later implementation task:

1. Standard starting position
   - verifies baseline mapping and expected opening layout
2. One checker for each player on the bar
   - verifies separate bar regions and non-overlap
3. Nearly completed bear-off
   - verifies tray rendering and high borne-off counts
4. At least one point with eight checkers
   - verifies stack compression behavior
5. Empty board
   - verifies geometry, points, bar, and trays without checker clutter
6. Standard starting position in flipped orientation
   - verifies orientation transform without renumbering domain data

Implementation note:

- no routing-only fixture switch is required
- fixture switching can be local dev toggles inside the board feature

## Acceptance criteria for later static-board implementation

1. Renders all 24 points.
2. Standard starting position checker totals are visually represented as 15 white and 15 black.
3. Point mapping matches this spec in default orientation.
4. Bar counts render from position.bar.
5. Borne-off counts render from position.borneOff.
6. Board scales to 320 CSS pixel viewport width without horizontal overflow.
7. Board remains visually crisp at desktop size.
8. Flipped orientation uses the same domain position with geometry rotation only.
9. Stack compression keeps eight checkers inside the point stack area.
10. Domain package remains free of React and UI concerns.
11. Geometry helpers are covered by unit tests.
12. Board component exposes an accessible label or text alternative.
