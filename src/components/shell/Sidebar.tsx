"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/ui"; 
import { Banknote, Coins, Settings, FlaskConical, TrendingUp, Eye, EyeOff, LineChart, Target, Newspaper, Calculator, FileText, X } from "lucide-react";
import { useFinanceStore } from "@/store/finance-store";

const navItems = [
  { href: "/portfolio", label: "Portfolio", icon: TrendingUp },
  { href: "/projections", label: "Projections", icon: LineChart },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/news", label: "News", icon: Newspaper },
  { href: "/income", label: "Income", icon: Banknote },
  { href: "/expenses", label: "Expenses", icon: Coins },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/taxes", label: "Taxes", icon: Calculator },
  { href: "/assumptions", label: "Assumptions", icon: FlaskConical },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { privacyMode, togglePrivacyMode } = useFinanceStore();
  
  // Close mobile menu on route change
  useEffect(() => {
    if (mobileOpen && onMobileClose) {
      onMobileClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const sidebarContent = (
    <>
      <div className="h-14 flex items-center justify-between px-4 border-b border-zinc-200 dark:border-zinc-800 md:border-b-0">
        <span className="text-lg font-semibold">Finances</span>
        {mobileOpen && onMobileClose && (
          <button
            onClick={onMobileClose}
            className="md:hidden p-2 -mr-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      <nav className="flex-1 px-2 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors touch-manipulation",
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
            "w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors touch-manipulation",
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
      <div className="px-4 py-4 text-xs text-zinc-500 border-t border-zinc-200 dark:border-zinc-800">v0.1.0</div>
    </>
  );
  
  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col border-r border-zinc-200 dark:border-zinc-800">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar - Slide-out drawer */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          
          {/* Drawer */}
          <aside 
            className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 z-50 flex flex-col md:hidden transform transition-transform duration-300 ease-in-out"
            style={{ transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)' }}
          >
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}

