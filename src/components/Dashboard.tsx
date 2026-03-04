
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { KPICard } from "./KPICard";
import { AttendanceSession } from "./AttendanceSession";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, Legend 
} from "recharts";
import { 
  calculateStats, 
  findCriticalApprovalPoint, 
  lagrangeInterpolation, 
  trapezoidRule 
} from "@/lib/numerical-methods";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, BarChart3, Presentation, Plus, TrendingUp, AlertTriangle } from "lucide-react";
import { GroupManager } from "./GroupManager";

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
    const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Group[];
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
      const students = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const classesSnap = await getDocs(query(collection(db, "groups", id, "classes"), orderBy("fecha")));
      const classes = classesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const attendanceSnap = await getDocs(collection(db, "groups", id, "attendance"));
      const attendance = attendanceSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const totalClasses = classes.length;
      const studentAttendance: Record<string, number> = {};
      students.forEach(s => {
        const presentCount = attendance.filter((a: any) => a.studentId === s.id && a.valor === 1).length;
        studentAttendance[s.id] = totalClasses === 0 ? 0 : (presentCount / totalClasses) * 100;
      });

      const attendanceValues = Object.values(studentAttendance);
      const { mean, stdDev } = calculateStats(attendanceValues);
      const totalPresent = attendance.filter((a: any) => a.valor === 1).length;
      const criticalPoint = findCriticalApprovalPoint(totalPresent, totalClasses * students.length);
      const atRiskCount = attendanceValues.filter(v => v < 80).length;

      const history = classes.map((c: any, index: number) => {
        const classAttendance = attendance.filter((a: any) => a.classId === c.id);
        const presentInClass = classAttendance.filter((a: any) => a.valor === 1).length;
        const percentage = classAttendance.length === 0 ? 0 : (presentInClass / classAttendance.length) * 100;
        return { 
          name: `C${index + 1}`, 
          fecha: c.fecha,
          percentage: Number(percentage.toFixed(2)),
          exact: percentage
        };
      });

      const points = history.map((h, i) => ({ x: i, y: h.exact }));
      const area = trapezoidRule(points);
      
      const projections = [];
      if (history.length > 2) {
        for (let i = 0; i < 5; i++) {
          const xVal = history.length + i;
          projections.push({
            name: `P${i + 1}`,
            percentage: lagrangeInterpolation(points, xVal)
          });
        }
      }

      setGroupData({
        mean,
        stdDev,
        totalClasses,
        criticalPoint,
        atRiskCount,
        history,
        projections,
        area,
        studentCount: students.length
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

  return (
    <div className="container mx-auto p-6 space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary font-headline">EduStat Analytics</h1>
          <p className="text-muted-foreground">Dashboard Académico e Ingeniería de Datos</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
            <SelectTrigger className="w-[250px] bg-white border-primary/20">
              <SelectValue placeholder="Seleccione un grupo" />
            </SelectTrigger>
            <SelectContent>
              {groups.map(g => (
                <SelectItem key={g.id} value={g.id}>{g.nombreGrupo}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => setView("newGroup")} title="Nuevo Grupo">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <nav className="flex gap-2 bg-secondary/30 p-1 rounded-lg w-fit">
        <Button 
          variant={view === "stats" ? "default" : "ghost"} 
          onClick={() => setView("stats")}
          className="gap-2"
        >
          <BarChart3 className="w-4 h-4" /> Estadísticas
        </Button>
        <Button 
          variant={view === "session" ? "default" : "ghost"} 
          onClick={() => setView("session")}
          className="gap-2"
          disabled={!selectedGroupId}
        >
          <Presentation className="w-4 h-4" /> Iniciar Clase
        </Button>
      </nav>

      <main>
        {view === "newGroup" ? (
          <div className="max-w-md mx-auto py-12">
            <GroupManager onGroupCreated={() => { fetchGroups(); setView("stats"); }} />
            <Button variant="ghost" className="mt-4 w-full" onClick={() => setView("stats")}>Cancelar</Button>
          </div>
        ) : view === "session" ? (
          <div className="max-w-4xl mx-auto">
            <AttendanceSession groupId={selectedGroupId} onComplete={() => { loadGroupStatistics(selectedGroupId); setView("stats"); }} />
          </div>
        ) : (
          <div className="space-y-8">
            {groupData && (
              <>
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <KPICard 
                    title="Promedio General" 
                    value={`${groupData.mean.toFixed(2)}%`}
                    method="Media Aritmética"
                    subtitle={`Error numérico: ${errorSim.toFixed(5)}`}
                    icon={<TrendingUp className="w-4 h-4 text-primary" />}
                  />
                  <KPICard 
                    title="Desviación Estándar" 
                    value={groupData.stdDev.toFixed(2)}
                    method="Análisis de Dispersión"
                    icon={<BarChart3 className="w-4 h-4 text-primary" />}
                  />
                  <KPICard 
                    title="Punto Crítico (80%)" 
                    value={`${groupData.criticalPoint} clases`}
                    method="Método de Bisección"
                    subtitle="Clases extra necesarias"
                    icon={<AlertTriangle className="w-4 h-4 text-destructive" />}
                  />
                  <KPICard 
                    title="Estudiantes en Riesgo" 
                    value={groupData.atRiskCount}
                    method="Filtro Estadístico"
                    subtitle={`De un total de ${groupData.studentCount}`}
                    icon={<Users className="w-4 h-4 text-destructive" />}
                  />
                </section>

                <Tabs defaultValue="trend" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="trend">Tendencia Histórica</TabsTrigger>
                    <TabsTrigger value="area">Área Acumulada</TabsTrigger>
                    <TabsTrigger value="projection">Proyección (Lagrange)</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="trend" className="h-[400px] bg-white p-6 rounded-xl border">
                    <div className="mb-4 flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Historial de Clases</h3>
                      <p className="text-xs text-muted-foreground font-mono">Indicador: Porcentaje de Asistencia por Fecha</p>
                    </div>
                    <ResponsiveContainer width="100%" height="90%">
                      <BarChart data={groupData.history}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Bar dataKey="percentage" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </TabsContent>

                  <TabsContent value="area" className="h-[400px] bg-white p-6 rounded-xl border">
                    <div className="mb-4 flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-semibold">Área bajo la Curva de Asistencia</h3>
                        <p className="text-sm text-accent font-medium">Área Total: {groupData.area.toFixed(2)} u²</p>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">Método: Integración Numérica (Trapecio)</p>
                    </div>
                    <ResponsiveContainer width="100%" height="80%">
                      <AreaChart data={groupData.history}>
                        <defs>
                          <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Area type="monotone" dataKey="percentage" stroke="hsl(var(--accent))" fillOpacity={1} fill="url(#colorArea)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </TabsContent>

                  <TabsContent value="projection" className="h-[400px] bg-white p-6 rounded-xl border">
                    <div className="mb-4 flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Proyección de Tendencia</h3>
                      <p className="text-xs text-muted-foreground font-mono">Método: Interpolación de Lagrange</p>
                    </div>
                    <ResponsiveContainer width="100%" height="90%">
                      <LineChart data={[...groupData.history, ...groupData.projections]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="percentage" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }} name="Asistencia (%)" />
                      </LineChart>
                    </ResponsiveContainer>
                  </TabsContent>
                </Tabs>
              </>
            )}
            {!groupData && !loading && (
              <div className="flex flex-col items-center justify-center py-20 bg-white/50 border rounded-xl border-dashed">
                <Users className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium">No hay datos disponibles</h3>
                <p className="text-muted-foreground">Seleccione un grupo o cree uno nuevo para comenzar.</p>
              </div>
            )}
            {loading && (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="mt-4 text-muted-foreground">Procesando cálculos estadísticos...</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
