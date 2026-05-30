
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
  LineChart, Line, AreaChart, Area, Cell, Legend, ReferenceLine,
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
  GraduationCap, Sigma, CalendarDays, HelpCircle, Activity, LineChart as LineIcon, AreaChart as AreaIcon,
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
          name: `Clase ${index + 1}`,
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
            name: `Próx ${i}`,
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

  const projectionData = useMemo(() => {
    if (!groupData) return [];
    return [
      ...groupData.history.map((h: any) => ({ name: h.name, hist: h.percentage })),
      // bridge — repetir el último real como punto de continuidad de la proyección
      ...(groupData.history.length > 0 && groupData.projections.length > 0
        ? [{ name: groupData.history[groupData.history.length - 1].name, proy: groupData.history[groupData.history.length - 1].percentage, hist: groupData.history[groupData.history.length - 1].percentage, _bridge: true }]
        : []),
      ...groupData.projections.map((p: any) => ({ name: p.name, proy: p.percentage })),
    ];
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
              {/* ===== Hero compacto: una sola línea ===== */}
              <section className="overflow-hidden rounded-2xl gradient-primary p-4 text-white card-shadow-lg sm:px-5 sm:py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/70">
                        Panel del curso
                      </p>
                      <h2 className="mt-0.5 font-headline text-lg font-extrabold leading-tight sm:text-xl">
                        {selectedGroupName || "Sin grupo seleccionado"}
                      </h2>
                    </div>
                    {hasData && (
                      <div className="flex flex-wrap items-center gap-2 border-l border-white/30 pl-4 text-white/90">
                        <Pill icon={<Users className="h-3.5 w-3.5" />} label={`${groupData.studentCount} estudiantes`} />
                        <Pill icon={<CalendarDays className="h-3.5 w-3.5" />} label={`${groupData.totalClasses} clases`} />
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
                  {/* ===== KPIs (compactos) ===== */}
                  <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <KPICard
                      index={0} tone="primary"
                      title="Promedio General"
                      value={`${groupData.mean.toFixed(2)}%`}
                      method="Media Aritmética"
                      subtitle={`ε redondeo: ${errorSim.toFixed(5)}`}
                      icon={<TrendingUp className="h-5 w-5" />}
                      hint={{
                        formula: "x̄ = (Σ xᵢ) / n",
                        source: `Promedio de las asistencias individuales de los ${groupData.studentCount} estudiantes.`,
                        interpretation: "Indicador global del grupo. > 80% = saludable.",
                      }}
                    />
                    <KPICard
                      index={1} tone="accent"
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
                      index={2} tone="warning"
                      title="Punto Crítico"
                      value={`${groupData.criticalPoint} clase(s)`}
                      method="Método de Bisección"
                      subtitle="Para alcanzar el 80%"
                      icon={<AlertTriangle className="h-5 w-5" />}
                      hint={{
                        formula: "f(x) = (P+x)/(T+x) − 0.8 = 0",
                        source: `P=${groupData.totalPresent} presentes, T=${groupData.totalPossible} posibles. Bisección converge en 30 iteraciones.`,
                        interpretation: "Clases extra con asistencia perfecta para subir el grupo al 80%.",
                      }}
                    />
                    <KPICard
                      index={3} tone="destructive"
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

                  {/* =============================================================
                       GRÁFICOS — PROTAGONISTAS DE LA VISTA
                       ============================================================= */}

                  {/* Tendencia histórica — GRÁFICO PRINCIPAL FULL WIDTH */}
                  <ChartCard
                    title="Tendencia Histórica de Asistencia"
                    subtitle="Una barra por cada clase registrada. Las barras en ámbar están por debajo del umbral mínimo del 80%."
                    method="Media por sesión"
                    icon={<BarChart3 className="h-4 w-4" />}
                    chartHeight={350}
                    hint={{
                      formula: "% clase = (presentes_clase / total_marcados) × 100",
                      source: `Se recorren las ${groupData.totalClasses} clases registradas en Firestore. Por cada una se cuentan los 'valor=1' y se divide entre los estudiantes marcados.`,
                      interpretation: "Permite detectar caídas en sesiones específicas y comparar el desempeño clase a clase.",
                    }}
                  >
                    <BarChart data={groupData.history} margin={{ top: 12, right: 16, left: -8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="barGradHigh" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                        </linearGradient>
                        <linearGradient id="barGradLow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--warning))" stopOpacity={1} />
                          <stop offset="100%" stopColor="hsl(var(--warning))" stopOpacity={0.6} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
                      <ReferenceLine y={80} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ value: "Umbral 80%", position: "insideTopRight", fill: "hsl(var(--destructive))", fontSize: 11 }} />
                      <RTooltip cursor={{ fill: "hsl(var(--muted))" }}
                        formatter={(v: any) => [`${v}%`, "Asistencia"]}
                        labelFormatter={(label: string, items: any[]) => {
                          const it = items?.[0]?.payload;
                          return it?.fecha ? `${label} · ${it.fecha}` : label;
                        }}
                      />
                      <Bar dataKey="percentage" radius={[8, 8, 0, 0]} maxBarSize={70}>
                        {groupData.history.map((e: any, i: number) => (
                          <Cell key={i} fill={e.percentage < 80 ? "url(#barGradLow)" : "url(#barGradHigh)"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartCard>

                  {/* Proyección + Área lado a lado (cada uno protagonista en su columna) */}
                  <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    <ChartCard
                      title="Proyección de Tendencia"
                      subtitle="Polinomio de Lagrange ajustado al histórico, evaluado en las 3 próximas clases."
                      method="Interpolación de Lagrange"
                      icon={<LineIcon className="h-4 w-4" />}
                      chartHeight={320}
                      hint={{
                        formula: "P(x) = Σ yᵢ · Lᵢ(x),    Lᵢ(x) = ∏ (x − xⱼ)/(xᵢ − xⱼ)",
                        source: `Polinomio interpolante por los ${groupData.totalClasses} puntos reales del histórico, evaluado en x = n+1, n+2, n+3.`,
                        interpretation: "Línea sólida = histórico real. Punteada = estimación de las próximas 3 clases.",
                      }}
                    >
                      <LineChart data={projectionData} margin={{ top: 12, right: 16, left: -8, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
                        <ReferenceLine y={80} stroke="hsl(var(--destructive))" strokeDasharray="4 4" />
                        <RTooltip formatter={(v: any, name: any) => [`${v}%`, name === "hist" ? "Histórico" : "Proyección"]} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Line type="monotone" dataKey="hist" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7 }} name="Histórico" connectNulls />
                        <Line type="monotone" dataKey="proy" stroke="hsl(var(--accent))" strokeWidth={3} strokeDasharray="6 4" dot={{ r: 5, fill: "hsl(var(--accent))" }} activeDot={{ r: 7 }} name="Proyección" connectNulls />
                      </LineChart>
                    </ChartCard>

                    <ChartCard
                      title="Área Acumulada bajo la Curva"
                      subtitle={`Integración numérica del histórico. Área total = ${groupData.area.toFixed(2)} u² (compromiso acumulado).`}
                      method="Regla del Trapecio"
                      icon={<AreaIcon className="h-4 w-4" />}
                      chartHeight={320}
                      badge={`${groupData.area.toFixed(1)} u²`}
                      hint={{
                        formula: "A ≈ Σ (h/2) · (yᵢ + yᵢ₊₁)",
                        source: `Suma de las áreas de los ${groupData.history.length - 1} trapecios formados entre clases consecutivas.`,
                        interpretation: "Métrica integral del compromiso del grupo. A mayor área, mejor desempeño sostenido durante el periodo.",
                      }}
                    >
                      <AreaChart data={groupData.history} margin={{ top: 12, right: 16, left: -8, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
                        <ReferenceLine y={80} stroke="hsl(var(--destructive))" strokeDasharray="4 4" />
                        <RTooltip formatter={(v: any) => [`${v}%`, "Asistencia"]} />
                        <Area type="monotone" dataKey="percentage" stroke="hsl(var(--accent))" strokeWidth={3} fill="url(#colorArea)" />
                      </AreaChart>
                    </ChartCard>
                  </section>

                  {/* Pie informativo */}
                  <section className="rounded-2xl border bg-card px-4 py-2.5 card-shadow">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Activity className="h-3.5 w-3.5 text-primary" />
                        <span><strong className="text-foreground">Tip:</strong> pasa el cursor sobre cada KPI o gráfico para ver cómo se calculan los datos.</span>
                      </div>
                      <span className="font-code">EduStat Analytics · {groupData.totalClasses} clases · {groupData.studentCount} estudiantes · {groupData.totalPresent}/{groupData.totalPossible} marcas</span>
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
  subtitle?: string;
  method: string;
  badge?: string;
  icon?: React.ReactNode;
  chartHeight?: number;
  hint: { formula: string; source: string; interpretation: string };
  children: React.ReactElement;
}

function ChartCard({
  title, subtitle, method, badge, icon, chartHeight = 320, hint, children,
}: ChartCardProps) {
  return (
    <Tooltip delayDuration={200}>
      <div className="group flex flex-col overflow-hidden rounded-2xl border bg-card card-shadow transition-all duration-300 hover:-translate-y-0.5 hover:card-shadow-lg">
        {/* Encabezado del gráfico */}
        <div className="flex flex-wrap items-start justify-between gap-2 border-b bg-secondary/30 px-4 py-3 sm:px-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {icon && (
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {icon}
                </div>
              )}
              <h3 className="font-headline text-base font-bold text-foreground sm:text-lg">{title}</h3>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                  aria-label={`Cómo se calcula ${title}`}
                >
                  <HelpCircle className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <NumericalExplanation methodName={method} />
            </div>
            {subtitle && <p className="mt-0.5 text-xs leading-snug text-muted-foreground sm:text-[13px]">{subtitle}</p>}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {badge && (
              <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-bold text-accent">
                {badge}
              </span>
            )}
            <span className="rounded-full bg-secondary px-2.5 py-0.5 font-code text-[10px] uppercase tracking-wide text-secondary-foreground">
              {method}
            </span>
          </div>
        </div>

        {/* Cuerpo del gráfico (protagonista) */}
        <div className="p-3 sm:p-4">
          <div style={{ height: chartHeight }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              {children}
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <TooltipContent
        side="top"
        className="max-w-[340px] space-y-2 rounded-xl border bg-popover p-3 text-popover-foreground shadow-xl"
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
