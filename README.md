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
2. **Bracket** — Round 1 matchups are pre-populated with the 2026 field; edit
   in place if any are wrong. Enter the winner + games of each series as the
   playoffs play out. Round 2, Conference Finals, and the Stanley Cup Final
   fill in their team slots automatically. A **Status** column shows each
   series as *Not Set* / *In Progress* / *Final*. Scroll to the bottom row to
   enter the actual Cup-Final total goals for the tiebreaker. *Yellow cells
   = type here, green cells = auto-filled.*
3. **Picks** — one column block per player (20 slots pre-built). Type each
   player's name in row 1, then enter their Winner pick (dropdown, limited
   to the two teams in that series) and Games pick for every series. Last
   row: each player enters a Cup-Final total-goals guess — used to break
   ties.
4. **Scores** — fully automatic. Points-per-series, TOTAL row, per-round
   subtotals, and a color-scaled heatmap.
5. **Leaderboard** — live ranking. Ties broken by closeness of the
   total-goals guess (`|guess − actual|`, lower wins).
6. **Config** — point values, the games-bonus, and a `PICKS_LOCKED` toggle.
   When set to TRUE, all pick cells turn peach as a visual lock indicator.
   For hard enforcement, right-click the Picks tab → Protect Sheet.

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
