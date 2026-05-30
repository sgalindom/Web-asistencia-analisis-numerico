
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { KPICard } from "./KPICard";
import { AttendanceSession } from "./AttendanceSession";
import { GroupManager } from "./GroupManager";
import { ThemeToggle } from "./ThemeToggle";
import { NumericalExplanation } from "./NumericalExplanation";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, Cell,
} from "recharts";
import {
  calculateStats,
  findCriticalApprovalPoint,
  lagrangeInterpolation,
  trapezoidRule,
} from "@/lib/numerical-methods";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Users, BarChart3, Presentation, Plus, TrendingUp, AlertTriangle,
  GraduationCap, Sigma, CalendarDays, HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Group {
  id: string;
  nombreGrupo: string;
}

export function Dashboard() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [view, setView] = useState<"stats" | "session" | "newGroup">("stats");
  const [groupData, setGroupData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchGroups(); }, []);

  const fetchGroups = async () => {
    const q = query(collection(db, "groups"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Group[];
    setGroups(list);
    if (list.length > 0 && !selectedGroupId) setSelectedGroupId(list[0].id);
  };

  useEffect(() => {
    if (selectedGroupId) loadGroupStatistics(selectedGroupId);
    else setGroupData(null);
  }, [selectedGroupId]);

  const loadGroupStatistics = async (id: string) => {
    if (!id) return;
    setLoading(true);
    try {
      const studentsSnap = await getDocs(collection(db, "groups", id, "students"));
      const students = studentsSnap.docs.map((d) => ({ firebaseId: d.id, ...d.data() }));
      const classesSnap = await getDocs(query(collection(db, "groups", id, "classes"), orderBy("fecha")));
      const classes = classesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const attendanceSnap = await getDocs(collection(db, "groups", id, "attendance"));
      const attendance = attendanceSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const totalClasses = classes.length;
      if (totalClasses === 0) {
        setGroupData({
          mean: 0, stdDev: 0, totalClasses: 0, criticalPoint: 0,
          atRiskCount: students.length, history: [], projections: [],
          area: 0, studentCount: students.length,
        });
        return;
      }

      const studentAttendance: Record<string, number> = {};
      students.forEach((s: any) => {
        const recs = attendance.filter((a: any) => a.studentId === s.firebaseId);
        const present = recs.filter((a: any) => a.valor === 1).length;
        studentAttendance[s.firebaseId] = (present / totalClasses) * 100;
      });

      const attendanceValues = Object.values(studentAttendance);
      const { mean, stdDev } = calculateStats(attendanceValues);

      const totalPresent = attendance.filter((a: any) => a.valor === 1).length;
      const totalPossible = totalClasses * students.length;

      const need = findCriticalApprovalPoint(totalPresent, totalPossible);
      const classesNeeded = students.length > 0 ? Math.ceil(need / students.length) : 0;
      const atRiskCount = attendanceValues.filter((v) => v < 80).length;

      const history = classes.map((c: any, index: number) => {
        const classAtt = attendance.filter((a: any) => a.classId === c.id);
        const present = classAtt.filter((a: any) => a.valor === 1).length;
        const percentage = classAtt.length === 0 ? 0 : (present / classAtt.length) * 100;
        return {
          name: `C${index + 1}`,
          fecha: c.fecha,
          percentage: Number(percentage.toFixed(2)),
          exact: percentage,
          x: index,
        };
      });

      const points = history.map((h, i) => ({ x: i, y: h.exact }));
      const area = trapezoidRule(points);
      const projections: any[] = [];
      if (history.length >= 2) {
        for (let i = 1; i <= 3; i++) {
          const xVal = history.length - 1 + i;
          projections.push({
            name: `P${i}`,
            percentage: Number(lagrangeInterpolation(points, xVal).toFixed(2)),
            isProjection: true,
          });
        }
      }

      setGroupData({
        mean, stdDev, totalClasses,
        criticalPoint: classesNeeded,
        atRiskCount, history, projections, area,
        studentCount: students.length,
        totalPresent, totalPossible,
      });
    } catch (err) {
      console.error("Error loading stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const errorSim = useMemo(() => {
    if (!groupData) return 0;
    const avg = groupData.mean;
    return Math.abs(avg - Number(avg.toFixed(2)));
  }, [groupData]);

  const selectedGroupName = groups.find((g) => g.id === selectedGroupId)?.nombreGrupo;
  const hasData = groupData && groupData.totalClasses > 0;

  const navItems = [
    { key: "stats" as const, label: "Estadísticas", icon: BarChart3, disabled: false },
    { key: "session" as const, label: "Iniciar Clase", icon: Presentation, disabled: !selectedGroupId },
  ];

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen">
        {/* ===== Header ===== */}
        <header className="sticky top-0 z-40 border-b border-border/70 glass">
          <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary text-white shadow-lg">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div className="leading-tight">
                <h1 className="font-headline text-lg font-extrabold tracking-tight sm:text-xl">
                  EduStat <span className="text-gradient">Analytics</span>
                </h1>
                <p className="hidden text-[11px] text-muted-foreground sm:block">
                  Asistencia inteligente & análisis numérico
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger className="w-[160px] rounded-full sm:w-[240px]">
                  <SelectValue placeholder="Seleccione un grupo" />
                </SelectTrigger>
                <SelectContent>
                  {groups.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Sin grupos</div>
                  ) : (
                    groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.nombreGrupo}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" className="rounded-full" onClick={() => setView("newGroup")} title="Nuevo grupo">
                <Plus className="h-4 w-4" />
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-5 sm:px-6 sm:py-6">
          {view !== "newGroup" && (
            <nav className="mb-5 inline-flex rounded-full border bg-card p-1 card-shadow">
              {navItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => !item.disabled && setView(item.key)}
                  disabled={item.disabled}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all",
                    view === item.key ? "gradient-primary text-white shadow" : "text-muted-foreground hover:text-foreground",
                    item.disabled && "cursor-not-allowed opacity-40"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              ))}
            </nav>
          )}

          {view === "newGroup" ? (
            <div className="mx-auto max-w-lg py-6 animate-float-up">
              <GroupManager onGroupCreated={() => { fetchGroups(); setView("stats"); }} />
              <Button variant="ghost" className="mt-3 w-full" onClick={() => setView("stats")}>Cancelar</Button>
            </div>
          ) : view === "session" ? (
            <div className="mx-auto max-w-4xl animate-float-up">
              <AttendanceSession
                groupId={selectedGroupId}
                onComplete={() => { loadGroupStatistics(selectedGroupId); setView("stats"); }}
              />
            </div>
          ) : (
            <div className="space-y-5">
              {/* ===== Hero compacto ===== */}
              <section className="overflow-hidden rounded-2xl gradient-primary p-4 text-white card-shadow-lg sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/70">
                        Panel del curso
                      </p>
                      <h2 className="mt-0.5 font-headline text-xl font-extrabold leading-tight sm:text-2xl">
                        {selectedGroupName || "Sin grupo seleccionado"}
                      </h2>
                    </div>
                    {hasData && (
                      <div className="hidden items-center gap-3 border-l border-white/30 pl-4 text-white/90 sm:flex">
                        <Pill icon={<Users className="h-3.5 w-3.5" />} label={`${groupData.studentCount} estudiantes`} />
                        <Pill icon={<CalendarDays className="h-3.5 w-3.5" />} label={`${groupData.totalClasses} clase(s)`} />
                        <Pill icon={<Sigma className="h-3.5 w-3.5" />} label={`${groupData.totalPresent}/${groupData.totalPossible} marcas`} />
                      </div>
                    )}
                  </div>
                  {selectedGroupId && (
                    <Button onClick={() => setView("session")} className="bg-white text-primary hover:bg-white/90" size="sm">
                      <Presentation className="mr-1.5 h-4 w-4" /> Iniciar Clase
                    </Button>
                  )}
                </div>
              </section>

              {hasData ? (
                <>
                  {/* ===== KPIs con tooltips ===== */}
                  <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
                    <KPICard
                      index={0}
                      tone="primary"
                      title="Promedio General"
                      value={`${groupData.mean.toFixed(2)}%`}
                      method="Media Aritmética"
                      subtitle={`Error de redondeo: ${errorSim.toFixed(5)}`}
                      icon={<TrendingUp className="h-5 w-5" />}
                      hint={{
                        formula: "x̄ = (Σ xᵢ) / n",
                        source: `Promedio de las asistencias individuales de los ${groupData.studentCount} estudiantes.`,
                        interpretation: "Indicador global del compromiso del grupo. > 80% = saludable.",
                      }}
                    />
                    <KPICard
                      index={1}
                      tone="accent"
                      title="Desviación Estándar"
                      value={groupData.stdDev.toFixed(2)}
                      method="Análisis de Dispersión"
                      subtitle="Qué tan parejo asiste el grupo"
                      icon={<Sigma className="h-5 w-5" />}
                      hint={{
                        formula: "σ = √( Σ(xᵢ − x̄)² / n )",
                        source: `Distancia promedio de cada estudiante respecto al promedio (${groupData.mean.toFixed(1)}%).`,
                        interpretation: "Bajo = grupo homogéneo. Alto = el promedio esconde casos extremos.",
                      }}
                    />
                    <KPICard
                      index={2}
                      tone="warning"
                      title="Punto Crítico (80%)"
                      value={`${groupData.criticalPoint} clase(s)`}
                      method="Método de Bisección"
                      subtitle="Para alcanzar el umbral mínimo"
                      icon={<AlertTriangle className="h-5 w-5" />}
                      hint={{
                        formula: "f(x) = (P+x)/(T+x) − 0.8 = 0",
                        source: `P=${groupData.totalPresent} presentes, T=${groupData.totalPossible} posibles. Bisección converge en 30 iteraciones.`,
                        interpretation: "Clases extra con asistencia perfecta para subir el grupo al 80%.",
                      }}
                    />
                    <KPICard
                      index={3}
                      tone="destructive"
                      title="Estudiantes en Riesgo"
                      value={groupData.atRiskCount}
                      method="Filtro Estadístico"
                      subtitle={`De ${groupData.studentCount} totales`}
                      icon={<Users className="h-5 w-5" />}
                      hint={{
                        formula: "Riesgo ⇔ asistencia < 80%",
                        source: `Conteo de estudiantes cuya asistencia individual está por debajo del 80%.`,
                        interpretation: "Estos estudiantes podrían perder la asignatura por inasistencia.",
                      }}
                    />
                  </section>

                  {/* ===== Diapositiva de gráficos: 3 en una vista ===== */}
                  <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <ChartCard
                      title="Tendencia Histórica"
                      method="Media por sesión"
                      hint={{
                        formula: "% = (presentes_clase / total_clase) × 100",
                        source: `Cada barra = una clase registrada (${groupData.totalClasses} en total). Se cuentan los 'valor=1' por clase y se divide entre los estudiantes marcados.`,
                        interpretation: "Las barras en ámbar están bajo el umbral del 80%.",
                      }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={groupData.history} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} width={40} />
                          <RTooltip cursor={{ fill: "hsl(var(--muted))" }} formatter={(v: any) => [`${v}%`, "Asistencia"]} />
                          <Bar dataKey="percentage" radius={[6, 6, 0, 0]} maxBarSize={48}>
                            {groupData.history.map((e: any, i: number) => (
                              <Cell key={i} fill={e.percentage < 80 ? "hsl(var(--warning))" : "hsl(var(--primary))"} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard
                      title="Proyección"
                      method="Interpolación de Lagrange"
                      badge={groupData.projections.length > 0 ? `${groupData.projections.length} próximas` : undefined}
                      hint={{
                        formula: "P(x) = Σ yᵢ · Lᵢ(x)",
                        source: `Polinomio que pasa por las ${groupData.totalClasses} clases reales, evaluado en x = n+1, n+2, n+3.`,
                        interpretation: "Línea sólida = histórico. Punteada = proyección estimada de futuras clases.",
                      }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={[...groupData.history.map((h: any) => ({ ...h, hist: h.percentage })),
                                 ...groupData.projections.map((p: any) => ({ ...p, proy: p.percentage }))]}
                          margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} width={40} />
                          <RTooltip formatter={(v: any) => [`${v}%`, ""]} />
                          <Line type="monotone" dataKey="hist" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} name="Histórico" />
                          <Line type="monotone" dataKey="proy" stroke="hsl(var(--accent))" strokeWidth={2.5} strokeDasharray="5 4" dot={{ r: 4 }} name="Proyección" />
                        </LineChart>
                      </ResponsiveContainer>
                      {groupData.projections.length === 0 && (
                        <p className="mt-1 text-[10px] text-muted-foreground">Se necesitan ≥ 2 clases para proyectar.</p>
                      )}
                    </ChartCard>

                    <ChartCard
                      title="Área Acumulada"
                      method="Regla del Trapecio"
                      badge={`${groupData.area.toFixed(1)} u²`}
                      hint={{
                        formula: "A ≈ Σ (h/2)·(yᵢ + yᵢ₊₁)",
                        source: `Integración numérica del historial: se suman las áreas de los trapecios formados entre clases consecutivas.`,
                        interpretation: "Mide el compromiso acumulado del grupo en todo el periodo. Más área = mejor desempeño sostenido.",
                      }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={groupData.history} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.7} />
                              <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0.05} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} width={40} />
                          <RTooltip formatter={(v: any) => [`${v}%`, "Asistencia"]} />
                          <Area type="monotone" dataKey="percentage" stroke="hsl(var(--accent))" strokeWidth={2.5} fill="url(#colorArea)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </ChartCard>
                  </section>

                  {/* Pie informativo */}
                  <section className="rounded-2xl border bg-card px-4 py-2.5 card-shadow">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <HelpCircle className="h-3.5 w-3.5 text-primary" />
                        <span><strong className="text-foreground">Tip:</strong> pasa el cursor sobre cada tarjeta o gráfico para ver cómo se calculan los datos.</span>
                      </div>
                      <span className="font-code">EduStat Analytics · Cálculos en cliente · {groupData.totalClasses} clases analizadas</span>
                    </div>
                  </section>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card py-16 text-center animate-float-up">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                    <CalendarDays className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-headline text-xl font-bold">Aún no hay datos para analizar</h3>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    {groups.length === 0
                      ? "Crea tu primer grupo académico para comenzar."
                      : "Registra la asistencia de al menos una clase para ver las estadísticas."}
                  </p>
                  <Button
                    className="mt-5"
                    onClick={() => setView(groups.length === 0 ? "newGroup" : "session")}
                    disabled={groups.length > 0 && !selectedGroupId}
                  >
                    {groups.length === 0
                      ? <><Plus className="mr-2 h-4 w-4" /> Crear Grupo</>
                      : <><Presentation className="mr-2 h-4 w-4" /> Iniciar Primera Clase</>}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {loading && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center glass">
            <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" />
            <p className="mt-4 font-medium text-muted-foreground">Procesando cálculos numéricos…</p>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

// ───────────────────────── Subcomponentes ─────────────────────────

function Pill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold">
      {icon}
      {label}
    </span>
  );
}

interface ChartCardProps {
  title: string;
  method: string;
  badge?: string;
  hint: { formula: string; source: string; interpretation: string };
  children: React.ReactNode;
}

function ChartCard({ title, method, badge, hint, children }: ChartCardProps) {
  return (
    <Tooltip delayDuration={200}>
      <div className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card p-3 card-shadow transition-all duration-300 hover:-translate-y-0.5 hover:card-shadow-lg sm:p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <h3 className="truncate font-headline text-sm font-bold text-foreground sm:text-base">{title}</h3>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                  aria-label={`Cómo se calcula ${title}`}
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <NumericalExplanation methodName={method} />
            </div>
            <p className="truncate font-code text-[10px] uppercase text-muted-foreground">{method}</p>
          </div>
          {badge && (
            <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">
              {badge}
            </span>
          )}
        </div>
        <div className="min-h-0 flex-1 h-[200px] sm:h-[220px] lg:h-[240px]">
          {children}
        </div>
      </div>
      <TooltipContent
        side="top"
        className="max-w-[300px] space-y-2 rounded-xl border bg-popover p-3 text-popover-foreground shadow-xl"
      >
        <p className="text-xs font-bold uppercase tracking-wider text-primary">{method}</p>
        <div className="rounded-md bg-secondary/70 px-2 py-1.5 font-code text-[11px] text-foreground">
          {hint.formula}
        </div>
        <div className="text-xs leading-relaxed">
          <span className="font-semibold">De dónde sale: </span>
          <span className="text-foreground/90">{hint.source}</span>
        </div>
        <div className="text-xs leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">Qué significa: </span>
          {hint.interpretation}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
