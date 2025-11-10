"use client";

import { formatCurrency } from "@/lib/privacy";
import { Trophy, TrendingUp, Target } from "lucide-react";
import type { ProjectionResult } from "@/lib/projection-v2";
import { calculateMilestoneReach } from "@/lib/projection-v2";

interface MilestoneCardsProps {
  projection: ProjectionResult;
  currentValue: number;
  privacyMode: boolean;
}

export function MilestoneCards({ projection, currentValue, privacyMode }: MilestoneCardsProps) {
  // Define milestones based on current value
  const milestones = [
    { amount: 100000, label: "€100K", icon: Target },
    { amount: 250000, label: "€250K", icon: TrendingUp },
    { amount: 500000, label: "€500K", icon: Trophy },
    { amount: 1000000, label: "€1M", icon: Trophy },
  ].filter(m => m.amount > currentValue);

  if (milestones.length === 0) {
    return (
      <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-6 text-center">
        <Trophy className="h-12 w-12 mx-auto mb-3 text-green-600 dark:text-green-400" />
        <h3 className="text-lg font-semibold text-green-900 dark:text-green-300 mb-2">
          Congratulations! 🎉
        </h3>
        <p className="text-sm text-green-800 dark:text-green-400">
          You've reached the €1M milestone!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Trophy className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
        Financial Milestones
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {milestones.slice(0, 3).map((milestone) => {
          const reach = calculateMilestoneReach(projection, milestone.amount);
          const Icon = milestone.icon;
          
          if (!reach) {
            return (
              <div
                key={milestone.amount}
                className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 bg-zinc-50 dark:bg-zinc-900/50"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-5 w-5 text-zinc-400" />
                  <span className="font-semibold text-lg">{milestone.label}</span>
                </div>
                <div className="text-sm text-zinc-500">
                  Beyond projection period
                </div>
              </div>
            );
          }
          
          const years = Math.floor(reach.months / 12);
          const months = reach.months % 12;
          
          let timeStr = "";
          if (years > 0 && months > 0) {
            timeStr = `${years}y ${months}m`;
          } else if (years > 0) {
            timeStr = `${years} ${years === 1 ? "year" : "years"}`;
          } else {
            timeStr = `${months} ${months === 1 ? "month" : "months"}`;
          }
          
          const reachDate = new Date(reach.date);
          const dateStr = reachDate.toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          });
          
          return (
            <div
              key={milestone.amount}
              className="rounded-lg border border-blue-200 dark:border-blue-800 p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20"
            >
              <div className="flex items-center gap-2 mb-3">
                <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span className="font-semibold text-lg">{milestone.label}</span>
              </div>
              
              <div className="space-y-1">
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  Reached in:
                </div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {timeStr}
                </div>
                <div className="text-xs text-zinc-500">
                  {dateStr}
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                <div className="text-xs text-zinc-600 dark:text-zinc-400">
                  Progress to goal
                </div>
                <div className="mt-1 h-2 bg-white dark:bg-zinc-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                    style={{
                      width: `${Math.min(100, (currentValue / milestone.amount) * 100)}%`,
                    }}
                  />
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  {((currentValue / milestone.amount) * 100).toFixed(1)}% complete
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

