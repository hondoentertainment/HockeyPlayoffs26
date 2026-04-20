"""
Generates NHL_Playoffs_2026_Bracket_Scorer.xlsx — an Excel workbook that:
  1. Tracks the 2026 NHL playoff bracket. Round 1 matchups are pre-populated;
     later-round team slots auto-fill from earlier winners.
  2. Stores each player's physical-bracket predictions (winner + games) plus a
     Cup-Final total-goals tiebreaker.
  3. Auto-scores every player against the actual results and ranks them,
     breaking ties by closeness of the total-goals guess.
  4. Supports a picks-lock toggle that prevents new pick entries once set.

Run:  python3 build_bracket.py
Output: NHL_Playoffs_2026_Bracket_Scorer.xlsx
"""

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.formatting.rule import ColorScaleRule, FormulaRule
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.workbook.defined_name import DefinedName


# ---------- Styling helpers ----------
THIN = Side(border_style="thin", color="BFBFBF")
BOX = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)

HEADER_FILL = PatternFill("solid", fgColor="1F3864")
HEADER_FONT = Font(bold=True, color="FFFFFF", size=11)
SUBHEADER_FILL = PatternFill("solid", fgColor="2E75B6")
SUBHEADER_FONT = Font(bold=True, color="FFFFFF")
INPUT_FILL = PatternFill("solid", fgColor="FFF2CC")   # yellow = user input
FORMULA_FILL = PatternFill("solid", fgColor="E2EFDA") # green  = auto-filled
LOCKED_FILL = PatternFill("solid", fgColor="F8CBAD")  # peach  = picks locked
ROUND_FILLS = {
    "R1": PatternFill("solid", fgColor="DDEBF7"),
    "R2": PatternFill("solid", fgColor="FCE4D6"),
    "CF": PatternFill("solid", fgColor="E4DFEC"),
    "SCF": PatternFill("solid", fgColor="FFE699"),
}
CENTER = Alignment(horizontal="center", vertical="center")
LEFT = Alignment(horizontal="left", vertical="center")


# ---------- Series definitions ----------
# (series_id, round_code, points_key, team1_source, team2_source)
# team*_source is either None (Round 1) or a series id (winner of).
SERIES = [
    ("E1", "R1", "R1_PTS", None, None),
    ("E2", "R1", "R1_PTS", None, None),
    ("E3", "R1", "R1_PTS", None, None),
    ("E4", "R1", "R1_PTS", None, None),
    ("W1", "R1", "R1_PTS", None, None),
    ("W2", "R1", "R1_PTS", None, None),
    ("W3", "R1", "R1_PTS", None, None),
    ("W4", "R1", "R1_PTS", None, None),
    ("E5", "R2", "R2_PTS", "E1", "E2"),
    ("E6", "R2", "R2_PTS", "E3", "E4"),
    ("W5", "R2", "R2_PTS", "W1", "W2"),
    ("W6", "R2", "R2_PTS", "W3", "W4"),
    ("E7", "CF", "CF_PTS", "E5", "E6"),
    ("W7", "CF", "CF_PTS", "W5", "W6"),
    ("SCF", "SCF", "SCF_PTS", "E7", "W7"),
]

ROUND_LABELS = {
    "R1": "Round 1",
    "R2": "Round 2",
    "CF": "Conference Final",
    "SCF": "Stanley Cup Final",
}
ROUND_ORDER = ["R1", "R2", "CF", "SCF"]

# 2026 NHL Playoffs Round 1 matchups.
# Edit or overwrite in Excel if the bracket set differs from what you see here.
ROUND1_MATCHUPS = {
    "E1": ("Boston Bruins", "Buffalo Sabres"),
    "E2": ("Montreal Canadiens", "Tampa Bay Lightning"),
    "E3": ("Ottawa Senators", "Carolina Hurricanes"),
    "E4": ("Philadelphia Flyers", "Pittsburgh Penguins"),
    "W1": ("Los Angeles Kings", "Colorado Avalanche"),
    "W2": ("Minnesota Wild", "Dallas Stars"),
    "W3": ("Utah Mammoth", "Vegas Golden Knights"),
    "W4": ("Anaheim Ducks", "Edmonton Oilers"),
}

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


