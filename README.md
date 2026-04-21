# NHL Playoffs 2026 — Bracket Pool

Two ways to run a bracket pool for the 2026 NHL playoffs:

1. **Web app** (`app/`, `lib/`) — a Next.js + Postgres pool hosted on Vercel.
   Players submit picks online, admin enters series results, leaderboard
   updates live.
2. **Excel workbook** (`build_bracket.py` →
   `NHL_Playoffs_2026_Bracket_Scorer.xlsx`) — a self-contained spreadsheet
   for offline scoring. See "Excel workbook" below.

## Web app

### Stack

- Next.js 14 (App Router) + TypeScript + Tailwind
- Postgres via `@neondatabase/serverless` (works with Vercel's Neon
  integration or any Postgres URL)
- Server actions for all mutations; admin gated by a single shared password

### Pages

- `/` — leaderboard (rank, totals, per-round breakdown, max possible)
- `/bracket` — bracket view, fills in later rounds as winners are entered
- `/picks` — player submits picks (name + winner + games for each series).
  Re-submitting with the same name updates picks.
- `/picks/[name]` — read-only view of one player's picks and per-series score
- `/admin` — password-gated; sets R1 matchups, enters series results, edits
  scoring config

### Scoring

Defaults (editable on `/admin`):

| Round              | Points |
|--------------------|-------:|
| Round 1            |      2 |
| Round 2            |      4 |
| Conference Final   |      6 |
| Stanley Cup Final  |     10 |

Plus **+1 bonus** for picking the correct number of games (4–7), only when
the winner pick was also correct. Tiebreaker: most correct winners, then
alphabetical.

### Local development

```
npm install
cp .env.example .env.local   # fill in DATABASE_URL + ADMIN_PASSWORD + ADMIN_COOKIE_SECRET
npm run dev
```

The schema is created on first DB call (idempotent `CREATE TABLE IF NOT
EXISTS` + series seed).

### Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel, **Add New → Project**, import the repo. Framework auto-detects
   as Next.js.
3. **Storage tab → Create → Postgres** (Neon). Vercel injects
   `DATABASE_URL` automatically.
4. **Settings → Environment Variables**, add:
   - `ADMIN_PASSWORD` — what you'll type at `/admin/login`
   - `ADMIN_COOKIE_SECRET` — any 32+ char random string
5. **Deploy**. First request to any page initializes the schema.
6. Visit `/admin/login`, sign in, set R1 matchups. Share the public URL.

## Excel workbook

If you'd rather run the pool out of a spreadsheet, the original generator is
still here:

```
pip install openpyxl
python3 build_bracket.py     # writes NHL_Playoffs_2026_Bracket_Scorer.xlsx
```

Open the workbook in Excel / Sheets / LibreOffice. Yellow cells = type here,
green = auto-filled. See `CLAUDE.md` for structural notes if you plan to
modify `build_bracket.py`.
