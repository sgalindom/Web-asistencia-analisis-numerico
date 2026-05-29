"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { NumericalExplanation } from "./NumericalExplanation";
import { cn } from "@/lib/utils";

type Tone = "primary" | "accent" | "warning" | "destructive";

interface KPICardProps {
  title: string;
  value: string | number;
  method: string;
  subtitle?: string;
  icon?: React.ReactNode;
  tone?: Tone;
  index?: number;
}

const toneStyles: Record<Tone, { bar: string; iconBg: string; value: string; ring: string }> = {
  primary: {
    bar: "from-primary to-[hsl(280,65%,60%)]",
    iconBg: "bg-primary/10 text-primary",
    value: "text-foreground",
    ring: "hover:border-primary/40",
  },
  accent: {
    bar: "from-accent to-[hsl(199,89%,48%)]",
    iconBg: "bg-accent/10 text-accent",
    value: "text-foreground",
    ring: "hover:border-accent/40",
  },
  warning: {
    bar: "from-warning to-[hsl(27,87%,60%)]",
    iconBg: "bg-warning/15 text-warning",
    value: "text-foreground",
    ring: "hover:border-warning/40",
  },
  destructive: {
    bar: "from-destructive to-[hsl(0,78%,68%)]",
    iconBg: "bg-destructive/10 text-destructive",
    value: "text-foreground",
    ring: "hover:border-destructive/40",
  },
};

export function KPICard({ title, value, method, subtitle, icon, tone = "primary", index = 0 }: KPICardProps) {
  const s = toneStyles[tone];
  return (
    <Card
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-card card-shadow transition-all duration-300 animate-float-up",
        "hover:-translate-y-1 hover:card-shadow-lg",
        s.ring
      )}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", s.bar)} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", s.iconBg)}>
            {icon}
          </div>
          <NumericalExplanation methodName={method} />
        </div>

        <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
        <p className={cn("mt-1 font-headline text-3xl font-bold tracking-tight tabular-nums", s.value)}>
          {value}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 font-code text-[10px] font-medium uppercase text-secondary-foreground">
            {method}
          </span>
        </div>
        {subtitle && (
          <p className="mt-2 text-xs leading-snug text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </Card>
  );
}
