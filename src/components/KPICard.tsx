"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  hint?: {
    formula?: string;
    source?: string;
    interpretation?: string;
  };
}

const toneStyles: Record<Tone, { bar: string; iconBg: string; ring: string }> = {
  primary: {
    bar: "from-primary to-[hsl(280,65%,60%)]",
    iconBg: "bg-primary/10 text-primary",
    ring: "hover:border-primary/50 hover:shadow-primary/10",
  },
  accent: {
    bar: "from-accent to-[hsl(199,89%,48%)]",
    iconBg: "bg-accent/10 text-accent",
    ring: "hover:border-accent/50 hover:shadow-accent/10",
  },
  warning: {
    bar: "from-warning to-[hsl(27,87%,60%)]",
    iconBg: "bg-warning/15 text-warning",
    ring: "hover:border-warning/50 hover:shadow-warning/10",
  },
  destructive: {
    bar: "from-destructive to-[hsl(0,78%,68%)]",
    iconBg: "bg-destructive/10 text-destructive",
    ring: "hover:border-destructive/50 hover:shadow-destructive/10",
  },
};

export function KPICard({
  title, value, method, subtitle, icon, tone = "primary", index = 0, hint,
}: KPICardProps) {
  const s = toneStyles[tone];

  const card = (
    <Card
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-card card-shadow transition-all duration-300 animate-float-up cursor-help",
        "hover:-translate-y-1 hover:card-shadow-lg",
        s.ring
      )}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", s.bar)} />
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl sm:h-10 sm:w-10", s.iconBg)}>
            {icon}
          </div>
          <NumericalExplanation methodName={method} />
        </div>

        <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-[11px]">
          {title}
        </p>
        <p className="mt-0.5 font-headline text-2xl font-bold tracking-tight tabular-nums text-foreground sm:text-3xl">
          {value}
        </p>

        <div className="mt-2.5">
          <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 font-code text-[10px] font-medium uppercase text-secondary-foreground">
            {method}
          </span>
        </div>
        {subtitle && (
          <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </Card>
  );

  if (!hint) return card;

  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>{card}</TooltipTrigger>
      <TooltipContent
        side="bottom"
        className="max-w-[280px] space-y-2 rounded-xl border bg-popover p-3 text-popover-foreground shadow-xl"
      >
        <p className="text-xs font-bold uppercase tracking-wider text-primary">{method}</p>
        {hint.formula && (
          <div className="rounded-md bg-secondary/70 px-2 py-1.5 font-code text-[11px] text-foreground">
            {hint.formula}
          </div>
        )}
        {hint.source && (
          <div className="text-xs leading-relaxed text-foreground/90">
            <span className="font-semibold text-foreground">De dónde sale: </span>
            {hint.source}
          </div>
        )}
        {hint.interpretation && (
          <div className="text-xs leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">Qué significa: </span>
            {hint.interpretation}
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