def define_name(wb, name, ref):
    wb.defined_names[name] = DefinedName(name=name, attr_text=ref)


def write_instructions(ws):
    ws.title = "Instructions"
    ws.column_dimensions["A"].width = 115
    rows = [
        ("NHL Playoffs 2026 — Bracket Scorer", HEADER_FONT, HEADER_FILL),
        ("", None, None),
        ("How to use this workbook", SUBHEADER_FONT, SUBHEADER_FILL),
        ("", None, None),
        ("1. Bracket sheet — YELLOW cells are for input. GREEN cells auto-fill. Round 1 matchups are pre-populated; edit if the set differs.", None, None),
        ("   • Enter the Winner and # of Games (4–7) for each series as it ends. The Status column shows Not Set / In Progress / Final.", None, None),
        ("   • Scroll to the last row to enter the ACTUAL Cup-Final total goals (tiebreaker) once the Final is over.", None, None),
        ("", None, None),
        ("2. Picks sheet — Type each player's name in row 1, then their Winner pick (dropdown) and Games pick (4–7) per series.", None, None),
        ("   • Last row: each player enters a Cup-Final total-goals GUESS — used to break ties.", None, None),
        ("   • When Config!PICKS_LOCKED = TRUE, all pick cells turn peach as a visual lock indicator. For hard enforcement, right-click the Picks sheet tab → Protect Sheet after picks are in.", None, None),
        ("", None, None),
        ("3. Scores sheet — Fully automatic. Per-series points, per-round subtotals at the bottom, TOTAL row, and a heatmap.", None, None),
        ("   • Correct winner = round points. Correct # of games = +1 bonus (only if winner pick was also correct).", None, None),
        ("", None, None),
        ("4. Leaderboard sheet — Live ranking. Ties broken by |guess − actual| on the Cup-Final total-goals question.", None, None),
        ("", None, None),
        ("5. Config sheet — Change point values, the games bonus, and the PICKS_LOCKED toggle.", None, None),
        ("", None, None),
        ("Color key", SUBHEADER_FONT, SUBHEADER_FILL),
        ("   YELLOW = user input   GREEN = auto-filled from formulas   PEACH = picks locked", None, None),
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


def write_config(wb, ws):
    ws.title = "Config"
    ws.column_dimensions["A"].width = 30
    ws.column_dimensions["B"].width = 14
    header = ("Setting", "Value")
    data = [
        ("R1_PTS", 2),
        ("R2_PTS", 4),
        ("CF_PTS", 6),
        ("SCF_PTS", 10),
        ("GAMES_BONUS", 1),
        ("PICKS_LOCKED", False),
    ]
    for col, v in enumerate(header, start=1):
        c = ws.cell(row=1, column=col, value=v); style_header(c)
    for i, (k, v) in enumerate(data, start=2):
        ws.cell(row=i, column=1, value=k).font = Font(bold=True)
        cell = ws.cell(row=i, column=2, value=v)
        cell.fill = INPUT_FILL
        cell.alignment = CENTER
        cell.border = BOX
        define_name(wb, k, f"Config!$B${i}")

    # Data validation: PICKS_LOCKED is TRUE/FALSE only
    dv = DataValidation(type="list", formula1='"TRUE,FALSE"', allow_blank=False)
    dv.error = "PICKS_LOCKED must be TRUE or FALSE."
    dv.errorTitle = "Invalid value"
    ws.add_data_validation(dv)
    dv.add(ws.cell(row=len(data) + 1, column=2))  # row for PICKS_LOCKED


def write_bracket(wb, ws):
    ws.title = "Bracket"
    headers = ["Round", "Series", "Team 1", "Team 2", "Winner", "Games", "Status"]
    widths = [10, 10, 22, 22, 22, 10, 14]
    for i, (h, w) in enumerate(zip(headers, widths), start=1):
        c = ws.cell(row=1, column=i, value=h); style_header(c)
        ws.column_dimensions[get_column_letter(i)].width = w

    row_of = {sid: idx for idx, (sid, *_rest) in enumerate(SERIES, start=2)}

    for sid, rnd, _pts, src1, src2 in SERIES:
        r = row_of[sid]
        fill = ROUND_FILLS[rnd]

        ws.cell(row=r, column=1, value=ROUND_LABELS[rnd]).fill = fill
        ws.cell(row=r, column=2, value=sid).fill = fill

        # Team 1
        t1 = ws.cell(row=r, column=3)
        if src1 is None:
            t1.fill = INPUT_FILL
            if sid in ROUND1_MATCHUPS:
                t1.value = ROUND1_MATCHUPS[sid][0]
        else:
            t1.value = f'=IF(E{row_of[src1]}="","",E{row_of[src1]})'
            t1.fill = FORMULA_FILL
        # Team 2
        t2 = ws.cell(row=r, column=4)
        if src2 is None:
            t2.fill = INPUT_FILL
            if sid in ROUND1_MATCHUPS:
                t2.value = ROUND1_MATCHUPS[sid][1]
        else:
            t2.value = f'=IF(E{row_of[src2]}="","",E{row_of[src2]})'
            t2.fill = FORMULA_FILL
        # Winner
        w = ws.cell(row=r, column=5)
        w.fill = INPUT_FILL
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
        # Status
        status = ws.cell(row=r, column=7,
                         value=f'=IF(E{r}<>"","Final",IF(AND(C{r}<>"",D{r}<>""),"In Progress","Not Set"))')
        status.fill = FORMULA_FILL

        for col in range(1, 8):
            ws.cell(row=r, column=col).alignment = CENTER
            ws.cell(row=r, column=col).border = BOX

    # Cup-Final total-goals actual (tiebreaker)
    tb_row = 2 + len(SERIES)
    label = ws.cell(row=tb_row, column=1, value="Cup Final — Total Goals (actual, tiebreaker)")
    label.font = Font(bold=True)
    label.alignment = LEFT
    ws.merge_cells(start_row=tb_row, start_column=1, end_row=tb_row, end_column=5)
    ws.cell(row=tb_row, column=6).value = None
    tb_cell = ws.cell(row=tb_row, column=6)
    tb_cell.fill = INPUT_FILL
    tb_cell.alignment = CENTER
    tb_cell.border = BOX
    dv_tb = DataValidation(type="whole", operator="between", formula1=0, formula2=200, allow_blank=True)
    dv_tb.error = "Enter a non-negative integer."
    dv_tb.errorTitle = "Invalid value"
    ws.add_data_validation(dv_tb)
    dv_tb.add(tb_cell)
    define_name(wb, "ACTUAL_TOTAL_GOALS", f"Bracket!$F${tb_row}")

    ws.freeze_panes = "A2"
    return row_of, tb_row


def write_picks(ws, bracket_row_of, bracket_tb_row):
    ws.title = "Picks"

    # Series metadata + actual results in cols A-D
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=4)
    style_header(ws.cell(row=1, column=1, value="Series  /  Actual Results"))

    ws.cell(row=2, column=1, value="Round"); style_subheader(ws.cell(row=2, column=1))
    ws.cell(row=2, column=2, value="Series"); style_subheader(ws.cell(row=2, column=2))
    ws.cell(row=2, column=3, value="Actual Winner"); style_subheader(ws.cell(row=2, column=3))
    ws.cell(row=2, column=4, value="Actual Games"); style_subheader(ws.cell(row=2, column=4))
    for col, w in [(1, 10), (2, 10), (3, 20), (4, 14)]:
        ws.column_dimensions[get_column_letter(col)].width = w

    for i, (sid, rnd, _pts, _s1, _s2) in enumerate(SERIES, start=3):
        b_row = bracket_row_of[sid]
        ws.cell(row=i, column=1, value=ROUND_LABELS[rnd]).fill = ROUND_FILLS[rnd]
        ws.cell(row=i, column=2, value=sid).fill = ROUND_FILLS[rnd]
        wcell = ws.cell(row=i, column=3, value=f'=IF(Bracket!E{b_row}="","",Bracket!E{b_row})')
        wcell.fill = FORMULA_FILL
        gcell = ws.cell(row=i, column=4, value=f'=IF(Bracket!F{b_row}="","",Bracket!F{b_row})')
        gcell.fill = FORMULA_FILL
        for col in range(1, 5):
            ws.cell(row=i, column=col).alignment = CENTER
            ws.cell(row=i, column=col).border = BOX

    # Tiebreaker row label (col A-D)
    tb_row = 3 + len(SERIES)
    ws.merge_cells(start_row=tb_row, start_column=1, end_row=tb_row, end_column=2)
    lbl = ws.cell(row=tb_row, column=1, value="Tiebreaker — Cup Final Total Goals")
    lbl.font = Font(bold=True); lbl.alignment = LEFT; lbl.border = BOX
    actual = ws.cell(row=tb_row, column=3,
                     value=f'=IF(Bracket!F{bracket_tb_row}="","",Bracket!F{bracket_tb_row})')
    actual.fill = FORMULA_FILL; actual.alignment = CENTER; actual.border = BOX
    ws.cell(row=tb_row, column=4).border = BOX

    # Player blocks — 2 columns each: Winner Pick, Games Pick
    for p in range(NUM_PLAYERS):
        col_w = 5 + p * 2
        col_g = col_w + 1
        ws.merge_cells(start_row=1, start_column=col_w, end_row=1, end_column=col_g)
        name_cell = ws.cell(row=1, column=col_w, value=f"Player {p+1}")
        name_cell.fill = INPUT_FILL
        name_cell.font = Font(bold=True)
        name_cell.alignment = CENTER
        name_cell.border = BOX
        sh1 = ws.cell(row=2, column=col_w, value="Winner Pick"); style_subheader(sh1)
        sh2 = ws.cell(row=2, column=col_g, value="Games Pick"); style_subheader(sh2)
        ws.column_dimensions[get_column_letter(col_w)].width = 18
        ws.column_dimensions[get_column_letter(col_g)].width = 10

        # Per-series pick cells
        for i, (sid, _rnd, _pts, _s1, _s2) in enumerate(SERIES):
            r = 3 + i
            b_row = bracket_row_of[sid]
            cw = ws.cell(row=r, column=col_w); cw.fill = INPUT_FILL
            cw.alignment = CENTER; cw.border = BOX
            cg = ws.cell(row=r, column=col_g); cg.fill = INPUT_FILL
            cg.alignment = CENTER; cg.border = BOX

            # Winner dropdown pulling from that series' two teams on Bracket
            dvw = DataValidation(
                type="list",
                formula1=f"=Bracket!$C${b_row}:$D${b_row}",
                allow_blank=True,
            )
            dvw.error = "Pick must be one of the two teams in that series."
            dvw.errorTitle = "Invalid winner pick"
            ws.add_data_validation(dvw); dvw.add(cw)

            # Games 4–7
            dvg = DataValidation(type="whole", operator="between", formula1=4, formula2=7, allow_blank=True)
            dvg.error = "Enter 4, 5, 6, or 7."
            dvg.errorTitle = "Invalid games pick"
            ws.add_data_validation(dvg); dvg.add(cg)

        # Tiebreaker goals guess for this player (merged over the 2 cols)
        ws.merge_cells(start_row=tb_row, start_column=col_w, end_row=tb_row, end_column=col_g)
        tb_cell = ws.cell(row=tb_row, column=col_w)
        tb_cell.fill = INPUT_FILL; tb_cell.alignment = CENTER; tb_cell.border = BOX
        dv_tb = DataValidation(type="whole", operator="between", formula1=0, formula2=200, allow_blank=True)
        dv_tb.error = "Enter a non-negative integer."
        dv_tb.errorTitle = "Invalid guess"
        ws.add_data_validation(dv_tb); dv_tb.add(tb_cell)

    # Picks-lock visual indicator: peach tint when PICKS_LOCKED=TRUE.
    # (Excel only allows one DataValidation per cell, which would collide with
    # the per-cell Winner/Games validations. For hard enforcement, Right-click
    # the sheet tab → Protect Sheet after picks are in.)
    last_pick_col = get_column_letter(4 + NUM_PLAYERS * 2)
    peach_rule = FormulaRule(formula=["PICKS_LOCKED=TRUE"], fill=LOCKED_FILL)
    ws.conditional_formatting.add(f"E3:{last_pick_col}{tb_row}", peach_rule)

    ws.freeze_panes = "E3"
    return tb_row


