# EduStat Analytics

**Plataforma académica para la toma de asistencia y el análisis numérico aplicado.**

EduStat Analytics es una aplicación web que combina la gestión de asistencia universitaria con
un panel de **análisis numérico** que aplica métodos matemáticos clásicos (bisección,
interpolación de Lagrange, regla del trapecio) sobre datos reales de asistencia para entregar
métricas útiles al profesor: promedio, dispersión, punto crítico, proyección de tendencia y
área acumulada.

> **Proyecto académico** — Asignatura de Análisis Numérico.

---

## Tabla de contenidos

1. [Objetivos del proyecto](#1-objetivos-del-proyecto)
2. [Características](#2-características)
3. [Stack tecnológico](#3-stack-tecnológico)
4. [Arquitectura general](#4-arquitectura-general)
5. [Estructura del código fuente](#5-estructura-del-código-fuente)
6. [Base de datos](#6-base-de-datos)
7. [Métodos de análisis numérico aplicados](#7-métodos-de-análisis-numérico-aplicados)
8. [Código fuente comentado de los métodos](#8-código-fuente-comentado-de-los-métodos)
9. [Flujo de uso](#9-flujo-de-uso)
10. [Instalación y ejecución](#10-instalación-y-ejecución)
11. [Despliegue](#11-despliegue)
12. [Documentación adicional](#12-documentación-adicional)
13. [Autor](#13-autor)

---

## 1. Objetivos del proyecto

### Objetivo general
Construir una aplicación web que **digitalice el proceso de toma de asistencia** y, a partir de
esos datos, **aplique métodos de análisis numérico** para generar indicadores académicos
relevantes para el docente y los estudiantes.

### Objetivos específicos
- Permitir la creación de grupos académicos y la importación masiva de estudiantes desde Excel.
- Registrar la asistencia diaria de cada clase de forma rápida e interactiva.
- Calcular en tiempo real **métricas estadísticas**: promedio, desviación estándar y
  porcentaje individual de asistencia.
- Aplicar **métodos numéricos** sobre la serie temporal de asistencia:
  - **Método de Bisección** → punto crítico para alcanzar el 80%.
  - **Interpolación de Lagrange** → proyección de las próximas clases.
  - **Regla del Trapecio** → integración numérica del compromiso del grupo.
- Identificar estudiantes en **riesgo de pérdida** de la asignatura.
- Ofrecer **explicaciones pedagógicas** de cada método aplicado mediante un modal integrado
  con IA generativa.

---

## 2. Características

| Característica | Descripción |
|----------------|-------------|
| Gestión de grupos | Crear cursos y subir la lista de estudiantes desde un archivo `.xlsx`. |
| Validación de datos | Control de campos obligatorios y de IDs duplicados al importar. |
| Llamado a lista | Interfaz interactiva con búsqueda, marcado masivo y barra de progreso. |
| KPIs en tiempo real | Promedio, desviación estándar, punto crítico y estudiantes en riesgo. |
| Gráficos interactivos | Tendencia (barras), área acumulada (integral) y proyección (Lagrange). |
| Explicaciones pedagógicas | Modal por cada indicador con fórmula y explicación ampliada por IA. |
| Modo claro / oscuro | Tema completo con persistencia y respeto a la preferencia del sistema. |
| Diseño responsive | Adaptado a móvil, tablet y escritorio. |
| Error numérico | Visualización del error de redondeo en el promedio (precisión finita). |

---

## 3. Stack tecnológico

| Capa | Tecnología | Razón |
|------|------------|-------|
| Framework | **Next.js 15** (App Router + Turbopack) | SSR/RSC moderno y *server actions*. |
| Lenguaje | **TypeScript** | Tipado estático y mejor mantenibilidad. |
| UI | **Tailwind CSS** + **shadcn/ui** (Radix) | Sistema de diseño consistente y accesible. |
| Iconos | **Lucide React** | Set de iconos coherente y ligero. |
| Tipografía | **Plus Jakarta Sans**, **Inter**, **JetBrains Mono** | Jerarquía clara para títulos, texto y código. |
| Gráficos | **Recharts** | Charts declarativos basados en React. |
| Base de datos | **Cloud Firestore** (Firebase) | NoSQL documental, sincronización en tiempo real. |
| IA generativa | **Genkit** + **Google Gemini** | Explicaciones pedagógicas bajo demanda. |
| Excel | **xlsx** (SheetJS) | Lectura del archivo de matrícula. |
| Forms | **react-hook-form** + **zod** | Validación robusta. |

---

## 4. Arquitectura general

```
┌────────────────────────────────────────────────────────────────┐
│                       Cliente (Next.js)                        │
│                                                                │
│  ┌──────────────┐   ┌──────────────┐   ┌───────────────────┐   │
│  │  Dashboard   │──▶│ Numerical    │──▶│   Recharts        │   │
│  │  (React)     │   │ Methods (TS) │   │   (gráficos)      │   │
│  └──────┬───────┘   └──────────────┘   └───────────────────┘   │
│         │                                                      │
│         ▼                                                      │
│  ┌──────────────┐                                              │
│  │ Firebase SDK │                                              │
│  └──────┬───────┘                                              │
└─────────┼──────────────────────────────────────────────────────┘
          │
          ▼
┌────────────────────────────────────────────────────────────────┐
│                    Cloud Firestore (NoSQL)                     │
│                                                                │
│   groups/{id}/students/    classes/    attendance/             │
└────────────────────────────────────────────────────────────────┘
          ▲
          │ (server action)
┌─────────┴──────────────────────────────────────────────────────┐
│       Genkit + Gemini  ← Explicaciones pedagógicas (IA)        │
└────────────────────────────────────────────────────────────────┘
```

- **Cliente**: toda la lógica de presentación, los cálculos numéricos y las llamadas a
  Firestore corren en el navegador. Esto permite cálculos instantáneos sin viajes al servidor.
- **Server actions** de Next.js: encapsulan los *flows* de Genkit que llaman a Gemini para
  generar las explicaciones de cada método.
- **Firestore**: persistencia jerárquica por grupo (ver sección 6).

---

## 5. Estructura del código fuente

```
project/
├── src/
│   ├── app/
│   │   ├── layout.tsx               # Layout raíz: fuentes, tema, metadata
│   │   ├── page.tsx                 # Render del <Dashboard />
│   │   └── globals.css              # Sistema de diseño (paleta, animaciones)
│   │
│   ├── components/
│   │   ├── Dashboard.tsx            # Componente central — KPIs y gráficos
│   │   ├── KPICard.tsx              # Tarjeta de indicador con tonos por significado
│   │   ├── AttendanceSession.tsx    # Llamado a lista: búsqueda, progreso, guardado
│   │   ├── GroupManager.tsx         # Creación de grupo + import Excel (drag&drop)
│   │   ├── NumericalExplanation.tsx # Modal con fórmula + IA por cada método
│   │   ├── ThemeToggle.tsx          # Cambio claro/oscuro persistente
│   │   └── ui/                      # Primitivos shadcn/ui (Button, Card, Tabs, …)
│   │
│   ├── lib/
│   │   ├── numerical-methods.ts     # Implementación de los métodos numéricos
│   │   ├── firebase.ts              # Inicialización del SDK de Firebase
│   │   └── utils.ts                 # Utilidades (cn() para clases)
│   │
│   ├── ai/
│   │   ├── genkit.ts                # Configuración de Genkit + Gemini
│   │   └── flows/
│   │       ├── explain-numerical-method-flow.ts        # Flow: explicación pedagógica
│   │       └── attendance-summary-generator-flow.ts    # Flow: resumen del grupo
│   │
│   └── hooks/                       # Hooks utilitarios (useToast, useMobile)
│
├── docs/
│   ├── BASE-DE-DATOS.md             # Detalle del modelo de datos
│   ├── ANALISIS-NUMERICO.md         # Detalle matemático de los métodos
│   └── blueprint.md                 # Brief funcional inicial
│
├── tailwind.config.ts               # Tema (colores, fuentes, animaciones)
├── next.config.ts                   # Configuración de Next.js
├── package.json                     # Dependencias y scripts
└── README.md                        # Este archivo
```

---

## 6. Base de datos

La aplicación usa **Cloud Firestore** (NoSQL documental) con un modelo **jerárquico por
grupo**: cada curso contiene sus propios estudiantes, clases y registros de asistencia como
subcolecciones.

```
groups (colección)
└── {groupId}                 ← Grupo / curso
    ├── students/{studentId}  ← Estudiante (id, nombre, carrera, edad)
    ├── classes/{classId}     ← Sesión de clase (fecha)
    └── attendance/{attId}    ← Registro (classId, studentId, valor 0/1)
```

### Entidades

| Entidad      | Campos clave                                            | Notas |
|--------------|---------------------------------------------------------|-------|
| `Group`      | `nombreGrupo`, `createdAt`                              | Documento raíz del curso. |
| `Student`    | `id`, `nombre`, `carrera`, `edad`                       | El `id` viene del Excel; el ID del documento lo genera Firestore. |
| `Class`      | `fecha`                                                 | Una por sesión de "llamado a lista". |
| `Attendance` | `classId`, `studentId`, `fecha`, `valor` (0/1), `estado`| Registro por estudiante y clase. |

> Un grupo con **N estudiantes** y **M clases** genera hasta **N × M** registros de asistencia.
> Las inserciones masivas se hacen con **batch writes** atómicos.

Detalle completo en [`docs/BASE-DE-DATOS.md`](./docs/BASE-DE-DATOS.md).

---

## 7. Métodos de análisis numérico aplicados

| # | Indicador               | Método numérico              | Ubicación |
|---|-------------------------|------------------------------|-----------|
| 1 | Promedio General        | **Media Aritmética**         | `calculateStats()` |
| 2 | Desviación Estándar     | **Análisis de Dispersión**   | `calculateStats()` |
| 3 | Punto Crítico (80%)     | **Método de Bisección**      | `findCriticalApprovalPoint()` |
| 4 | Proyección de Tendencia | **Interpolación de Lagrange**| `lagrangeInterpolation()` |
| 5 | Área Acumulada          | **Regla del Trapecio**       | `trapezoidRule()` |
| 6 | Estudiantes en Riesgo   | **Filtro estadístico**       | Cálculo inline en Dashboard |

### 7.1 Media aritmética

```
x̄ = (Σ xᵢ) / n
```

Promedio de los porcentajes de asistencia individuales. Mide el rendimiento global del grupo.

### 7.2 Desviación estándar

```
σ = √( Σ (xᵢ − x̄)² / n )
```

Mide la **dispersión** de los datos respecto a la media. Una desviación alta indica que el
promedio esconde casos extremos.

### 7.3 Método de bisección — Punto crítico

Resuelve `f(x) = 0` donde:

```
f(x) = (P + x) / (T + x) − 0.8
```

- `P` = total de asistencias presentes registradas.
- `T` = total de asistencias posibles (`clases × estudiantes`).
- `x` = asistencias adicionales (con valor 1) que se buscan para alcanzar el 80%.

El algoritmo parte de `[0, 10000]` y reduce el intervalo a la mitad 30 veces hasta converger.
Luego se traduce a "clases necesarias" dividiendo entre el número de estudiantes.

### 7.4 Interpolación de Lagrange — Proyección

```
              n                              n        x − xⱼ
P(x) = Σ  yᵢ · Lᵢ(x)        donde  Lᵢ(x) =   ∏      ───────────
             i=0                           j=0, j≠i   xᵢ − xⱼ
```

Construye un polinomio que pasa por todos los puntos `(número_de_clase,
porcentaje_de_asistencia)` y lo evalúa en `n+1, n+2, n+3` para **proyectar** las próximas tres
clases. El resultado se acota al rango `[0, 100]`.

### 7.5 Regla del trapecio — Área acumulada

```
        n−1   h
A  ≈    Σ   ─── · ( yᵢ + yᵢ₊₁ )
        i=0   2
```

Integra numéricamente la curva de asistencia para obtener el **"área de compromiso"** del
grupo a lo largo del periodo. Dos grupos con el mismo promedio pueden tener áreas distintas
según evolucionaron en el tiempo.

### 7.6 Error numérico de redondeo

La tarjeta "Promedio General" muestra además el error:

```
error = | valor_exacto − valor_redondeado(2 decimales) |
```

Ilustra el concepto de **precisión finita**, fundamental en análisis numérico.

Detalle matemático completo en [`docs/ANALISIS-NUMERICO.md`](./docs/ANALISIS-NUMERICO.md).

---

## 8. Código fuente comentado de los métodos

A continuación se incluye el código completo del módulo
[`src/lib/numerical-methods.ts`](./src/lib/numerical-methods.ts), núcleo matemático del proyecto:

```ts
export interface AttendancePoint {
  x: number; // Número de la clase
  y: number; // Porcentaje de asistencia
}

/**
 * MÉTODO DE BISECCIÓN
 * Encuentra el número mínimo de clases adicionales (con asistencia perfecta)
 * necesarias para que el grupo alcance el 80% de asistencia.
 *
 * Función modelada:
 *     f(x) = (P + x) / (T + x) − 0.8
 * donde:
 *     P = asistencias presentes actuales
 *     T = asistencias posibles totales
 *     x = asistencias adicionales (valor 1) requeridas
 *
 * Se busca la raíz f(x) = 0 dividiendo el intervalo [0, 10000] a la mitad
 * en 30 iteraciones.
 */
export function findCriticalApprovalPoint(totalPresent: number, totalPossible: number): number {
  const target = 0.8;
  const currentPercentage = totalPossible === 0 ? 0 : totalPresent / totalPossible;
  if (currentPercentage >= target) return 0;

  let low = 0;
  let high = 10000;
  const f = (x: number) => (totalPresent + x) / (totalPossible + x) - target;

  if (f(high) < 0) return 999; // Inalcanzable en la práctica

  for (let i = 0; i < 30; i++) {
    const mid = (low + high) / 2;
    if (f(mid) > 0) high = mid;
    else            low  = mid;
  }
  return Math.ceil(high);
}

/**
 * INTERPOLACIÓN DE LAGRANGE
 * Construye el polinomio que pasa exactamente por todos los puntos conocidos
 * y lo evalúa en un valor x arbitrario.
 *
 *     P(x) = Σ yᵢ · Lᵢ(x)
 *     Lᵢ(x) = ∏ (x − xⱼ) / (xᵢ − xⱼ)    para j ≠ i
 *
 * Se acota al rango [0, 100] porque representa un porcentaje.
 */
export function lagrangeInterpolation(points: AttendancePoint[], x: number): number {
  if (points.length === 0) return 0;
  if (points.length === 1) return points[0].y;

  let result = 0;
  for (let i = 0; i < points.length; i++) {
    let term = points[i].y;
    for (let j = 0; j < points.length; j++) {
      if (i !== j) {
        const denominator = points[i].x - points[j].x;
        if (denominator !== 0) {
          term = term * (x - points[j].x) / denominator;
        }
      }
    }
    result += term;
  }
  return Math.min(Math.max(result, 0), 100);
}

/**
 * REGLA DEL TRAPECIO (compuesta)
 * Aproxima la integral definida de una función discreta sumando trapecios.
 *
 *     A ≈ Σ (h/2) · (yᵢ + yᵢ₊₁)
 *
 * En este proyecto, representa el "área acumulada de asistencia" (u²).
 */
export function trapezoidRule(points: AttendancePoint[]): number {
  if (points.length < 2) return 0;
  let area = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const h = points[i + 1].x - points[i].x;
    area += (h / 2) * (points[i].y + points[i + 1].y);
  }
  return area;
}

/**
 * MEDIA ARITMÉTICA + DESVIACIÓN ESTÁNDAR (poblacional)
 *     x̄ = Σ xᵢ / n
 *     σ  = √( Σ (xᵢ − x̄)² / n )
 */
export function calculateStats(values: number[]) {
  if (values.length === 0) return { mean: 0, stdDev: 0 };
  const n = values.length;
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  return { mean, stdDev };
}
```

### Ejemplo de aplicación en el Dashboard

```ts
// 1. Porcentaje de asistencia por estudiante
const studentAttendance: Record<string, number> = {};
students.forEach((s) => {
  const records = attendance.filter((a) => a.studentId === s.firebaseId);
  const present = records.filter((a) => a.valor === 1).length;
  studentAttendance[s.firebaseId] = (present / totalClasses) * 100;
});

// 2. Estadísticas globales
const { mean, stdDev } = calculateStats(Object.values(studentAttendance));

// 3. Punto crítico (bisección)
const totalPresent = attendance.filter((a) => a.valor === 1).length;
const totalPossible = totalClasses * students.length;
const classesNeeded = Math.ceil(
  findCriticalApprovalPoint(totalPresent, totalPossible) / students.length
);

// 4. Área acumulada (trapecio) y proyección (Lagrange)
const points = history.map((h, i) => ({ x: i, y: h.exact }));
const area = trapezoidRule(points);
const next1 = lagrangeInterpolation(points, history.length);     // próxima clase
const next2 = lagrangeInterpolation(points, history.length + 1); // siguiente
const next3 = lagrangeInterpolation(points, history.length + 2);
```

---

## 9. Flujo de uso

1. **Crear un grupo**: el profesor sube el Excel de la matrícula (`id, nombre, carrera, edad`).
2. **Iniciar clase**: se abre el llamado a lista, se marca a cada estudiante y se guarda.
3. **Ver estadísticas**: el dashboard muestra los 4 KPIs y los 3 gráficos actualizados.
4. **Explorar métodos**: el botón **ⓘ** en cada indicador abre el modal con fórmula y
   explicación pedagógica generada por IA.

---

## 10. Instalación y ejecución

### Requisitos
- Node.js ≥ 18
- npm ≥ 9
- Un proyecto Firebase con **Firestore** habilitado (o continuar con datos locales mientras se
  configura).

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/sgalindom/Web-asistencia-analisis-numerico.git
cd Web-asistencia-analisis-numerico/project

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
echo "GEMINI_API_KEY=tu_api_key_de_google_ai" > .env

# 4. (Opcional) Reemplazar la config de Firebase en src/lib/firebase.ts
#    con la de tu proyecto Firebase real.

# 5. Levantar el servidor de desarrollo
npm run dev
# → http://localhost:9002
```

### Scripts disponibles

| Script              | Descripción                                |
|---------------------|--------------------------------------------|
| `npm run dev`       | Servidor de desarrollo (Turbopack, :9002). |
| `npm run build`     | Compilación de producción.                 |
| `npm run start`     | Servidor de producción.                    |
| `npm run lint`      | Lint con ESLint de Next.js.                |
| `npm run typecheck` | Chequeo de tipos con TypeScript.           |
| `npm run genkit:dev`| Lanzar Genkit en modo desarrollo.          |

---

## 11. Despliegue

El proyecto está preparado para **Firebase App Hosting** (`apphosting.yaml` incluido). Pasos
generales:

```bash
firebase login
firebase use <PROJECT_ID>
firebase deploy --only apphosting
```

> Firebase App Hosting requiere el plan **Blaze** (pago por uso). Para una demostración sin
> facturación, puede ejecutarse en local con `npm run dev`.

---

## 12. Documentación adicional

- **[docs/BASE-DE-DATOS.md](./docs/BASE-DE-DATOS.md)** — Modelo de Firestore detallado.
- **[docs/ANALISIS-NUMERICO.md](./docs/ANALISIS-NUMERICO.md)** — Métodos matemáticos paso a paso.
- **[docs/blueprint.md](./docs/blueprint.md)** — Brief funcional original.

---

## 13. Autor

**Santiago Galindo M.** — `sgalindomapps@gmail.com`
Asignatura de **Análisis Numérico** — 2026.

> Proyecto académico desarrollado para demostrar la aplicación práctica de métodos numéricos
> clásicos sobre un problema real: la gestión y el análisis de la asistencia universitaria.
