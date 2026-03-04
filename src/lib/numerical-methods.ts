
export interface AttendancePoint {
  x: number; // Class number
  y: number; // Attendance value (0 or 1) or percentage
}

/**
 * Bisection Method to find the minimum number of classes needed to reach 80% attendance.
 * Function: f(x) = (total_present + x) / (total_classes + x) - 0.8
 */
export function findCriticalApprovalPoint(totalPresent: number, totalClasses: number): number {
  const target = 0.8;
  const currentPercentage = totalClasses === 0 ? 0 : totalPresent / totalClasses;
  
  if (currentPercentage >= target) return 0;

  let low = 0;
  let high = 100; // Assume we might need up to 100 more classes
  const f = (x: number) => (totalPresent + x) / (totalClasses + x) - target;

  // Ensure high is enough
  while (f(high) < 0 && high < 1000) {
    high *= 2;
  }

  for (let i = 0; i < 20; i++) {
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
  let result = 0;
  for (let i = 0; i < points.length; i++) {
    let term = points[i].y;
    for (let j = 0; j < points.length; j++) {
      if (i !== j) {
        term = term * (x - points[j].x) / (points[i].x - points[j].x);
      }
    }
    result += term;
  }
  return Math.min(Math.max(result, 0), 100);
}

/**
 * Trapezoid Rule for numerical integration of the attendance curve.
 * Represents the cumulative "attendance area".
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
 * Basic stats calculations
 */
export function calculateStats(values: number[]) {
  if (values.length === 0) return { mean: 0, stdDev: 0 };
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  return { mean, stdDev };
}
