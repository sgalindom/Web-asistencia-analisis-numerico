# Análisis Numérico — EduStat Analytics

Documento informativo sobre los **métodos de análisis numérico y estadístico** aplicados en la
aplicación. Todas las funciones están implementadas en
[`src/lib/numerical-methods.ts`](../src/lib/numerical-methods.ts) y se usan en el
[`Dashboard.tsx`](../src/components/Dashboard.tsx).

---

## Resumen de métodos

| Indicador               | Método aplicado                  | Tipo                    |
|-------------------------|----------------------------------|-------------------------|
| Promedio General        | Media Aritmética                 | Estadística descriptiva |
| Desviación Estándar     | Análisis de Dispersión           | Estadística descriptiva |
| Punto Crítico (80%)     | Método de Bisección              | Búsqueda de raíces      |
| Proyección de Tendencia | Interpolación de Lagrange        | Interpolación polinómica|
| Área Acumulada          | Regla del Trapecio               | Integración numérica    |
| Estudiantes en Riesgo   | Filtro Estadístico (umbral)      | Clasificación           |

---

## 1. Media Aritmética

**¿Qué mide?** El valor central o promedio de la asistencia del grupo.

### Fórmula

```
        n
       Σ  xᵢ
       i=1
x̄  =  ─────────
          n
```

Donde `xᵢ` es el porcentaje de asistencia de cada estudiante y `n` el número de estudiantes.

### Aplicación en la app
Se calcula el porcentaje de asistencia de cada estudiante:

```
asistencia_estudiante = (clases_presente / total_clases) × 100
```

y luego se promedian todos esos valores para obtener la **asistencia promedio del grupo**.

### Error numérico de redondeo
La tarjeta "Promedio General" muestra además el **error de redondeo**:

```
error = | valor_exacto − valor_redondeado(2 decimales) |
```

Esto ilustra un concepto clave del análisis numérico: al representar números con precisión
finita se introduce un pequeño error de truncamiento/redondeo.

> Implementado en: `calculateStats()`

---

## 2. Desviación Estándar (Análisis de Dispersión)

**¿Qué mide?** Qué tan dispersos están los datos respecto a la media. Un valor **alto** indica
un grupo desigual (algunos asisten mucho, otros poco); un valor **bajo** indica homogeneidad.

### Fórmulas

Varianza poblacional:

```
          n
         Σ  (xᵢ − x̄)²
         i=1
σ²  =  ──────────────────
              n
```

Desviación estándar:

```
σ  =  √ σ²
```

### Aplicación en la app
Se mide la variabilidad de los porcentajes de asistencia individuales. Permite al profesor
saber si el promedio representa bien al grupo o si esconde casos extremos.

> Implementado en: `calculateStats()`

---

## 3. Método de Bisección — Punto Crítico

**¿Qué mide?** Cuántas clases adicionales (con asistencia perfecta) necesita el grupo para
alcanzar el umbral mínimo del **80%** de asistencia.

### Fundamento
El método de bisección encuentra la **raíz** de una función continua `f(x)` en un intervalo
`[a, b]` donde `f(a)` y `f(b)` tienen signos opuestos. En cada iteración divide el intervalo a
la mitad y descarta la mitad que no contiene la raíz.

### Función modelada

```
              P + x
f(x)  =  ───────────────  −  0.8
              T + x
```

Donde:
- `P` = total de asistencias presentes registradas.
- `T` = total de asistencias posibles (`clases × estudiantes`).
- `x` = asistencias adicionales (con valor 1) que se buscan.
- `0.8` = umbral objetivo (80%).

Se busca el valor de `x` tal que `f(x) = 0`.

### Algoritmo

```
1.  low = 0,  high = 10000
2.  Repetir 30 veces:
        mid = (low + high) / 2
        si f(mid) > 0  →  high = mid
        si no          →  low  = mid
3.  resultado = techo(high)
```

Luego se convierte a "clases necesarias":

```
clases_necesarias = techo( x / número_de_estudiantes )
```

### Aplicación en la app
Da una meta concreta y accionable: *"el grupo necesita N clases más con asistencia total para
recuperar el 80%"*.

> Implementado en: `findCriticalApprovalPoint()`

---

