
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
    <Card className="overflow-hidden border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="flex items-center gap-1">
          {icon}
          <NumericalExplanation methodName={method} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-primary">{value}</div>
        <div className="mt-1 flex flex-col gap-1">
          <p className="text-xs font-mono text-muted-foreground">
            Método: {method}
          </p>
          {subtitle && (
            <p className="text-xs text-accent font-medium">
              {subtitle}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
