"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Info, Loader2, BookOpen, AlertCircle, Sparkles, Sigma, FunctionSquare } from "lucide-react";
import { explainNumericalMethod } from "@/ai/flows/explain-numerical-method-flow";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

interface NumericalExplanationProps {
  methodName: string;
  context?: string;
}

interface MethodInfo {
  resumen: string;
  formula: string;
  aplicacion: string;
}

const METHOD_INFO: Record<string, MethodInfo> = {
  "Media Aritmética": {
    resumen:
      "Mide el valor central de un conjunto de datos. Es el indicador estadístico más usado para resumir el rendimiento general de un grupo.",
    formula: "x̄ = (Σ xᵢ) / n",
    aplicacion:
      "Se promedian los porcentajes de asistencia individuales de todos los estudiantes para obtener la asistencia promedio del grupo.",
  },
  "Análisis de Dispersión": {
    resumen:
      "La desviación estándar indica qué tan dispersos están los datos respecto a la media. Un valor alto significa grupos muy desiguales.",
    formula: "σ = √( Σ(xᵢ − x̄)² / n )",
    aplicacion:
      "Revela si la asistencia es homogénea (todos asisten parecido) o si hay estudiantes muy por debajo del promedio.",
  },
  "Método de Bisección": {
    resumen:
      "Método numérico que encuentra la raíz de una función dividiendo repetidamente el intervalo a la mitad hasta converger a la solución.",
    formula: "f(x) = (P + x)/(T + x) − 0.8 = 0",
    aplicacion:
      "Calcula cuántas clases adicionales con asistencia perfecta se necesitan para que el grupo alcance el umbral mínimo del 80%.",
  },
  "Interpolación de Lagrange": {
    resumen:
      "Construye un polinomio que pasa exactamente por todos los puntos conocidos, permitiendo estimar valores intermedios o futuros.",
    formula: "P(x) = Σ yᵢ · Lᵢ(x)",
    aplicacion:
      "Proyecta la tendencia de asistencia de las próximas clases a partir del historial registrado.",
  },
  "Integración Numérica (Trapecio)": {
    resumen:
      "Aproxima el área bajo una curva sumando trapecios. Cuantifica el comportamiento acumulado a lo largo del tiempo.",
    formula: "A ≈ Σ (h/2)·(yᵢ + yᵢ₊₁)",
    aplicacion:
      "Mide el 'área de asistencia' acumulada: una métrica integral del compromiso del grupo durante todo el periodo.",
  },
  "Filtro Estadístico": {
    resumen:
      "Aplica un criterio de umbral para clasificar y segmentar la población según una condición de riesgo.",
    formula: "Riesgo ⇔ asistencia < 80%",
    aplicacion:
      "Identifica a los estudiantes que están por debajo del mínimo reglamentario y podrían perder la asignatura.",
  },
};

export function NumericalExplanation({ methodName }: NumericalExplanationProps) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const info = METHOD_INFO[methodName];

  const fetchExplanation = async () => {
    if (explanation || loading) return;
    setLoading(true);
    try {
      let queryName = methodName;
      if (methodName === "Método de Bisección") {
        queryName =
          "Método de Bisección aplicado al cálculo de clases adicionales necesarias para alcanzar el 80% de asistencia";
      } else if (methodName === "Filtro Estadístico") {
        queryName =
          "Filtro Estadístico para identificar estudiantes con menos del 80% de asistencia y su riesgo de reprobación";
      }
      const res = await explainNumericalMethod({ methodName: queryName });
      setExplanation(res.explanation);
    } catch (err) {
      setExplanation("No se pudo obtener la explicación ampliada en este momento. Intenta nuevamente más tarde.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
          aria-label={`Explicar ${methodName}`}
        >
          <Info className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg gap-0 overflow-hidden border-none p-0 shadow-2xl">
        <DialogHeader className="gradient-primary space-y-1 p-6 text-left text-white">
          <DialogTitle className="flex items-center gap-2 font-headline text-lg text-white">
            <BookOpen className="h-5 w-5" />
            {methodName}
          </DialogTitle>
          <DialogDescription className="text-xs text-white/80">
            Fundamento matemático aplicado al análisis de asistencia
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto bg-background p-6 custom-scrollbar">
          {methodName === "Filtro Estadístico" && (
            <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <h4 className="text-sm font-bold text-destructive">¿Riesgo de qué?</h4>
                <p className="text-xs leading-snug text-destructive/90">
                  Riesgo de <strong>pérdida de la asignatura</strong> por incumplir el reglamento de
                  asistencia (mínimo 80% requerido).
                </p>
              </div>
            </div>
          )}

          {info && (
            <>
              <section>
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">
                  ¿Qué es?
                </h4>
                <p className="text-sm leading-relaxed text-foreground/90">{info.resumen}</p>
              </section>

              <section className="rounded-xl border bg-secondary/50 p-4">
                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <FunctionSquare className="h-3.5 w-3.5" /> Fórmula
                </div>
                <code className="block font-code text-base font-medium text-foreground">
                  {info.formula}
                </code>
              </section>

              <section>
                <h4 className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
                  <Sigma className="h-3.5 w-3.5" /> Cómo se aplica aquí
                </h4>
                <p className="text-sm leading-relaxed text-foreground/90">{info.aplicacion}</p>
              </section>
            </>
          )}

          <section className="rounded-xl border border-primary/15 bg-primary/5 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Explicación ampliada (IA)
              </h4>
              {!explanation && !loading && (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={fetchExplanation}>
                  Generar
                </Button>
              )}
            </div>
            {loading ? (
              <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="animate-pulse">Consultando base de conocimientos…</span>
              </div>
            ) : explanation ? (
              <div className="space-y-2 text-sm leading-relaxed text-foreground/90">
                {explanation.split("\n").filter(Boolean).map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Genera una explicación pedagógica detallada con ejemplos del mundo real.
              </p>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