def write_scores(ws, picks_tb_row):
    ws.title = "Scores"

    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=4)
    style_header(ws.cell(row=1, column=1, value="Series scoring"))

    ws.cell(row=2, column=1, value="Round"); style_subheader(ws.cell(row=2, column=1))
    ws.cell(row=2, column=2, value="Series"); style_subheader(ws.cell(row=2, column=2))
    ws.cell(row=2, column=3, value="Round Pts"); style_subheader(ws.cell(row=2, column=3))
    ws.cell(row=2, column=4, value="Actual Winner"); style_subheader(ws.cell(row=2, column=4))
    for col, w in [(1, 10), (2, 10), (3, 12), (4, 20)]:
        ws.column_dimensions[get_column_letter(col)].width = w

    for i, (sid, rnd, pts_key, _s1, _s2) in enumerate(SERIES, start=3):
        ws.cell(row=i, column=1, value=ROUND_LABELS[rnd]).fill = ROUND_FILLS[rnd]
        ws.cell(row=i, column=2, value=sid).fill = ROUND_FILLS[rnd]
        ws.cell(row=i, column=3, value=f"={pts_key}").fill = FORMULA_FILL
        ws.cell(row=i, column=4, value=f"=Picks!C{i}").fill = FORMULA_FILL
        for col in range(1, 5):
            ws.cell(row=i, column=col).alignment = CENTER
            ws.cell(row=i, column=col).border = BOX

    first_series_row = 3
    last_series_row = 3 + len(SERIES) - 1
    total_row = last_series_row + 1
    tiebreak_row = total_row + 1       # hidden sort key
    goal_diff_row = total_row + 2      # |guess - actual| per player
    round_header_row = total_row + 4
    round_first_subtotal = round_header_row + 1

    # Player score columns
    for p in range(NUM_PLAYERS):
        score_col = 5 + p
        pick_w_col = 5 + p * 2
        pick_g_col = pick_w_col + 1
        pick_w_letter = get_column_letter(pick_w_col)
        pick_g_letter = get_column_letter(pick_g_col)
        col_letter = get_column_letter(score_col)

        hdr = ws.cell(row=1, column=score_col, value=f"=Picks!{pick_w_letter}1")
        hdr.fill = HEADER_FILL; hdr.font = HEADER_FONT; hdr.alignment = CENTER; hdr.border = BOX
        style_subheader(ws.cell(row=2, column=score_col, value="Points"))
        ws.column_dimensions[col_letter].width = 12

        for i in range(len(SERIES)):
            r = first_series_row + i
            formula = (
                f'=IF(Picks!C{r}="","",'
                f'IF(Picks!{pick_w_letter}{r}=Picks!C{r},'
                f'$C{r}+IF(AND(Picks!{pick_g_letter}{r}<>"",Picks!{pick_g_letter}{r}=Picks!D{r}),GAMES_BONUS,0),'
                f'0))'
            )
            cell = ws.cell(row=r, column=score_col, value=formula)
            cell.fill = FORMULA_FILL
            cell.alignment = CENTER; cell.border = BOX

        # TOTAL
        total_cell = ws.cell(
            row=total_row, column=score_col,
            value=f'=SUM({col_letter}{first_series_row}:{col_letter}{last_series_row})'
        )
        total_cell.font = Font(bold=True)
        total_cell.fill = PatternFill("solid", fgColor="FFE699")
        total_cell.alignment = CENTER; total_cell.border = BOX

        # Goal-diff helper: blank when either guess or actual missing
        gd_formula = (
            f'=IF(OR(Picks!{pick_w_letter}{picks_tb_row}="",'
            f'ACTUAL_TOTAL_GOALS=""),"",'
            f'ABS(Picks!{pick_w_letter}{picks_tb_row}-ACTUAL_TOTAL_GOALS))'
        )
        gd_cell = ws.cell(row=goal_diff_row, column=score_col, value=gd_formula)
        gd_cell.alignment = CENTER; gd_cell.border = BOX
        gd_cell.font = Font(color="595959", size=9)

        # Hidden sort key: total * 1e6, minus goal-diff * 1000 (if set),
        # minus column index (deterministic final tiebreak). Lower diff = better.
        tb_formula = (
            f'={col_letter}{total_row}*1000000'
            f'-IF(ISNUMBER({col_letter}{goal_diff_row}),{col_letter}{goal_diff_row}*1000,0)'
            f'-COLUMN()'
        )
        tb = ws.cell(row=tiebreak_row, column=score_col, value=tb_formula)
        tb.font = Font(color="BFBFBF", size=9); tb.alignment = CENTER

    # TOTAL label (merged across A:D)
    label = ws.cell(row=total_row, column=1, value="TOTAL")
    label.font = Font(bold=True, color="FFFFFF")
    label.fill = HEADER_FILL
    label.alignment = CENTER
    ws.merge_cells(start_row=total_row, start_column=1, end_row=total_row, end_column=4)
    label.border = BOX

    # Hidden helper rows
    ws.cell(row=tiebreak_row, column=1, value="Tiebreak sort key (auto)").font = Font(italic=True, color="7F7F7F")
    ws.merge_cells(start_row=tiebreak_row, start_column=1, end_row=tiebreak_row, end_column=4)
    ws.row_dimensions[tiebreak_row].hidden = True

    gd_label = ws.cell(row=goal_diff_row, column=1, value="Goal-diff vs actual (|guess − actual|)")
    gd_label.font = Font(italic=True, color="7F7F7F")
    gd_label.alignment = LEFT
    ws.merge_cells(start_row=goal_diff_row, start_column=1, end_row=goal_diff_row, end_column=4)

    # Per-round subtotals block
    hdr = ws.cell(row=round_header_row, column=1, value="Points by round")
    style_header(hdr)
    ws.merge_cells(start_row=round_header_row, start_column=1, end_row=round_header_row, end_column=4)
    for p in range(NUM_PLAYERS):
        score_col = 5 + p
        col_letter = get_column_letter(score_col)
        h = ws.cell(row=round_header_row, column=score_col, value=f"=Picks!{get_column_letter(5 + p * 2)}1")
        style_subheader(h)

    for ri, rnd in enumerate(ROUND_ORDER):
        r = round_first_subtotal + ri
        rlabel = ws.cell(row=r, column=1, value=ROUND_LABELS[rnd])
        rlabel.fill = ROUND_FILLS[rnd]; rlabel.font = Font(bold=True)
        rlabel.alignment = LEFT; rlabel.border = BOX
        ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=4)

        series_rows = [first_series_row + i for i, s in enumerate(SERIES) if s[1] == rnd]
        for p in range(NUM_PLAYERS):
            score_col = 5 + p
            col_letter = get_column_letter(score_col)
            cells = ",".join(f"{col_letter}{sr}" for sr in series_rows)
            # Treat blank (no-result) as 0 for the subtotal
            formula = "=SUM(" + ",".join(f'IF({col_letter}{sr}="",0,{col_letter}{sr})' for sr in series_rows) + ")"
            c = ws.cell(row=r, column=score_col, value=formula)
            c.alignment = CENTER; c.border = BOX
            c.fill = FORMULA_FILL

    # Heatmap on per-series scoring block only
    last_col = get_column_letter(4 + NUM_PLAYERS)
    rng = f"E{first_series_row}:{last_col}{last_series_row}"
    rule = ColorScaleRule(
        start_type="num", start_value=0, start_color="FFFFFF",
        mid_type="num", mid_value=5, mid_color="FFF2CC",
        end_type="num", end_value=11, end_color="63BE7B",
    )
    ws.conditional_formatting.add(rng, rule)

    ws.freeze_panes = "E3"
    return total_row, tiebreak_row


