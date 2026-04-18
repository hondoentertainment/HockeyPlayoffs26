import type { Metadata } from "next";
import "./globals.css";
import { StateProvider } from "@/lib/state";

export const metadata: Metadata = {
  title: "NHL Playoffs 2026 — Bracket Scorer",
  description: "Track the 2026 NHL playoff bracket and score players' picks.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StateProvider>
          <div className="mx-auto max-w-6xl p-4 sm:p-6">
            <header className="mb-6">
              <h1 className="text-2xl font-bold text-header sm:text-3xl">
                NHL Playoffs 2026 — Bracket Scorer
              </h1>
              <p className="text-sm text-gray-600">
                Enter Round 1 matchups, fill in winners as series finish, and
                track every player&rsquo;s score live.
              </p>
            </header>
            {children}
          </div>
        </StateProvider>
      </body>
    </html>
  );
}
