# NHL Playoffs 2026 — Bracket Scorer

An Excel workbook that tracks the 2026 NHL playoffs bracket and automatically
scores physical brackets submitted by players.

## Files

- **`NHL_Playoffs_2026_Bracket_Scorer.xlsx`** — open this in Excel / Google
  Sheets / LibreOffice Calc. This is the file you actually use.
- **`build_bracket.py`** — regenerates the workbook from scratch. Only needed
  if you want to change the structure. Run with:
  ```
  pip install openpyxl
  python3 build_bracket.py
  ```

## How to use

The workbook has six sheets:

1. **Instructions** — cheat sheet inside the file.
2. **Bracket** — enter the Round 1 matchups and the winner + games of each
   series as the playoffs play out. Round 2, Conference Finals, and the
   Stanley Cup Final fill in their team slots automatically from earlier
   rounds. *Yellow cells = type here, green cells = auto-filled.*
3. **Picks** — one column block per player (20 slots pre-built). Type each
   player's name in row 1, then enter their Winner pick and Games pick for
   every series.
4. **Scores** — fully automatic. Shows points-per-series for each player, a
   total row, and a color-scaled heatmap of how each player did per series.
5. **Leaderboard** — live ranking, highest score wins.
6. **Config** — tweak the point values per round and the games-bonus.

## Scoring (defaults, editable in the Config sheet)

| Round              | Points for correct winner |
|--------------------|--------------------------:|
| Round 1            | 2                         |
| Round 2            | 4                         |
| Conference Final   | 6                         |
| Stanley Cup Final  | 10                        |

Plus a **+1 bonus** for picking the correct number of games (4–7), awarded
only when the series winner pick was also correct.

## Adding more players

The workbook comes with 20 player slots. To add more, on both the **Picks**
and **Scores** sheets, select the last player's column block and drag-copy it
to the right. The formulas are relative and will adjust. Or rerun
`build_bracket.py` with a larger `NUM_PLAYERS` value — note that will reset
all entered data.
