"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NumericalExplanation } from "./NumericalExplanation";

interface KPICardProps {
  title: string;
  value: string | number;
  method: string;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: string;
}

export function KPICard({ title, value, method, subtitle, icon, trend }: KPICardProps) {
  return (
    <Card className="overflow-hidden border-l-4 border-l-primary shadow-sm hover:shadow-md transition-all duration-300">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
        <div className="flex items-center gap-1">
          {icon}
          <NumericalExplanation methodName={method} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-primary tracking-tight">{value}</div>
        <div className="mt-2 space-y-1">
          <div className="flex items-center gap-1.5">
            <div className="h-1 w-1 rounded-full bg-primary/40" />
            <p className="text-[10px] font-mono text-muted-foreground uppercase">
              {method}
            </p>
          </div>
          {subtitle && (
            <p className="text-[11px] text-accent font-medium leading-tight">
              {subtitle}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
