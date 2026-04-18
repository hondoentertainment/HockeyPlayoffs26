"""
Generates NHL_Playoffs_2026_Bracket_Scorer.xlsx — an Excel workbook that:
  1. Tracks the 2026 NHL playoff bracket. Enter Round 1 matchups and the
     winner of each series; later-round team slots auto-fill from earlier
     winners.
  2. Stores each player's physical-bracket predictions (winner + games).
  3. Auto-scores every player against the actual results and ranks them.

Run:  python3 build_bracket.py
Output: NHL_Playoffs_2026_Bracket_Scorer.xlsx
"""

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.formatting.rule import ColorScaleRule
from openpyxl.worksheet.table import Table, TableStyleInfo


# ---------- Styling helpers ----------
THIN = Side(border_style="thin", color="BFBFBF")
BOX = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)

HEADER_FILL = PatternFill("solid", fgColor="1F3864")
HEADER_FONT = Font(bold=True, color="FFFFFF", size=11)
SUBHEADER_FILL = PatternFill("solid", fgColor="2E75B6")
SUBHEADER_FONT = Font(bold=True, color="FFFFFF")
INPUT_FILL = PatternFill("solid", fgColor="FFF2CC")   # yellow = user input
FORMULA_FILL = PatternFill("solid", fgColor="E2EFDA") # green  = auto-filled
ROUND_FILLS = {
    "R1": PatternFill("solid", fgColor="DDEBF7"),
    "R2": PatternFill("solid", fgColor="FCE4D6"),
    "CF": PatternFill("solid", fgColor="E4DFEC"),
    "SCF": PatternFill("solid", fgColor="FFE699"),
}
CENTER = Alignment(horizontal="center", vertical="center")
LEFT = Alignment(horizontal="left", vertical="center")


# ---------- Series definitions ----------
# Each tuple: (series_id, round_code, points_key, team1_source, team2_source)
# team*_source is either None (user enters in Round 1) or a series id (winner of).
SERIES = [
    # Round 1 — East
    ("E1", "R1", "R1_PTS", None, None),
    ("E2", "R1", "R1_PTS", None, None),
    ("E3", "R1", "R1_PTS", None, None),
    ("E4", "R1", "R1_PTS", None, None),
    # Round 1 — West
    ("W1", "R1", "R1_PTS", None, None),
    ("W2", "R1", "R1_PTS", None, None),
    ("W3", "R1", "R1_PTS", None, None),
    ("W4", "R1", "R1_PTS", None, None),
    # Round 2
    ("E5", "R2", "R2_PTS", "E1", "E2"),
    ("E6", "R2", "R2_PTS", "E3", "E4"),
    ("W5", "R2", "R2_PTS", "W1", "W2"),
    ("W6", "R2", "R2_PTS", "W3", "W4"),
    # Conference Finals
    ("E7", "CF", "CF_PTS", "E5", "E6"),
    ("W7", "CF", "CF_PTS", "W5", "W6"),
    # Stanley Cup Final
    ("SCF", "SCF", "SCF_PTS", "E7", "W7"),
]

ROUND_LABELS = {
    "R1": "Round 1",
    "R2": "Round 2",
    "CF": "Conference Final",
    "SCF": "Stanley Cup Final",
}

# How many player bracket slots to pre-create (add more by inserting columns).
NUM_PLAYERS = 20


def style_header(cell):
    cell.fill = HEADER_FILL
    cell.font = HEADER_FONT
    cell.alignment = CENTER
    cell.border = BOX


def style_subheader(cell):
    cell.fill = SUBHEADER_FILL
    cell.font = SUBHEADER_FONT
    cell.alignment = CENTER
    cell.border = BOX


