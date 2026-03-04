'use server';
/**
 * @fileOverview A Genkit flow for generating an AI-powered summary of attendance performance.
 *
 * - generateAttendanceSummary - A function that handles the generation of attendance summaries.
 * - AttendanceSummaryInput - The input type for the generateAttendanceSummary function.
 * - AttendanceSummaryOutput - The return type for the generateAttendanceSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AttendanceSummaryInputSchema = z.object({
  entityType: z.enum(['student', 'group']).describe('The type of entity being summarized: "student" or "group".'),
  entityName: z.string().describe('The name of the student or group.'),
  totalClasses: z.number().int().positive().describe('The total number of classes held.'),
  attendancePercentage: z.number().min(0).max(100).describe('The calculated attendance percentage for the entity.'),
  atRiskStatus: z.boolean().describe('Whether the student or group is identified as at risk due to low attendance.'),
  attendanceRecords: z.array(z.object({
    date: z.string().describe('The date of the class (YYYY-MM-DD).'),
    status: z.enum(['Presente', 'Ausente']).describe('The attendance status for that class.'),
  })).describe('A chronological list of attendance records for the entity.'),
  additionalStats: z.record(z.any()).optional().describe('Optional additional statistics for group summaries, e.g., average group attendance, standard deviation, count of students at risk.'),
});
export type AttendanceSummaryInput = z.infer<typeof AttendanceSummaryInputSchema>;

const AttendanceSummaryOutputSchema = z.object({
  summary: z.string().describe('An AI-generated summary of the attendance performance, including trends and patterns.'),
});
export type AttendanceSummaryOutput = z.infer<typeof AttendanceSummaryOutputSchema>;

export async function generateAttendanceSummary(input: AttendanceSummaryInput): Promise<AttendanceSummaryOutput> {
  return attendanceSummaryGeneratorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'attendanceSummaryGeneratorPrompt',
  input: {schema: AttendanceSummaryInputSchema},
  output: {schema: AttendanceSummaryOutputSchema},
  prompt: `You are an academic assistant specialized in analyzing attendance data and providing concise, insightful summaries.
Your goal is to help professors understand engagement levels and identify noteworthy patterns for a student or an academic group.

Based on the following attendance data, provide a summary focusing on attendance trends, noteworthy patterns, and insights.
Highlight if the {{entityName}} is at risk and suggest areas of focus if applicable.
Ensure the summary is clear, concise, and pedagogically useful.

---
Entity Type: {{entityType}}
Entity Name: {{entityName}}
Total Classes: {{totalClasses}}
Attendance Percentage: {{attendancePercentage}}%
At Risk Status: {{#if atRiskStatus}}Sí{{else}}No{{/if}}

{{#if attendanceRecords.length}}
Historial de Asistencia:
{{#each attendanceRecords}}
- Fecha: {{this.date}}, Estado: {{this.status}}
{{/each}}
{{else}}
No hay registros de asistencia disponibles.
{{/if}}

{{#if additionalStats}}
Estadísticas Adicionales del Grupo:
{{#each additionalStats}}
- {{ @key }}: {{ this }}
{{/each}}
{{/if}}
---

Generate the summary in Spanish.
Your output MUST be a JSON object conforming to the AttendanceSummaryOutputSchema.
The summary should be provided under the 'summary' field.
`,
});

const attendanceSummaryGeneratorFlow = ai.defineFlow(
  {
    name: 'attendanceSummaryGeneratorFlow',
    inputSchema: AttendanceSummaryInputSchema,
    outputSchema: AttendanceSummaryOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
