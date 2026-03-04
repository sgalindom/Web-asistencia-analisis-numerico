
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Info, Loader2, BookOpen } from "lucide-react";
import { explainNumericalMethod } from "@/ai/flows/explain-numerical-method-flow";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger 
} from "@/components/ui/dialog";

export function NumericalExplanation({ methodName }: { methodName: string }) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchExplanation = async () => {
    if (explanation) return;
    setLoading(true);
    try {
      // Proporcionar contexto adicional para que la IA explique mejor el Punto Crítico
      let queryName = methodName;
      if (methodName === "Método de Bisección") {
        queryName = "Método de Bisección aplicado al cálculo de clases adicionales necesarias para alcanzar el 80% de asistencia";
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Análisis Académico: {methodName}
          </DialogTitle>
          <DialogDescription>
            Explicación pedagógica del método numérico aplicado a los datos de asistencia.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 text-sm leading-relaxed space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-8 gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground animate-pulse">Consultando experto en pedagogía...</p>
            </div>
          ) : (
            <div className="bg-muted p-4 rounded-lg border">
              {explanation?.split('\n').map((line, i) => (
                <p key={i} className="mb-2">{line}</p>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
