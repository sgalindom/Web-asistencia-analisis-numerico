
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
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, Legend, Cell,
} from "recharts";
import {
  calculateStats,
  findCriticalApprovalPoint,
  lagrangeInterpolation,
  trapezoidRule,
} from "@/lib/numerical-methods";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, BarChart3, Presentation, Plus, TrendingUp, AlertTriangle,
  GraduationCap, Sigma, LineChart as LineIcon, AreaChart as AreaIcon, CalendarDays,
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

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    const q = query(collection(db, "groups"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Group[];
    setGroups(list);
    if (list.length > 0 && !selectedGroupId) {
      setSelectedGroupId(list[0].id);
    }
  };

  useEffect(() => {
    if (selectedGroupId) {
      loadGroupStatistics(selectedGroupId);
    } else {
      setGroupData(null);
    }
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
        const studentAttRecords = attendance.filter((a: any) => a.studentId === s.firebaseId);
        const presentCount = studentAttRecords.filter((a: any) => a.valor === 1).length;
        studentAttendance[s.firebaseId] = (presentCount / totalClasses) * 100;
      });

      const attendanceValues = Object.values(studentAttendance);
      const { mean, stdDev } = calculateStats(attendanceValues);

      const totalPresentRecords = attendance.filter((a: any) => a.valor === 1).length;
      const totalPossibleAttendances = totalClasses * students.length;

      const studentAttendancesNeeded = findCriticalApprovalPoint(totalPresentRecords, totalPossibleAttendances);
      const classesNeeded = students.length > 0 ? Math.ceil(studentAttendancesNeeded / students.length) : 0;

      const atRiskCount = attendanceValues.filter((v) => v < 80).length;

      const history = classes.map((c: any, index: number) => {
        const classAttendance = attendance.filter((a: any) => a.classId === c.id);
        const presentInClass = classAttendance.filter((a: any) => a.valor === 1).length;
        const percentage = classAttendance.length === 0 ? 0 : (presentInClass / classAttendance.length) * 100;
        return {
          name: `Clase ${index + 1}`,
          fecha: c.fecha,
          percentage: Number(percentage.toFixed(2)),
          exact: percentage,
          x: index,
        };
      });

      const points = history.map((h, i) => ({ x: i, y: h.exact }));
      const areaValue = trapezoidRule(points);

      const projections = [];
      if (history.length >= 2) {
        for (let i = 1; i <= 3; i++) {
          const xVal = history.length - 1 + i;
          projections.push({
            name: `Próx. ${i}`,
            percentage: Number(lagrangeInterpolation(points, xVal).toFixed(2)),
            isProjection: true,
          });
        }
      }

      setGroupData({
        mean, stdDev, totalClasses, criticalPoint: classesNeeded,
        atRiskCount, history, projections, area: areaValue,
        studentCount: students.length,
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
    const rounded = Number(avg.toFixed(2));
    return Math.abs(avg - rounded);
  }, [groupData]);

  const selectedGroupName = groups.find((g) => g.id === selectedGroupId)?.nombreGrupo;
  const hasData = groupData && groupData.totalClasses > 0;

  const navItems = [
    { key: "stats" as const, label: "Estadísticas", icon: BarChart3, disabled: false },
    { key: "session" as const, label: "Iniciar Clase", icon: Presentation, disabled: !selectedGroupId },
  ];

  return (
    <div className="min-h-screen">
      {/* ===== Header sticky ===== */}
      <header className="sticky top-0 z-40 border-b border-border/70 glass">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary text-white shadow-lg">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div className="leading-tight">
              <h1 className="font-headline text-lg font-extrabold tracking-tight text-foreground sm:text-xl">
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
                    <SelectItem key={g.id} value={g.id}>
                      {g.nombreGrupo}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              onClick={() => setView("newGroup")}
              title="Nuevo grupo"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 sm:px-6 sm:py-8">
        {/* ===== Navegación segmentada ===== */}
        {view !== "newGroup" && (
          <nav className="mb-6 inline-flex rounded-full border bg-card p-1 card-shadow">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => !item.disabled && setView(item.key)}
                disabled={item.disabled}
                className={cn(
                  "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all",
                  view === item.key
                    ? "gradient-primary text-white shadow"
                    : "text-muted-foreground hover:text-foreground",
                  item.disabled && "cursor-not-allowed opacity-40"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            ))}
          </nav>
        )}

        {/* ===== Contenido ===== */}
        {view === "newGroup" ? (
          <div className="mx-auto max-w-lg py-6 animate-float-up">
            <GroupManager
              onGroupCreated={() => {
                fetchGroups();
                setView("stats");
              }}
            />
            <Button variant="ghost" className="mt-3 w-full" onClick={() => setView("stats")}>
              Cancelar
            </Button>
          </div>
        ) : view === "session" ? (
          <div className="mx-auto max-w-4xl animate-float-up">
            <AttendanceSession
              groupId={selectedGroupId}
              onComplete={() => {
                loadGroupStatistics(selectedGroupId);
                setView("stats");
              }}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Hero */}
            <section className="overflow-hidden rounded-2xl gradient-primary p-6 text-white card-shadow-lg sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-white/70">
                    Panel del curso
                  </p>
                  <h2 className="mt-1 font-headline text-2xl font-extrabold sm:text-3xl">
                    {selectedGroupName || "Ningún grupo seleccionado"}
                  </h2>
                  <p className="mt-1 text-sm text-white/80">
                    {hasData
                      ? `${groupData.studentCount} estudiantes · ${groupData.totalClasses} clase(s) registrada(s)`
                      : "Registra asistencia para comenzar el análisis."}
                  </p>
                </div>
                {selectedGroupId && (
                  <Button
                    onClick={() => setView("session")}
                    className="bg-white text-primary hover:bg-white/90"
                    size="lg"
                  >
                    <Presentation className="mr-2 h-4 w-4" />
                    Iniciar Clase
                  </Button>
                )}
              </div>
            </section>

            {hasData ? (
              <>
                {/* KPIs */}
                <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <KPICard
                    index={0}
                    tone="primary"
                    title="Promedio General"
                    value={`${groupData.mean.toFixed(2)}%`}
                    method="Media Aritmética"
                    subtitle={`Error numérico de redondeo: ${errorSim.toFixed(5)}`}
                    icon={<TrendingUp className="h-5 w-5" />}
                  />
                  <KPICard
                    index={1}
                    tone="accent"
                    title="Desviación Estándar"
                    value={groupData.stdDev.toFixed(2)}
                    method="Análisis de Dispersión"
                    subtitle="Variabilidad de la asistencia entre estudiantes"
                    icon={<Sigma className="h-5 w-5" />}
                  />
                  <KPICard
                    index={2}
                    tone="warning"
                    title="Punto Crítico (80%)"
                    value={`${groupData.criticalPoint} clase(s)`}
                    method="Método de Bisección"
                    subtitle="Clases extra con asistencia perfecta para alcanzar el umbral"
                    icon={<AlertTriangle className="h-5 w-5" />}
                  />
                  <KPICard
                    index={3}
                    tone="destructive"
                    title="Estudiantes en Riesgo"
                    value={groupData.atRiskCount}
                    method="Filtro Estadístico"
                    subtitle={`De un total de ${groupData.studentCount} estudiantes`}
                    icon={<Users className="h-5 w-5" />}
                  />
                </section>

                {/* Gráficos */}
                <Tabs defaultValue="trend" className="space-y-4">
                  <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
                    <TabsTrigger value="trend" className="gap-1.5">
                      <BarChart3 className="h-4 w-4" /> Tendencia
                    </TabsTrigger>
                    <TabsTrigger value="area" className="gap-1.5">
                      <AreaIcon className="h-4 w-4" /> Área Acumulada
                    </TabsTrigger>
                    <TabsTrigger value="projection" className="gap-1.5">
                      <LineIcon className="h-4 w-4" /> Proyección
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="trend">
                    <div className="rounded-2xl border bg-card p-4 card-shadow sm:p-6">
                      <ChartHeader
                        title="Historial de Asistencia por Clase"
                        tag="Porcentaje de asistencia por sesión"
                        method="Media Aritmética"
                      />
                      <div className="h-[300px] w-full sm:h-[360px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={groupData.history} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tickMargin={8} />
                            <YAxis domain={[0, 100]} unit="%" />
                            <Tooltip cursor={{ fill: "hsl(var(--muted))" }} formatter={(v: any) => [`${v}%`, "Asistencia"]} />
                            <Bar dataKey="percentage" radius={[6, 6, 0, 0]} maxBarSize={64}>
                              {groupData.history.map((entry: any, i: number) => (
                                <Cell
                                  key={i}
                                  fill={entry.percentage < 80 ? "hsl(var(--warning))" : "hsl(var(--primary))"}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Las barras en ámbar indican clases por debajo del umbral del 80%.
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="area">
                    <div className="rounded-2xl border bg-card p-4 card-shadow sm:p-6">
                      <ChartHeader
                        title="Área bajo la Curva de Asistencia"
                        tag="Integración numérica del compromiso del grupo"
                        method="Integración Numérica (Trapecio)"
                        badge={`Área total: ${groupData.area.toFixed(2)} u²`}
                      />
                      <div className="h-[300px] w-full sm:h-[360px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={groupData.history} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.7} />
                                <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0.05} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tickMargin={8} />
                            <YAxis domain={[0, 100]} unit="%" />
                            <Tooltip formatter={(v: any) => [`${v}%`, "Asistencia"]} />
                            <Area
                              type="monotone"
                              dataKey="percentage"
                              stroke="hsl(var(--accent))"
                              strokeWidth={2.5}
                              fill="url(#colorArea)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="projection">
                    <div className="rounded-2xl border bg-card p-4 card-shadow sm:p-6">
                      <ChartHeader
                        title="Proyección de Tendencia"
                        tag="Estimación de las próximas 3 clases"
                        method="Interpolación de Lagrange"
                      />
                      <div className="h-[300px] w-full sm:h-[360px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={[...groupData.history, ...groupData.projections]}
                            margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tickMargin={8} />
                            <YAxis domain={[0, 100]} unit="%" />
                            <Tooltip formatter={(v: any) => [`${v}%`, "Asistencia"]} />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="percentage"
                              stroke="hsl(var(--primary))"
                              strokeWidth={2.5}
                              dot={{ r: 3 }}
                              activeDot={{ r: 6 }}
                              name="Asistencia (%)"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      {groupData.projections.length === 0 && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Se necesitan al menos 2 clases registradas para generar proyecciones.
                        </p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card py-16 text-center animate-float-up">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <CalendarDays className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-headline text-xl font-bold text-foreground">
                  Aún no hay datos para analizar
                </h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  {groups.length === 0
                    ? "Crea tu primer grupo académico para comenzar."
                    : "Registra la asistencia de al menos una clase para ver las estadísticas y los análisis numéricos."}
                </p>
                <Button
                  className="mt-5"
                  onClick={() => setView(groups.length === 0 ? "newGroup" : "session")}
                  disabled={groups.length > 0 && !selectedGroupId}
                >
                  {groups.length === 0 ? (
                    <><Plus className="mr-2 h-4 w-4" /> Crear Grupo</>
                  ) : (
                    <><Presentation className="mr-2 h-4 w-4" /> Iniciar Primera Clase</>
                  )}
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
  );
}

function ChartHeader({
  title,
  tag,
  method,
  badge,
}: {
  title: string;
  tag: string;
  method: string;
  badge?: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
      <div className="flex items-center gap-1">
        <div>
          <h3 className="font-headline text-base font-bold text-foreground sm:text-lg">{title}</h3>
          <p className="text-xs text-muted-foreground">{tag}</p>
        </div>
        <NumericalExplanation methodName={method} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {badge && (
          <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
            {badge}
          </span>
        )}
        <span className="rounded-full bg-secondary px-2.5 py-1 font-code text-[10px] uppercase text-secondary-foreground">
          {method}
        </span>
      </div>
    </div>
  );
}
