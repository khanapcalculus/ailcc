/**
 * Apply Chaikin's smoothing algorithm to a line
 * @param {Array} points - Array of points [x1, y1, x2, y2, ...]
 * @param {Number} factor - Smoothing factor (0-1)
 * @param {Number} iterations - Number of iterations of the algorithm
 * @returns {Array} - Smoothed points
 */
export function smoothLine(points, factor = 0.25, iterations = 2) {
  if (points.length < 4) return points;
  
  let result = [...points];
  
  for (let i = 0; i < iterations; i++) {
    result = chaikinSmooth(result, factor);
  }
  
  return result;
}

/**
 * Apply one iteration of Chaikin's algorithm
 * @param {Array} points - Array of points [x1, y1, x2, y2, ...]
 * @param {Number} factor - Smoothing factor (0-1)
 * @returns {Array} - Smoothed points
 */
function chaikinSmooth(points, factor) {
  if (points.length < 4) return points;
  
  const smoothed = [];
  
  // Add the first point
  smoothed.push(points[0]);
  smoothed.push(points[1]);
  
  // Process each pair of points
  for (let i = 0; i < points.length - 2; i += 2) {
    const x0 = points[i];
    const y0 = points[i + 1];
    const x1 = points[i + 2];
    const y1 = points[i + 3];
    
    // Calculate new points
    const q0x = x0 + (x1 - x0) * factor;
    const q0y = y0 + (y1 - y0) * factor;
    const q1x = x0 + (x1 - x0) * (1 - factor);
    const q1y = y0 + (y1 - y0) * (1 - factor);
    
    smoothed.push(q0x);
    smoothed.push(q0y);
    smoothed.push(q1x);
    smoothed.push(q1y);
  }
  
  // Add the last point
  smoothed.push(points[points.length - 2]);
  smoothed.push(points[points.length - 1]);
  
  return smoothed;
}

/**
 * Apply Bezier curve smoothing to a line
 * @param {Array} points - Array of points [x1, y1, x2, y2, ...]
 * @param {Number} tension - Tension factor (0-1)
 * @returns {Array} - Smoothed points with Bezier control points
 */
export function bezierSmooth(points, tension = 0.5) {
  if (points.length < 4) return points;
  
  const controlPoints = [];
  const points2D = [];
  
  // Convert flat array to array of points
  for (let i = 0; i < points.length; i += 2) {
    points2D.push({
      x: points[i],
      y: points[i + 1]
    });
  }
  
  // Generate control points
  for (let i = 0; i < points2D.length - 1; i++) {
    const p0 = i > 0 ? points2D[i - 1] : points2D[i];
    const p1 = points2D[i];
    const p2 = points2D[i + 1];
    const p3 = i < points2D.length - 2 ? points2D[i + 2] : p2;
    
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;
    
    controlPoints.push({
      cp1x,
      cp1y,
      cp2x,
      cp2y
    });
  }
  
  // Create flat array with control points for Konva
  const result = [];
  
  // First point
  result.push(points2D[0].x);
  result.push(points2D[0].y);
  
  // Add segments with control points
  for (let i = 0; i < controlPoints.length; i++) {
    result.push(controlPoints[i].cp1x);
    result.push(controlPoints[i].cp1y);
    result.push(controlPoints[i].cp2x);
    result.push(controlPoints[i].cp2y);
    result.push(points2D[i + 1].x);
    result.push(points2D[i + 1].y);
  }
  
  return result;
}

/**
 * Simplify a line by removing points that are too close together
 * @param {Array} points - Array of points [x1, y1, x2, y2, ...]
 * @param {Number} threshold - Distance threshold
 * @returns {Array} - Simplified points
 */
export function simplifyLine(points, threshold = 5) {
  if (points.length < 4) return points;
  
  const simplified = [points[0], points[1]];
  
  for (let i = 2; i < points.length; i += 2) {
    const x = points[i];
    const y = points[i + 1];
    const lastX = simplified[simplified.length - 2];
    const lastY = simplified[simplified.length - 1];
    
    const distance = Math.sqrt((x - lastX) ** 2 + (y - lastY) ** 2);
    
    if (distance >= threshold) {
      simplified.push(x);
      simplified.push(y);
    }
  }
  
  return simplified;
}