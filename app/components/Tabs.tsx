"use client";

import { ReactNode, useState } from "react";

export interface TabDef {
  id: string;
  label: string;
  content: ReactNode;
}

export function Tabs({ tabs, initial }: { tabs: TabDef[]; initial?: string }) {
  const [active, setActive] = useState(initial ?? tabs[0]?.id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];
  return (
    <div>
      <nav className="mb-4 flex flex-wrap gap-1 border-b border-gray-300">
        {tabs.map((t) => {
          const on = t.id === current.id;
          return (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={
                "rounded-t px-3 py-1.5 text-sm font-medium transition " +
                (on
                  ? "bg-header text-white"
                  : "bg-transparent text-header hover:bg-header/10")
              }
            >
              {t.label}
            </button>
          );
        })}
      </nav>
      <section>{current.content}</section>
    </div>
  );
}