def write_instructions(ws):
    ws.title = "Instructions"
    ws.column_dimensions["A"].width = 110
    rows = [
        ("NHL Playoffs 2026 — Bracket Scorer", HEADER_FONT, HEADER_FILL),
        ("", None, None),
        ("How to use this workbook", SUBHEADER_FONT, SUBHEADER_FILL),
        ("", None, None),
        ("1. Bracket sheet — YELLOW cells are for you to type into. GREEN cells auto-fill.", None, None),
        ("   • Round 1: Type each team name into Team 1 / Team 2, then type the Winner and # of Games (4–7).", None, None),
        ("   • Round 2, Conference Finals, Stanley Cup Final: Team 1 / Team 2 fill in automatically as you enter winners from the previous round. Just type the Winner and Games for each.", None, None),
        ("", None, None),
        ("2. Picks sheet — One block of columns per player. Type each player's name in row 1, then enter their Winner pick and Games pick for every series. Columns E onward are for players; add more players by copying a player block to the right.", None, None),
        ("", None, None),
        ("3. Scores sheet — Fully automatic. Shows the points each player earned on each series, running totals, and the grand total. Correct series winner = round points. Correct # of games = +1 bonus (only if winner pick was also correct).", None, None),
        ("", None, None),
        ("4. Leaderboard sheet — Live ranking of players by total points. Highest score wins.", None, None),
        ("", None, None),
        ("5. Config sheet — Change point values per round if you want different scoring.", None, None),
        ("", None, None),
        ("Color key", SUBHEADER_FONT, SUBHEADER_FILL),
        ("   YELLOW = user input   GREEN = auto-filled from formulas", None, None),
        ("", None, None),
        ("Default scoring", SUBHEADER_FONT, SUBHEADER_FILL),
        ("   Round 1: 2 pts   Round 2: 4 pts   Conference Final: 6 pts   Stanley Cup Final: 10 pts   Correct games bonus: +1", None, None),
    ]
    for i, (text, font, fill) in enumerate(rows, start=1):
        c = ws.cell(row=i, column=1, value=text)
        c.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
        if font: c.font = font
        if fill: c.fill = fill
        ws.row_dimensions[i].height = 24 if text else 8


def write_config(ws):
    ws.title = "Config"
    ws.column_dimensions["A"].width = 30
    ws.column_dimensions["B"].width = 14
    header = [("Setting", "Value")]
    data = [
        ("R1_PTS", 2),
        ("R2_PTS", 4),
        ("CF_PTS", 6),
        ("SCF_PTS", 10),
        ("GAMES_BONUS", 1),
    ]
    for col, v in enumerate(header[0], start=1):
        c = ws.cell(row=1, column=col, value=v); style_header(c)
    for i, (k, v) in enumerate(data, start=2):
        ws.cell(row=i, column=1, value=k).font = Font(bold=True)
        cell = ws.cell(row=i, column=2, value=v)
        cell.fill = INPUT_FILL
        cell.alignment = CENTER
        cell.border = BOX
        # Named range for readability in formulas
        from openpyxl.workbook.defined_name import DefinedName
        ref = f"Config!${get_column_letter(2)}${i}"
        ws.parent.defined_names[k] = DefinedName(name=k, attr_text=ref)


def write_bracket(ws):
    ws.title = "Bracket"
    headers = ["Round", "Series", "Team 1", "Team 2", "Winner", "Games"]
    widths = [10, 10, 22, 22, 22, 10]
    for i, (h, w) in enumerate(zip(headers, widths), start=1):
        c = ws.cell(row=1, column=i, value=h); style_header(c)
        ws.column_dimensions[get_column_letter(i)].width = w

    # Map series_id -> row number for cross-references.
    row_of = {}
    for idx, (sid, rnd, _pts, src1, src2) in enumerate(SERIES, start=2):
        row_of[sid] = idx

    for sid, rnd, _pts, src1, src2 in SERIES:
        r = row_of[sid]
        fill = ROUND_FILLS[rnd]

        ws.cell(row=r, column=1, value=ROUND_LABELS[rnd]).fill = fill
        ws.cell(row=r, column=2, value=sid).fill = fill

        # Team 1
        t1 = ws.cell(row=r, column=3)
        if src1 is None:
            t1.fill = INPUT_FILL
        else:
            t1.value = f'=IF(E{row_of[src1]}="","",E{row_of[src1]})'
            t1.fill = FORMULA_FILL
        # Team 2
        t2 = ws.cell(row=r, column=4)
        if src2 is None:
            t2.fill = INPUT_FILL
        else:
            t2.value = f'=IF(E{row_of[src2]}="","",E{row_of[src2]})'
            t2.fill = FORMULA_FILL
        # Winner (user input, must match Team 1 or Team 2)
        w = ws.cell(row=r, column=5)
        w.fill = INPUT_FILL
        # Data validation: Winner must be one of Team 1 / Team 2
        from openpyxl.worksheet.datavalidation import DataValidation
        dv = DataValidation(type="list", formula1=f'=INDIRECT("C{r}:D{r}")', allow_blank=True)
        dv.error = "Winner must match Team 1 or Team 2."
        dv.errorTitle = "Invalid winner"
        ws.add_data_validation(dv)
        dv.add(w)
        # Games
        g = ws.cell(row=r, column=6)
        g.fill = INPUT_FILL
        dv_g = DataValidation(type="whole", operator="between", formula1=4, formula2=7, allow_blank=True)
        dv_g.error = "Series length must be 4, 5, 6, or 7."
        dv_g.errorTitle = "Invalid games"
        ws.add_data_validation(dv_g)
        dv_g.add(g)

        for col in range(1, 7):
            ws.cell(row=r, column=col).alignment = CENTER
            ws.cell(row=r, column=col).border = BOX

    ws.freeze_panes = "A2"
    return row_of


