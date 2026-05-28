import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "NHL Playoffs 2026 Bracket",
  description: "Track the 2026 NHL playoff bracket and score everyone's picks."
};

// Rendered fresh per request so the footer date always reflects the current day.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/New_York"
  });

  return (
    <html lang="en">
      <body>
        <header className="bg-playoff text-white">
          <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3 text-sm">
            <Link href="/" className="font-bold text-base">
              NHL Playoffs 2026
            </Link>
            <Link href="/" className="hover:underline">
              Leaderboard
            </Link>
            <Link href="/bracket" className="hover:underline">
              Bracket
            </Link>
            <Link href="/picks" className="hover:underline">
              Submit Picks
            </Link>
            <Link href="/admin" className="ml-auto opacity-70 hover:underline">
              Admin
            </Link>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 py-6 text-xs text-slate-500">
          Updated {today}
        </footer>
      </body>
    </html>
  );
}