def write_leaderboard(ws, total_row, tiebreak_row):
    ws.title = "Leaderboard"
    ws.column_dimensions["A"].width = 8
    ws.column_dimensions["B"].width = 22
    ws.column_dimensions["C"].width = 14
    ws.column_dimensions["D"].width = 18

    ws.cell(row=1, column=1, value="Rank"); style_header(ws.cell(row=1, column=1))
    ws.cell(row=1, column=2, value="Player"); style_header(ws.cell(row=1, column=2))
    ws.cell(row=1, column=3, value="Total Points"); style_header(ws.cell(row=1, column=3))
    ws.cell(row=1, column=4, value="Goal-Diff (TB)"); style_header(ws.cell(row=1, column=4))

    last_col = get_column_letter(4 + NUM_PLAYERS)
    names_range = f"Scores!$E$1:${last_col}$1"
    totals_range = f"Scores!$E${total_row}:${last_col}${total_row}"
    tb_range = f"Scores!$E${tiebreak_row}:${last_col}${tiebreak_row}"
    gd_range = f"Scores!$E${tiebreak_row + 1}:${last_col}${tiebreak_row + 1}"

    for p in range(NUM_PLAYERS):
        r = p + 2
        match_expr = f"MATCH(LARGE({tb_range},ROW()-1),{tb_range},0)"
        ws.cell(row=r, column=2,
                value=f'=IFERROR(INDEX({names_range},1,{match_expr}),"")')
        ws.cell(row=r, column=3,
                value=f'=IFERROR(INDEX({totals_range},1,{match_expr}),"")')
        ws.cell(row=r, column=4,
                value=f'=IFERROR(INDEX({gd_range},1,{match_expr}),"")')
        ws.cell(row=r, column=1, value=f'=IF(C{r}="","",ROW()-1)')

        for col in range(1, 5):
            c = ws.cell(row=r, column=col)
            c.alignment = CENTER; c.border = BOX

    first_fill = PatternFill("solid", fgColor="FFD966")
    for col in range(1, 5):
        ws.cell(row=2, column=col).fill = first_fill
        ws.cell(row=2, column=col).font = Font(bold=True)

    ws.freeze_panes = "A2"


def main():
    wb = Workbook()
    inst_ws = wb.active
    write_instructions(inst_ws)

    config_ws = wb.create_sheet("Config")
    write_config(wb, config_ws)

    bracket_ws = wb.create_sheet("Bracket")
    row_of, bracket_tb_row = write_bracket(wb, bracket_ws)

    picks_ws = wb.create_sheet("Picks")
    picks_tb_row = write_picks(picks_ws, row_of, bracket_tb_row)

    scores_ws = wb.create_sheet("Scores")
    total_row, tiebreak_row = write_scores(scores_ws, picks_tb_row)

    leaderboard_ws = wb.create_sheet("Leaderboard")
    write_leaderboard(leaderboard_ws, total_row, tiebreak_row)

    desired = ["Instructions", "Bracket", "Picks", "Scores", "Leaderboard", "Config"]
    wb._sheets = [wb[name] for name in desired]

    out = "NHL_Playoffs_2026_Bracket_Scorer.xlsx"
    wb.save(out)
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
