"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Info, Loader2, BookOpen, AlertCircle } from "lucide-react";
import { explainNumericalMethod } from "@/ai/flows/explain-numerical-method-flow";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger 
} from "@/components/ui/dialog";

interface NumericalExplanationProps {
  methodName: string;
  context?: string;
}

export function NumericalExplanation({ methodName, context }: NumericalExplanationProps) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchExplanation = async () => {
    if (explanation) return;
    setLoading(true);
    try {
      let queryName = methodName;
      if (methodName === "Método de Bisección") {
        queryName = "Método de Bisección aplicado al cálculo de clases adicionales necesarias para alcanzar el 80% de asistencia";
      } else if (methodName === "Filtro Estadístico") {
        queryName = "Filtro Estadístico para identificar estudiantes con menos del 80% de asistencia y su riesgo de reprobación";
      }
      
      const res = await explainNumericalMethod({ methodName: queryName });
      setExplanation(res.explanation);
    } catch (err) {
      setExplanation("No se pudo obtener la explicación en este momento.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-primary/60 hover:text-primary" onClick={fetchExplanation}>
          <Info className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md overflow-hidden p-0 gap-0 border-none shadow-2xl">
        <DialogHeader className="p-6 bg-primary text-primary-foreground">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="w-5 h-5" />
            Análisis Académico
          </DialogTitle>
          <DialogDescription className="text-primary-foreground/80 text-xs">
            Fundamento matemático: {methodName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-6 bg-background">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground animate-pulse">Consultando base de conocimientos...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {methodName === "Filtro Estadístico" && (
                <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-md flex gap-3 items-start">
                  <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-destructive">¿Riesgo de qué?</h4>
                    <p className="text-xs text-destructive/90 leading-tight">
                      Riesgo de <strong>pérdida de la asignatura</strong> por incumplimiento del reglamento de asistencia (mínimo 80% requerido).
                    </p>
                  </div>
                </div>
              )}
              
              <div className="text-sm leading-relaxed text-foreground/90 space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {explanation?.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
