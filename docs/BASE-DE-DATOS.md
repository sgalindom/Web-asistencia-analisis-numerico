# Base de Datos — EduStat Analytics

Documento informativo sobre la estructura y el funcionamiento de la base de datos de la aplicación de asistencia y análisis numérico.

---

## 1. Tecnología

La aplicación utiliza **Cloud Firestore** (Firebase), una base de datos **NoSQL orientada a documentos**. A diferencia de una base de datos relacional con tablas y filas, Firestore organiza la información en:

- **Colecciones**: contenedores de documentos (equivalente a una "tabla").
- **Documentos**: registros individuales con campos (equivalente a una "fila").
- **Subcolecciones**: colecciones anidadas dentro de un documento, lo que permite jerarquías.

La conexión se configura en [`src/lib/firebase.ts`](../src/lib/firebase.ts).

---

## 2. Modelo de datos

La base de datos se organiza de forma **jerárquica**: cada grupo académico contiene sus propios estudiantes, clases y registros de asistencia como subcolecciones.

```
groups (colección)
└── {groupId} (documento)  ──────────────  Grupo / curso
    ├── students (subcolección)
    │   └── {studentId} (documento)  ────  Estudiante
    ├── classes (subcolección)
    │   └── {classId} (documento)  ──────  Sesión de clase
    └── attendance (subcolección)
        └── {attendanceId} (documento)  ──  Registro de asistencia
```

Esta estructura garantiza que los datos de cada grupo estén **aislados**: al eliminar o consultar un grupo, sus estudiantes y registros viajan con él.

---

## 3. Entidades (colecciones)

### 3.1 `groups` — Grupos académicos

Ruta: `/groups/{groupId}`

| Campo         | Tipo      | Descripción                                   |
|---------------|-----------|-----------------------------------------------|
| `nombreGrupo` | `string`  | Nombre del curso (ej: "Análisis Numérico A").  |
| `createdAt`   | `string`  | Fecha de creación en formato ISO 8601.         |

> El `groupId` lo genera Firestore automáticamente.

### 3.2 `students` — Estudiantes

Ruta: `/groups/{groupId}/students/{studentId}`

| Campo     | Tipo     | Descripción                                       |
|-----------|----------|---------------------------------------------------|
| `id`      | `string` | Identificador del estudiante (proviene del Excel).|
| `nombre`  | `string` | Nombre completo del estudiante.                   |
| `carrera` | `string` | Carrera o programa académico.                     |
| `edad`    | `number` | Edad del estudiante.                              |

> **Importante:** el `studentId` (ID del documento de Firestore) es **distinto** del campo `id`
> (el código de matrícula del Excel). Toda la lógica de asistencia usa el `studentId` de
> Firestore (`firebaseId`) para evitar conflictos por IDs repetidos entre grupos.

### 3.3 `classes` — Sesiones de clase

Ruta: `/groups/{groupId}/classes/{classId}`

| Campo   | Tipo     | Descripción                                  |
|---------|----------|----------------------------------------------|
| `fecha` | `string` | Fecha de la sesión en formato `YYYY-MM-DD`.  |

> Se crea un documento nuevo cada vez que el profesor finaliza un "Llamado a Lista".

### 3.4 `attendance` — Registros de asistencia

Ruta: `/groups/{groupId}/attendance/{attendanceId}`

| Campo       | Tipo     | Descripción                                            |
|-------------|----------|--------------------------------------------------------|
| `classId`   | `string` | Referencia al documento de la clase.                   |
| `studentId` | `string` | Referencia al documento del estudiante (`firebaseId`). |
| `fecha`     | `string` | Fecha del registro (`YYYY-MM-DD`).                     |
| `valor`     | `number` | **1** = Presente, **0** = Ausente.                     |
| `estado`    | `string` | `"Presente"` o `"Ausente"` (versión legible).          |

> Cada registro vincula **un estudiante con una clase**. Si un grupo tiene 30 estudiantes y
> 10 clases, existirán hasta 300 documentos de asistencia. El campo `valor` (0/1) es la base
> numérica sobre la que operan todos los métodos de análisis.

---

## 4. Operaciones principales

### 4.1 Crear un grupo e importar estudiantes
Componente: [`GroupManager.tsx`](../src/components/GroupManager.tsx)

1. El profesor sube un archivo Excel (`.xlsx`) con las columnas: `id`, `nombre`, `carrera`, `edad`.
2. La librería `xlsx` convierte la hoja en JSON.
3. Se **valida** que no falten campos obligatorios ni haya IDs duplicados.
4. Se crea el documento del grupo y, mediante un **batch write** (escritura por lotes), se
   insertan todos los estudiantes en una sola operación atómica.

### 4.2 Tomar asistencia
Componente: [`AttendanceSession.tsx`](../src/components/AttendanceSession.tsx)

1. Se cargan los estudiantes del grupo seleccionado.
2. El profesor marca a cada estudiante como Presente/Ausente.
3. Al finalizar se crea **un documento en `classes`** (la sesión) y se escriben **N documentos
   en `attendance`** (uno por estudiante) usando un batch write.
4. No se permite guardar hasta que **todos** los estudiantes estén marcados.

### 4.3 Calcular estadísticas
Componente: [`Dashboard.tsx`](../src/components/Dashboard.tsx)

Al seleccionar un grupo, la app:
1. Lee las tres subcolecciones (`students`, `classes`, `attendance`).
2. Calcula el porcentaje de asistencia de cada estudiante.
3. Aplica los métodos de análisis numérico (ver [`ANALISIS-NUMERICO.md`](./ANALISIS-NUMERICO.md)).
4. Genera el historial y las proyecciones para los gráficos.

---

## 5. Patrones técnicos usados

- **Batch writes**: las inserciones masivas (estudiantes, asistencia) se hacen en lotes para
  que sean **atómicas** — o se guarda todo, o no se guarda nada.
- **Subcolecciones**: aíslan los datos por grupo y evitan colecciones gigantes.
- **Consultas ordenadas**: las clases se leen con `orderBy("fecha")` para mantener la
  cronología correcta en los gráficos.
- **Cálculo en el cliente**: las estadísticas se computan en el navegador a partir de los
  datos crudos, manteniendo la base de datos simple (solo almacena hechos, no resultados).

---

## 6. Diagrama de relaciones

```
  ┌─────────────┐
  │   Group     │  1 grupo
  └──────┬──────┘
         │ contiene
   ┌─────┴───────────────┬────────────────────┐
   ▼                     ▼                    ▼
┌─────────┐        ┌──────────┐        ┌──────────────┐
│ Student │        │  Class   │        │  Attendance  │
│  (N)    │        │   (M)    │        │   (N × M)    │
└────┬────┘        └────┬─────┘        └──────┬───────┘
     │                  │                     │
     │   studentId      │      classId        │
     └──────────────────┴─────────────────────┘
         Attendance referencia a Student y Class
```

Un grupo de **N estudiantes** y **M clases** produce hasta **N × M** registros de asistencia.
