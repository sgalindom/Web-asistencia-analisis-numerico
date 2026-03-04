
"use client";

import React, { useState } from "react";
import * as XLSX from "xlsx";
import { collection, addDoc, doc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FileUp, Users, PlusCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExcelStudent {
  id: string | number;
  nombre: string;
  carrera: string;
  edad: number;
}

export function GroupManager({ onGroupCreated }: { onGroupCreated: () => void }) {
  const [groupName, setGroupName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const validateExcel = (data: any[]): ExcelStudent[] => {
    const students: ExcelStudent[] = [];
    const ids = new Set();

    for (const row of data) {
      if (!row.id || !row.nombre || !row.carrera || !row.edad) {
        throw new Error("Faltan campos obligatorios en el Excel (id, nombre, carrera, edad)");
      }
      if (ids.has(row.id)) {
        throw new Error(`ID duplicado detectado: ${row.id}`);
      }
      ids.add(row.id);
      students.push({
        id: String(row.id),
        nombre: String(row.nombre),
        carrera: String(row.carrera),
        edad: Number(row.edad),
      });
    }
    return students;
  };

  const createGroup = async () => {
    if (!groupName || !file) {
      toast({ variant: "destructive", title: "Campos incompletos", description: "Por favor ingrese nombre y suba el Excel" });
      return;
    }

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(sheet);
          
          const validatedStudents = validateExcel(json);

          const groupRef = await addDoc(collection(db, "groups"), {
            nombreGrupo: groupName,
            createdAt: new Date().toISOString(),
          });

          const batch = writeBatch(db);
          validatedStudents.forEach((student) => {
            const studentRef = doc(collection(db, "groups", groupRef.id, "students"));
            batch.set(studentRef, student);
          });

          await batch.commit();
          
          toast({ title: "Grupo creado", description: `Se ha creado el grupo ${groupName} con ${validatedStudents.length} estudiantes` });
          setGroupName("");
          setFile(null);
          onGroupCreated();
        } catch (err: any) {
          toast({ variant: "destructive", title: "Error en Excel", description: err.message });
        } finally {
          setLoading(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-lg border-2 border-primary/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <PlusCircle className="w-5 h-5" />
          Crear Nuevo Grupo Académico
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="groupName">Nombre del Grupo</Label>
          <Input 
            id="groupName" 
            placeholder="Ej: Ingeniería de Sistemas - 2024" 
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="excel">Subir Lista de Estudiantes (Excel)</Label>
          <div className="flex items-center gap-2">
            <Input 
              id="excel" 
              type="file" 
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
          </div>
          <p className="text-xs text-muted-foreground">Formato requerido: id, nombre, carrera, edad</p>
        </div>
        <Button 
          className="w-full" 
          onClick={createGroup} 
          disabled={loading || !groupName || !file}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileUp className="w-4 h-4 mr-2" />}
          Procesar y Guardar Grupo
        </Button>
      </CardContent>
    </Card>
  );
}