def write_picks(ws, bracket_row_of):
    ws.title = "Picks"

    # Row 1: player name block headers (merged over 2 cols each)
    # Row 2: sub-headers "Winner Pick" / "Games Pick"
    # From row 3: one row per series

    # Columns A-D = series metadata + actual results
    ws.cell(row=1, column=1, value="").fill = HEADER_FILL
    ws.cell(row=2, column=1, value="Round"); style_subheader(ws.cell(row=2, column=1))
    ws.cell(row=2, column=2, value="Series"); style_subheader(ws.cell(row=2, column=2))
    ws.cell(row=2, column=3, value="Actual Winner"); style_subheader(ws.cell(row=2, column=3))
    ws.cell(row=2, column=4, value="Actual Games"); style_subheader(ws.cell(row=2, column=4))
    for col, w in [(1, 10), (2, 10), (3, 20), (4, 14)]:
        ws.column_dimensions[get_column_letter(col)].width = w

    # Merge top header over A:D
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=4)
    c = ws.cell(row=1, column=1, value="Series  /  Actual Results")
    style_header(c)

    # Series rows
    for i, (sid, rnd, _pts, _s1, _s2) in enumerate(SERIES, start=3):
        b_row = bracket_row_of[sid]
        ws.cell(row=i, column=1, value=ROUND_LABELS[rnd]).fill = ROUND_FILLS[rnd]
        ws.cell(row=i, column=2, value=sid).fill = ROUND_FILLS[rnd]
        # Pull actual winner/games from Bracket sheet
        wcell = ws.cell(row=i, column=3, value=f'=IF(Bracket!E{b_row}="","",Bracket!E{b_row})')
        wcell.fill = FORMULA_FILL
        gcell = ws.cell(row=i, column=4, value=f'=IF(Bracket!F{b_row}="","",Bracket!F{b_row})')
        gcell.fill = FORMULA_FILL
        for col in range(1, 5):
            ws.cell(row=i, column=col).alignment = CENTER
            ws.cell(row=i, column=col).border = BOX

    # Player blocks — 2 columns each: Winner Pick, Games Pick
    for p in range(NUM_PLAYERS):
        col_w = 5 + p * 2       # Winner Pick column
        col_g = col_w + 1       # Games Pick column
        # Top row: player name (merged across the 2 cols)
        ws.merge_cells(start_row=1, start_column=col_w, end_row=1, end_column=col_g)
        name_cell = ws.cell(row=1, column=col_w, value=f"Player {p+1}")
        name_cell.fill = INPUT_FILL
        name_cell.font = Font(bold=True)
        name_cell.alignment = CENTER
        name_cell.border = BOX
        # Sub-headers
        sh1 = ws.cell(row=2, column=col_w, value="Winner Pick"); style_subheader(sh1)
        sh2 = ws.cell(row=2, column=col_g, value="Games Pick"); style_subheader(sh2)
        ws.column_dimensions[get_column_letter(col_w)].width = 16
        ws.column_dimensions[get_column_letter(col_g)].width = 10
        # Input cells
        for i in range(len(SERIES)):
            r = 3 + i
            cw = ws.cell(row=r, column=col_w); cw.fill = INPUT_FILL
            cw.alignment = CENTER; cw.border = BOX
            cg = ws.cell(row=r, column=col_g); cg.fill = INPUT_FILL
            cg.alignment = CENTER; cg.border = BOX

    ws.freeze_panes = "E3"


