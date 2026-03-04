
export interface AttendancePoint {
  x: number; // Class number
  y: number; // Attendance value (0 or 1) or percentage
}

/**
 * Bisection Method to find the minimum number of classes needed to reach 80% attendance.
 * Function: f(x) = (total_present + x) / (total_classes + x) - 0.8
 * x represents the additional classes with 100% attendance.
 */
export function findCriticalApprovalPoint(totalPresent: number, totalPossible: number): number {
  const target = 0.8;
  const currentPercentage = totalPossible === 0 ? 0 : totalPresent / totalPossible;
  
  if (currentPercentage >= target) return 0;

  // We are looking for 'x' (additional classes with 100% attendance)
  // Each additional class adds 'studentCount' to both totalPresent and totalPossible
  // For simplicity, we calculate based on the total attendance markers.
  
  let low = 0;
  let high = 10000; // Large upper bound for bisection
  const f = (x: number) => (totalPresent + x) / (totalPossible + x) - target;

  if (f(high) < 0) return 999; // Practically unreachable

  for (let i = 0; i < 30; i++) {
    const mid = (low + high) / 2;
    if (f(mid) > 0) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return Math.ceil(high);
}

/**
 * Lagrange Interpolation to project future attendance trend.
 */
export function lagrangeInterpolation(points: AttendancePoint[], x: number): number {
  if (points.length === 0) return 0;
  if (points.length === 1) return points[0].y;

  let result = 0;
  for (let i = 0; i < points.length; i++) {
    let term = points[i].y;
    for (let j = 0; j < points.length; j++) {
      if (i !== j) {
        // Prevent division by zero
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
 * Trapezoid Rule for numerical integration of the attendance curve.
 * Represents the cumulative "attendance area" (u²).
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
 * Basic stats calculations and Rounding Error simulation.
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
