
"use client";

import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { collection, addDoc, doc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { FileUp, PlusCircle, Loader2, FileSpreadsheet, CheckCircle2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ExcelStudent {
  id: string;
  nombre: string;
  carrera: string;
  edad: number;
}

export function GroupManager({ onGroupCreated }: { onGroupCreated: () => void }) {
  const [groupName, setGroupName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const pickFile = (f: File | null | undefined) => {
    if (!f) return;
    const ok = /\.(xlsx|xls)$/i.test(f.name);
    if (!ok) {
      toast({ variant: "destructive", title: "Formato inválido", description: "Sube un archivo .xlsx o .xls" });
      return;
    }
    setFile(f);
  };

  const validateExcel = (data: any[]): ExcelStudent[] => {
    if (data.length === 0) throw new Error("El archivo Excel está vacío.");
    const students: ExcelStudent[] = [];
    const ids = new Set();
    for (const row of data) {
      if (!row.id || !row.nombre || !row.carrera || !row.edad) {
        throw new Error("Faltan campos obligatorios en el Excel (id, nombre, carrera, edad).");
      }
      if (ids.has(String(row.id))) {
        throw new Error(`ID duplicado detectado: ${row.id}`);
      }
      ids.add(String(row.id));
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
      toast({ variant: "destructive", title: "Campos incompletos", description: "Ingrese un nombre y suba el Excel." });
      return;
    }
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
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

          toast({
            title: "Grupo creado",
            description: `"${groupName}" se creó con ${validatedStudents.length} estudiantes.`,
          });
          setGroupName("");
          setFile(null);
          onGroupCreated();
        } catch (err: any) {
          toast({ variant: "destructive", title: "Error en el Excel", description: err.message });
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
    <Card className="overflow-hidden rounded-2xl border card-shadow">
      <div className="gradient-primary flex items-center gap-3 p-5 text-white sm:p-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
          <PlusCircle className="h-6 w-6" />
        </div>
        <div>
          <h2 className="font-headline text-xl font-bold">Crear Nuevo Grupo</h2>
          <p className="text-xs text-white/80">Registra un curso e importa su lista de estudiantes</p>
        </div>
      </div>

      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="space-y-2">
          <Label htmlFor="groupName">Nombre del grupo</Label>
          <Input
            id="groupName"
            placeholder="Ej: Análisis Numérico — Grupo A 2026"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Lista de estudiantes (Excel)</Label>
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              pickFile(e.dataTransfer.files?.[0]);
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-secondary/50",
              file && "border-accent/50 bg-accent/5"
            )}
          >
            {file ? (
              <div className="flex w-full items-center gap-3">
                <FileSpreadsheet className="h-9 w-9 shrink-0 text-accent" />
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-accent">Archivo listo para procesar</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <FileUp className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  Arrastra tu archivo aquí o haz clic para seleccionar
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">Formatos: .xlsx, .xls</p>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="font-medium">Columnas requeridas:</span>
            {["id", "nombre", "carrera", "edad"].map((c) => (
              <span key={c} className="rounded-md bg-secondary px-1.5 py-0.5 font-code text-[10px]">
                {c}
              </span>
            ))}
          </div>
        </div>

        <Button className="w-full" size="lg" onClick={createGroup} disabled={loading || !groupName || !file}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="mr-2 h-4 w-4" />
          )}
          Procesar y Guardar Grupo
        </Button>
      </CardContent>
    </Card>
  );
}