def write_scores(ws):
    ws.title = "Scores"

    # Layout mirrors Picks: columns A-D = metadata + points-per-round, 1 col per player showing points
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=4)
    c = ws.cell(row=1, column=1, value="Series scoring")
    style_header(c)

    ws.cell(row=2, column=1, value="Round"); style_subheader(ws.cell(row=2, column=1))
    ws.cell(row=2, column=2, value="Series"); style_subheader(ws.cell(row=2, column=2))
    ws.cell(row=2, column=3, value="Round Pts"); style_subheader(ws.cell(row=2, column=3))
    ws.cell(row=2, column=4, value="Actual Winner"); style_subheader(ws.cell(row=2, column=4))
    for col, w in [(1, 10), (2, 10), (3, 12), (4, 20)]:
        ws.column_dimensions[get_column_letter(col)].width = w

    # Series rows — points lookup per round + echoed actual winner
    for i, (sid, rnd, pts_key, _s1, _s2) in enumerate(SERIES, start=3):
        ws.cell(row=i, column=1, value=ROUND_LABELS[rnd]).fill = ROUND_FILLS[rnd]
        ws.cell(row=i, column=2, value=sid).fill = ROUND_FILLS[rnd]
        # Round points from named range
        ws.cell(row=i, column=3, value=f"={pts_key}").fill = FORMULA_FILL
        # Actual winner from Picks sheet (col C)
        ws.cell(row=i, column=4, value=f"=Picks!C{i}").fill = FORMULA_FILL
        for col in range(1, 5):
            ws.cell(row=i, column=col).alignment = CENTER
            ws.cell(row=i, column=col).border = BOX

    # One column per player in Scores = player's total points earned per series
    total_row = 3 + len(SERIES)   # row holding TOTAL
    for p in range(NUM_PLAYERS):
        score_col = 5 + p
        pick_w_col = 5 + p * 2
        pick_g_col = pick_w_col + 1
        pick_w_letter = get_column_letter(pick_w_col)
        pick_g_letter = get_column_letter(pick_g_col)

        # Header: player name pulled from Picks!row1
        hdr = ws.cell(row=1, column=score_col, value=f"=Picks!{pick_w_letter}1")
        hdr.fill = HEADER_FILL; hdr.font = HEADER_FONT; hdr.alignment = CENTER; hdr.border = BOX
        sub = ws.cell(row=2, column=score_col, value="Points")
        style_subheader(sub)
        ws.column_dimensions[get_column_letter(score_col)].width = 12

        for i in range(len(SERIES)):
            r = 3 + i
            # Correct winner? If so, round points. Plus +GAMES_BONUS if games also correct.
            formula = (
                f'=IF(Picks!C{r}="","",'
                f'IF(Picks!{pick_w_letter}{r}=Picks!C{r},'
                f'$C{r}+IF(AND(Picks!{pick_g_letter}{r}<>"",Picks!{pick_g_letter}{r}=Picks!D{r}),GAMES_BONUS,0),'
                f'0))'
            )
            cell = ws.cell(row=r, column=score_col, value=formula)
            cell.fill = FORMULA_FILL
            cell.alignment = CENTER; cell.border = BOX

        # TOTAL row
        col_letter = get_column_letter(score_col)
        total_cell = ws.cell(
            row=total_row, column=score_col,
            value=f'=SUM({col_letter}3:{col_letter}{3+len(SERIES)-1})'
        )
        total_cell.font = Font(bold=True)
        total_cell.fill = PatternFill("solid", fgColor="FFE699")
        total_cell.alignment = CENTER
        total_cell.border = BOX

    # TOTAL label
    label = ws.cell(row=total_row, column=1, value="TOTAL")
    label.font = Font(bold=True, color="FFFFFF")
    label.fill = HEADER_FILL
    label.alignment = CENTER
    ws.merge_cells(start_row=total_row, start_column=1, end_row=total_row, end_column=4)
    label.border = BOX

    # Tiebreak row (hidden): total + column/1e6 → unique per player for stable ranking
    tiebreak_row = total_row + 1
    ws.cell(row=tiebreak_row, column=1, value="Tiebreak key (auto)").font = Font(italic=True, color="7F7F7F")
    ws.merge_cells(start_row=tiebreak_row, start_column=1, end_row=tiebreak_row, end_column=4)
    for p in range(NUM_PLAYERS):
        score_col = 5 + p
        col_letter = get_column_letter(score_col)
        tb = ws.cell(row=tiebreak_row, column=score_col,
                     value=f"={col_letter}{total_row}+COLUMN()/1000000")
        tb.font = Font(color="BFBFBF", size=9)
        tb.alignment = CENTER
    ws.row_dimensions[tiebreak_row].hidden = True

    # Conditional color scale on player-points columns (row 3 .. last series row)
    last_col = get_column_letter(4 + NUM_PLAYERS)
    rng = f"E3:{last_col}{2 + len(SERIES)}"
    rule = ColorScaleRule(
        start_type="num", start_value=0, start_color="FFFFFF",
        mid_type="num", mid_value=5, mid_color="FFF2CC",
        end_type="num", end_value=11, end_color="63BE7B",
    )
    ws.conditional_formatting.add(rng, rule)

    ws.freeze_panes = "E3"


