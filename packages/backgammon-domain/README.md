# Backgammon Domain Model

## Canonical board-position convention

This package uses one permanent absolute point-numbering system:

- points are always numbered 1 through 24
- white moves from point 24 toward point 1, then bears off
- black moves from point 1 toward point 24, then bears off

Point numbers do not rotate based on viewer orientation or UI layout. Any board rotation is a presentation-layer concern and must not change the domain representation.

## Position invariants

A valid `BoardPosition` must satisfy:

- all 24 points are present
- each occupied point has exactly one owner (`white` or `black`)
- occupied-point checker counts are positive integers
- `bar` counts are non-negative integers
- `borneOff` counts are non-negative integers
- each player has exactly 15 total checkers across points, bar, and borne-off
