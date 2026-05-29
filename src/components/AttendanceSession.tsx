
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { collection, getDocs, addDoc, query, writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  XCircle,
  Save,
  Calendar,
  Loader2,
  Search,
  ClipboardCheck,
  Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Student {
  firebaseId: string;
  id: string;
  nombre: string;
  carrera: string;
}

export function AttendanceSession({ groupId, onComplete }: { groupId: string; onComplete: () => void }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, "Presente" | "Ausente">>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    async function loadStudents() {
      if (!groupId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const q = query(collection(db, "groups", groupId, "students"));
        const snapshot = await getDocs(q);
        const list: Student[] = snapshot.docs.map((d) => ({
          firebaseId: d.id,
          ...d.data(),
        })) as Student[];
        list.sort((a, b) => a.nombre.localeCompare(b.nombre));
        setStudents(list);
      } catch (err: any) {
        toast({ variant: "destructive", title: "Error al cargar estudiantes", description: err.message });
      } finally {
        setLoading(false);
      }
    }
    loadStudents();
  }, [groupId, toast]);

  const markStatus = (studentId: string, status: "Presente" | "Ausente") => {
    setAttendance((prev) => ({ ...prev, [studentId]: status }));
  };

  const markAll = (status: "Presente" | "Ausente") => {
    const next: Record<string, "Presente" | "Ausente"> = {};
    students.forEach((s) => (next[s.firebaseId] = status));
    setAttendance(next);
  };

  const markedCount = Object.keys(attendance).length;
  const presentCount = Object.values(attendance).filter((v) => v === "Presente").length;
  const isComplete = students.length > 0 && markedCount === students.length;
  const progress = students.length > 0 ? (markedCount / students.length) * 100 : 0;

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return students;
    return students.filter(
      (s) => s.nombre.toLowerCase().includes(t) || (s.carrera || "").toLowerCase().includes(t)
    );
  }, [students, search]);

  const saveAttendance = async () => {
    if (!isComplete || !groupId) return;
    setSaving(true);
    try {
      const fecha = new Date().toISOString().split("T")[0];
      const classRef = await addDoc(collection(db, "groups", groupId, "classes"), { fecha });
      const batch = writeBatch(db);
      Object.entries(attendance).forEach(([studentId, status]) => {
        const attRef = doc(collection(db, "groups", groupId, "attendance"));
        batch.set(attRef, {
          classId: classRef.id,
          studentId,
          fecha,
          valor: status === "Presente" ? 1 : 0,
          estado: status,
        });
      });
      await batch.commit();
      toast({ title: "Asistencia guardada", description: "La clase ha sido registrada exitosamente." });
      onComplete();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error al guardar", description: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (!groupId) {
    return (
      <div className="rounded-2xl border border-dashed bg-card p-10 text-center text-muted-foreground">
        Seleccione un grupo para iniciar la clase.
      </div>
    );
  }
  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border bg-card p-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="overflow-hidden rounded-2xl border card-shadow">
      {/* Encabezado */}
      <div className="gradient-primary p-5 text-white sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-headline text-xl font-bold">Llamado a Lista</h2>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-white/80">
                <Calendar className="h-3.5 w-3.5" />
                {new Date().toLocaleDateString("es-ES", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-white/15 px-4 py-2 text-center">
            <p className="font-headline text-2xl font-bold leading-none tabular-nums">
              {markedCount}/{students.length}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-white/80">Marcados</p>
          </div>
        </div>

        <div className="mt-4">
          <Progress value={progress} className="h-2 bg-white/20" />
          <div className="mt-1.5 flex justify-between text-[11px] text-white/80">
            <span>{presentCount} presentes</span>
            <span>{markedCount - presentCount} ausentes</span>
          </div>
        </div>
      </div>

      <CardContent className="space-y-4 p-4 sm:p-6">
        {/* Controles */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar estudiante…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => markAll("Presente")}
              className="flex-1 border-accent/40 text-accent hover:bg-accent/10 hover:text-accent sm:flex-none"
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" /> Todos presentes
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAttendance({})}
              className="flex-1 sm:flex-none"
            >
              Limpiar
            </Button>
          </div>
        </div>

        {/* Lista de estudiantes */}
        <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1 custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <Users className="mx-auto mb-2 h-8 w-8 opacity-40" />
              No se encontraron estudiantes.
            </div>
          ) : (
            filtered.map((student, i) => {
              const status = attendance[student.firebaseId];
              return (
                <div
                  key={student.firebaseId}
                  className={cn(
                    "flex flex-col gap-3 rounded-xl border bg-card p-3 transition-colors sm:flex-row sm:items-center sm:justify-between",
                    status === "Presente" && "border-accent/40 bg-accent/5",
                    status === "Ausente" && "border-destructive/40 bg-destructive/5"
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        status === "Presente"
                          ? "bg-accent text-accent-foreground"
                          : status === "Ausente"
                          ? "bg-destructive text-destructive-foreground"
                          : "bg-secondary text-secondary-foreground"
                      )}
                    >
                      {student.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{student.nombre}</p>
                      <p className="truncate text-xs text-muted-foreground">{student.carrera}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={status === "Presente" ? "default" : "outline"}
                      className={cn(
                        "flex-1 sm:flex-none",
                        status === "Presente" && "bg-accent text-accent-foreground hover:bg-accent/90"
                      )}
                      onClick={() => markStatus(student.firebaseId, "Presente")}
                    >
                      <CheckCircle2 className="mr-1 h-4 w-4" /> Presente
                    </Button>
                    <Button
                      size="sm"
                      variant={status === "Ausente" ? "destructive" : "outline"}
                      className="flex-1 sm:flex-none"
                      onClick={() => markStatus(student.firebaseId, "Ausente")}
                    >
                      <XCircle className="mr-1 h-4 w-4" /> Ausente
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>

      {/* Pie sticky */}
      <div className="sticky bottom-0 flex flex-col gap-3 border-t bg-muted/60 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {!isComplete
            ? `Faltan ${students.length - markedCount} estudiante(s) por marcar.`
            : "Todo listo para guardar el registro de hoy."}
        </p>
        <Button
          onClick={saveAttendance}
          disabled={!isComplete || saving}
          size="lg"
          className="w-full sm:w-auto"
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Finalizar y Guardar Clase
        </Button>
      </div>
    </Card>
  );
}
