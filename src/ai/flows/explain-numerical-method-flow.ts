'use server';
/**
 * @fileOverview An AI agent that provides pedagogical explanations for numerical methods and statistical indicators.
 *
 * - explainNumericalMethod - A function that handles the explanation process.
 * - ExplainNumericalMethodInput - The input type for the explainNumericalMethod function.
 * - ExplainNumericalMethodOutput - The return type for the explainNumericalMethod function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExplainNumericalMethodInputSchema = z.object({
  methodName: z
    .string()
    .describe(
      'The name of the numerical method or statistical indicator to explain (e.g., "Bisection Method", "Lagrange Interpolation", "Average").'
    )
});
export type ExplainNumericalMethodInput = z.infer<
  typeof ExplainNumericalMethodInputSchema
>;

const ExplainNumericalMethodOutputSchema = z.object({
  explanation: z
    .string()
    .describe(
      'A clear, concise, and pedagogical explanation of the method or indicator, including its significance and real-world implications.'
    )
});
export type ExplainNumericalMethodOutput = z.infer<
  typeof ExplainNumericalMethodOutputSchema
>;

export async function explainNumericalMethod(
  input: ExplainNumericalMethodInput
): Promise<ExplainNumericalMethodOutput> {
  return explainNumericalMethodFlow(input);
}

const prompt = ai.definePrompt({
  name: 'explainNumericalMethodPrompt',
  input: {schema: ExplainNumericalMethodInputSchema},
  output: {schema: ExplainNumericalMethodOutputSchema},
  prompt: `As an expert in mathematics and pedagogy, provide a clear, concise, and pedagogical explanation for the following concept, including its significance and real-world implications. This explanation should be suitable for a university-level student or professor.

Concept: {{{methodName}}}`
});

const explainNumericalMethodFlow = ai.defineFlow(
  {
    name: 'explainNumericalMethodFlow',
    inputSchema: ExplainNumericalMethodInputSchema,
    outputSchema: ExplainNumericalMethodOutputSchema
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
