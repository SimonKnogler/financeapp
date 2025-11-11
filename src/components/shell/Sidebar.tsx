"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/ui"; 
import { Banknote, Coins, Settings, FlaskConical, TrendingUp, Eye, EyeOff, LineChart, Target, Newspaper, Calculator } from "lucide-react";
import { useFinanceStore } from "@/store/finance-store";

const navItems = [
  { href: "/portfolio", label: "Portfolio", icon: TrendingUp },
  { href: "/projections", label: "Projections", icon: LineChart },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/news", label: "News", icon: Newspaper },
  { href: "/income", label: "Income", icon: Banknote },
  { href: "/expenses", label: "Expenses", icon: Coins },
  { href: "/taxes", label: "Taxes", icon: Calculator },
  { href: "/assumptions", label: "Assumptions", icon: FlaskConical },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { privacyMode, togglePrivacyMode } = useFinanceStore();
  
  return (
    <aside className="hidden md:flex md:w-64 md:flex-col border-r border-zinc-200 dark:border-zinc-800">
      <div className="h-14 flex items-center px-4 text-lg font-semibold">Finances</div>
      <nav className="flex-1 px-2 py-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="px-2 pb-2">
        <button
          onClick={togglePrivacyMode}
          className={cn(
            "w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
            privacyMode
              ? "bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-400"
              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
          )}
          title={privacyMode ? "Show values" : "Hide values"}
        >
          {privacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          <span>{privacyMode ? "Privacy On" : "Privacy Mode"}</span>
        </button>
      </div>
      <div className="px-4 py-4 text-xs text-zinc-500">v0.1.0</div>
    </aside>
  );
}

