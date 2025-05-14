/**
 * Calculate overall grade (lowest individual grade)
 */
export function calculateOverallGrade(metrics) {
  const grades = Object.values(metrics).map(metric => metric.grade);
  const gradeValues = { 'A': 4, 'B': 3, 'C': 2, 'D': 1, 'F': 0 };
  
  let lowestGradeValue = 4; // Start with highest grade
  let lowestGrade = 'A';
  
  for (const grade of grades) {
    if (gradeValues[grade] < lowestGradeValue) {
      lowestGradeValue = gradeValues[grade];
      lowestGrade = grade;
    }
  }
  
  return lowestGrade;
}