## 4. Interpolación de Lagrange — Proyección de Tendencia

**¿Qué mide?** Estima la asistencia de las **próximas 3 clases** a partir del historial.

### Fundamento
La interpolación de Lagrange construye un **polinomio único** que pasa exactamente por todos
los puntos conocidos `(xᵢ, yᵢ)`. Ese polinomio se evalúa en puntos futuros para extrapolar.

### Fórmulas

Polinomio interpolante:

```
         n
P(x)  =  Σ  yᵢ · Lᵢ(x)
        i=0
```

Polinomios base de Lagrange:

```
              n        x − xⱼ
Lᵢ(x)  =     ∏      ───────────────
            j=0       xᵢ − xⱼ
            j≠i
```

### Aplicación en la app
Los puntos son `(número_de_clase, porcentaje_de_asistencia)`. El polinomio se evalúa en las
posiciones futuras (`x = n, n+1, n+2`) para proyectar la tendencia. El resultado se acota al
rango `[0, 100]` porque un porcentaje no puede salirse de esos límites.

> Requiere al menos **2 clases** registradas.
> Implementado en: `lagrangeInterpolation()`

---

## 5. Regla del Trapecio — Área Acumulada

**¿Qué mide?** El "área bajo la curva" de asistencia: una métrica **integral** del compromiso
del grupo durante todo el periodo.

### Fundamento
La regla del trapecio aproxima la integral definida de una función dividiendo el área en
**trapecios** y sumando sus áreas individuales.

### Fórmulas

Para un solo intervalo `[xᵢ, xᵢ₊₁]`:

```
              h
Aᵢ  =  ─────── · ( yᵢ + yᵢ₊₁ )
              2
```

Área total (regla compuesta):

```
        n−1     h
A  =     Σ    ───── · ( yᵢ + yᵢ₊₁ )
        i=0     2
```

Donde `h = xᵢ₊₁ − xᵢ` es el ancho del intervalo (la separación entre clases).

### Aplicación en la app
Integra la curva del historial de asistencia. El resultado se expresa en **unidades cuadradas
(u²)** y representa el desempeño acumulado: dos grupos con el mismo promedio pueden tener áreas
distintas si uno mejoró con el tiempo y el otro empeoró.

> Implementado en: `trapezoidRule()`

---

## 6. Filtro Estadístico — Estudiantes en Riesgo

**¿Qué mide?** Cuántos estudiantes están por debajo del mínimo reglamentario.

### Criterio

```
estudiante en riesgo  ⇔  asistencia_individual < 80%
```

### Aplicación en la app
Se recorre la lista de porcentajes individuales y se cuentan los que no alcanzan el 80%. Estos
estudiantes están en **riesgo de perder la asignatura** por incumplir el reglamento de
asistencia. Es una operación de **clasificación por umbral**.

---

## 7. Flujo de cálculo completo

```
   Datos crudos (Firestore: valor 0/1)
                │
                ▼
   Asistencia individual = (presentes / total_clases) × 100
                │
        ┌───────┼─────────┬──────────────┬───────────────┐
        ▼       ▼         ▼              ▼               ▼
     Media   Desv.    Bisección     Interpolación    Trapecio
      (x̄)     (σ)    (punto crít.)   (Lagrange)     (área u²)
        │       │         │              │               │
        └───────┴─────────┴──────┬───────┴───────────────┘
                                 ▼
                    Dashboard: KPIs + gráficos
```

---

## 8. Referencia rápida de funciones

| Función                       | Archivo                          | Devuelve                        |
|--------------------------------|----------------------------------|----------------------------------|
| `calculateStats(values)`       | `src/lib/numerical-methods.ts`   | `{ mean, stdDev }`               |
| `findCriticalApprovalPoint()`  | `src/lib/numerical-methods.ts`   | Nº de asistencias necesarias     |
| `lagrangeInterpolation()`      | `src/lib/numerical-methods.ts`   | Valor proyectado `[0, 100]`      |
| `trapezoidRule(points)`        | `src/lib/numerical-methods.ts`   | Área acumulada en u²             |

> Cada tarjeta e indicador del Dashboard incluye un botón **ⓘ** que abre una explicación
> pedagógica del método, con su fórmula y una explicación ampliada generada por IA.
