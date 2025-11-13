import { useMemo, useState } from "react";

export type GlobalSearchItemType = "holding" | "account" | "user" | "crypto";

export interface GlobalSearchItem {
  id: string;
  type: GlobalSearchItemType;
  label: string;
  hint?: string;
  action: () => void;
}

interface GlobalSearchProps {
  items: GlobalSearchItem[];
  placeholder?: string;
}

export function GlobalSearch({ items, placeholder = "Search positions, crypto, people..." }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setFocused] = useState(false);

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return [];
    }
    return items
      .filter((item) => {
        const label = item.label.toLowerCase();
        const hint = item.hint?.toLowerCase() ?? "";
        return label.includes(trimmed) || hint.includes(trimmed);
      })
      .slice(0, 6);
  }, [items, query]);

  const hasQuery = query.trim().length > 0;

  return (
    <div className="relative w-full max-w-lg">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          // Delay closing to allow click
          setTimeout(() => setFocused(false), 150);
        }}
        placeholder={placeholder}
        className="w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {isFocused && hasQuery && filtered.length > 0 && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg">
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {filtered.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    item.action();
                    setQuery("");
                    setFocused(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">{item.label}</div>
                  {item.hint && (
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">{item.hint}</div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

