
"use client";

import React, { useState, useEffect } from "react";
import { collection, getDocs, addDoc, query, writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Save, Calendar, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
        const list: Student[] = snapshot.docs.map(doc => ({
          firebaseId: doc.id,
          ...doc.data()
        })) as Student[];
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
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const isComplete = students.length > 0 && Object.keys(attendance).length === students.length;

  const saveAttendance = async () => {
    if (!isComplete || !groupId) return;
    setSaving(true);
    try {
      const fecha = new Date().toISOString().split('T')[0];
      
      const classRef = await addDoc(collection(db, "groups", groupId, "classes"), { fecha });

      const batch = writeBatch(db);
      Object.entries(attendance).forEach(([studentId, status]) => {
        const attRef = doc(collection(db, "groups", groupId, "attendance"));
        batch.set(attRef, {
          classId: classRef.id,
          studentId,
          fecha,
          valor: status === "Presente" ? 1 : 0,
          estado: status
        });
      });

      await batch.commit();
      toast({ title: "Asistencia guardada", description: "La clase ha sido registrada exitosamente" });
      onComplete();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error al guardar", description: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (!groupId) return <div className="text-center p-8">Seleccione un grupo para iniciar la clase.</div>;
  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl">Llamado a Lista</CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <Calendar className="w-4 h-4" />
            Fecha: {new Date().toLocaleDateString()}
          </div>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          {Object.keys(attendance).length} / {students.length} Marcados
        </Badge>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre del Estudiante</TableHead>
              <TableHead className="text-right">Asistencia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student.firebaseId}>
                <TableCell className="font-medium">
                  <div>{student.nombre}</div>
                  <div className="text-xs text-muted-foreground">{student.carrera}</div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant={attendance[student.firebaseId] === "Presente" ? "default" : "outline"}
                      className={attendance[student.firebaseId] === "Presente" ? "bg-accent hover:bg-accent/90" : ""}
                      onClick={() => markStatus(student.firebaseId, "Presente")}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Presente
                    </Button>
                    <Button
                      size="sm"
                      variant={attendance[student.firebaseId] === "Ausente" ? "destructive" : "outline"}
                      onClick={() => markStatus(student.firebaseId, "Ausente")}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Ausente
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter className="bg-muted/50 py-4 flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {!isComplete ? "Debe marcar a todos los estudiantes antes de guardar." : "Listo para guardar el registro de hoy."}
        </p>
        <Button 
          onClick={saveAttendance} 
          disabled={!isComplete || saving}
          className="bg-primary hover:bg-primary/90"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Finalizar y Guardar Clase
        </Button>
      </CardFooter>
    </Card>
  );
}