def write_leaderboard(ws, scores_ws):
    ws.title = "Leaderboard"
    ws.column_dimensions["A"].width = 8
    ws.column_dimensions["B"].width = 22
    ws.column_dimensions["C"].width = 14

    ws.cell(row=1, column=1, value="Rank"); style_header(ws.cell(row=1, column=1))
    ws.cell(row=1, column=2, value="Player"); style_header(ws.cell(row=1, column=2))
    ws.cell(row=1, column=3, value="Total Points"); style_header(ws.cell(row=1, column=3))

    total_row = 3 + len(SERIES)         # row on Scores with player totals
    tiebreak_row = total_row + 1        # hidden helper row on Scores
    last_col = get_column_letter(4 + NUM_PLAYERS)
    names_range = f"Scores!$E$1:${last_col}$1"
    totals_range = f"Scores!$E${total_row}:${last_col}${total_row}"
    tb_range = f"Scores!$E${tiebreak_row}:${last_col}${tiebreak_row}"

    for p in range(NUM_PLAYERS):
        r = p + 2
        # Rank from tiebreak row (unique values), then look up name + total
        ws.cell(row=r, column=2,
                value=f'=IFERROR(INDEX({names_range},1,'
                      f'MATCH(LARGE({tb_range},ROW()-1),{tb_range},0)),"")')
        ws.cell(row=r, column=3,
                value=f'=IFERROR(INDEX({totals_range},1,'
                      f'MATCH(LARGE({tb_range},ROW()-1),{tb_range},0)),"")')
        ws.cell(row=r, column=1, value=f'=IF(C{r}="","",ROW()-1)')

        for col in range(1, 4):
            c = ws.cell(row=r, column=col)
            c.alignment = CENTER; c.border = BOX

    # Highlight 1st place
    first_fill = PatternFill("solid", fgColor="FFD966")
    for col in range(1, 4):
        ws.cell(row=2, column=col).fill = first_fill
        ws.cell(row=2, column=col).font = Font(bold=True)

    ws.freeze_panes = "A2"


def main():
    wb = Workbook()
    # Replace default sheet with Instructions, then add the others.
    inst_ws = wb.active
    write_instructions(inst_ws)

    config_ws = wb.create_sheet("Config")
    write_config(config_ws)

    bracket_ws = wb.create_sheet("Bracket")
    row_of = write_bracket(bracket_ws)

    picks_ws = wb.create_sheet("Picks")
    write_picks(picks_ws, row_of)

    scores_ws = wb.create_sheet("Scores")
    write_scores(scores_ws)

    leaderboard_ws = wb.create_sheet("Leaderboard")
    write_leaderboard(leaderboard_ws, scores_ws)

    # Reorder: Instructions, Bracket, Picks, Scores, Leaderboard, Config
    desired = ["Instructions", "Bracket", "Picks", "Scores", "Leaderboard", "Config"]
    wb._sheets = [wb[name] for name in desired]

    out = "NHL_Playoffs_2026_Bracket_Scorer.xlsx"
    wb.save(out)
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
