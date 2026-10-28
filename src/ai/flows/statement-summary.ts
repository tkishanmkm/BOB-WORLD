
'use server';
/**
 * @fileOverview Generates a summary of an account statement, highlighting key transactions and providing insights.
 *
 * - generateStatementSummary - A function that generates a summary of an account statement.
 * - StatementSummaryInput - The input type for the generateStatementSummary function.
 * - StatementSummaryOutput - The return type for the generateStatementSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const StatementSummaryInputSchema = z.object({
  statementText: z
    .string()
    .describe('The text of the account statement to be summarized.'),
});
export type StatementSummaryInput = z.infer<typeof StatementSummaryInputSchema>;

export const StatementSummaryOutputSchema = z.object({
  summary: z.string().describe('A detailed summary of the account statement, formatted with markdown. Include paragraphs, bullet points for key transactions, and bold text for emphasis.'),
});
export type StatementSummaryOutput = z.infer<typeof StatementSummaryOutputSchema>;

export async function generateStatementSummary(
  input: StatementSummaryInput
): Promise<StatementSummaryOutput> {
  return statementSummaryFlow(input);
}

const statementSummaryPrompt = ai.definePrompt({
  name: 'statementSummaryPrompt',
  input: {schema: StatementSummaryInputSchema},
  output: {schema: StatementSummaryOutputSchema},
  prompt: `You are an expert financial analyst AI for Bank of Baroda.

  Please provide a concise but insightful summary of the following bank statement text. Your response should be easy to read and understand for a typical banking customer.

  Your summary MUST include:
  1.  A brief opening sentence stating the period the summary covers if available.
  2.  Total credits and debits.
  3.  A section for "Key Insights" highlighting spending patterns, large transactions, or unusual activity. Use bullet points.
  4.  A section for "Largest Transactions" listing the top 3-5 largest debits and credits. Use bullet points.
  5.  A concluding sentence.

  Format the output using markdown for readability (e.g., use '**' for bolding titles, and '*' for bullet points).

  Statement:
  {{{statementText}}}`,
});

const statementSummaryFlow = ai.defineFlow(
  {
    name: 'statementSummaryFlow',
    inputSchema: StatementSummaryInputSchema,
    outputSchema: StatementSummaryOutputSchema,
  },
  async input => {
    // Basic validation removed to be more robust
    // if (!input.statementText || input.statementText.trim().length < 50) {
    //     throw new Error("Statement text is too short to analyze. Please provide a more detailed statement.");
    // }

    const {output} = await statementSummaryPrompt(input);
    
    if (!output?.summary) {
        throw new Error("The AI failed to generate a summary. This might be a temporary issue. Please try again.");
    }
    
    return output;
  }
);
