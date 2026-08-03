#!/usr/bin/env python3

import json
import os
import sys
from contextlib import contextmanager
from typing import Any, Dict, List


def fail(message: str) -> None:
    sys.stderr.write(f"{message}\n")
    sys.exit(2)


try:
    import gnubg  # type: ignore
except Exception as error:  # pragma: no cover
    fail(f"gnubg python bridge unavailable: {error}")


def read_payload() -> dict:
    raw = sys.stdin.read().strip()
    if not raw:
        fail("gnubg python bridge missing request payload")

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as error:
        fail(f"gnubg python bridge invalid JSON payload: {error.msg}")

    if not isinstance(payload, dict):
        fail("gnubg python bridge payload must be a JSON object")

    return payload


def normalize_version_line(text: str) -> str:
    first_line = text.splitlines()[0].strip() if text else ""
    if not first_line:
        return "GNU Backgammon unknown"

    if first_line.lower().startswith("gnu backgammon"):
        return first_line

    return f"GNU Backgammon {first_line}"


@contextmanager
def suppress_native_stdout() -> None:
    saved_stdout_fd = os.dup(1)
    devnull_fd = os.open(os.devnull, os.O_WRONLY)

    try:
        os.dup2(devnull_fd, 1)
        yield
    finally:
        os.dup2(saved_stdout_fd, 1)
        os.close(saved_stdout_fd)
        os.close(devnull_fd)


def normalize_hints(raw_hints: object) -> List[Dict[str, Any]]:
    if isinstance(raw_hints, list):
        return [row for row in raw_hints if isinstance(row, dict)]

    if isinstance(raw_hints, dict):
        rows = raw_hints.get("hint")
        if isinstance(rows, list):
            return [row for row in rows if isinstance(row, dict)]

    fail("gnubg python bridge expected hint list output")


payload = read_payload()

board_simple = payload.get("boardSimple")
dice = payload.get("dice")
expected_moves = payload.get("expectedMoves")

if not isinstance(board_simple, str) or not board_simple.strip():
    fail("gnubg python bridge requires boardSimple text")

if (
    not isinstance(dice, list)
    or len(dice) != 2
    or not all(isinstance(value, int) and 1 <= value <= 6 for value in dice)
):
    fail("gnubg python bridge requires dice=[1..6,1..6]")

if not isinstance(expected_moves, int) or expected_moves < 0:
    fail("gnubg python bridge requires non-negative expectedMoves")

die_one, die_two = dice

gnubg.command("new game")
version_line = "GNU Backgammon unknown"
max_moves = expected_moves if expected_moves > 0 else 1

with suppress_native_stdout():
    gnubg.command(f"set board simple {board_simple}")
    gnubg.command("set turn 1")
    gnubg.command(f"set dice {die_one} {die_two}")

    raw_hints = gnubg.hint(max_moves)

    try:
        shown = gnubg.show("version")
        if isinstance(shown, str):
            version_line = normalize_version_line(shown)
    except Exception:
        version_line = "GNU Backgammon unknown"

hints = normalize_hints(raw_hints)

print(version_line)
print("format: checker-play-v1")
print("coverage: complete" if len(hints) == expected_moves else "coverage: partial")
print("perspective: player-on-roll")
print("score-scale: equity-points")
print("setting invocation: python-hint-bridge")
print(f"setting expected-moves: {expected_moves}")

if len(hints) < expected_moves:
    print("warning: provider returned only top candidates")

for index, hint in enumerate(hints, start=1):
    move = hint.get("move")
    equity = hint.get("equity")

    if not isinstance(move, str) or not move.strip():
        fail("gnubg python bridge hint row missing move")

    if not isinstance(equity, (int, float)):
        fail("gnubg python bridge hint row missing equity")

    print(f"{index}. {move.strip()} | equity {equity:+.6f} | rank {index}")