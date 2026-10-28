
'use server';
/**
 * @fileOverview A Genkit flow to extract transactions from a PDF bank statement.
 *
 * - extractTransactionsFromPdf - A function that attempts to parse a PDF and extract transaction data.
 * - PdfTransactionInput - The input type for the flow (PDF as data URI).
 * - ExtractedTransaction - The schema for an individual extracted transaction.
 * - PdfTransactionOutput - The return type for the flow (an array of extracted transactions).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PdfTransactionInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      "The PDF bank statement as a data URI. Expected format: 'data:application/pdf;base64,<encoded_data>'."
    ),
});
export type PdfTransactionInput = z.infer<typeof PdfTransactionInputSchema>;

// Strict schema for what a valid transaction looks like
const ExtractedTransactionSchema = z.object({
  date: z.string().describe("The date of the transaction (e.g., 'YYYY-MM-DD' or 'DD/MM/YYYY')."),
  description: z.string().describe('A brief description of the transaction.'),
  amount: z.number().describe('The transaction amount (positive number).'),
  type: z.enum(['credit', 'debit']).describe("The type of transaction: 'credit' or 'debit'."),
});
export type ExtractedTransaction = z.infer<typeof ExtractedTransactionSchema>;

// Strict schema for the final output of the flow
const PdfTransactionOutputSchema = z.object({
  transactions: z.array(ExtractedTransactionSchema).describe('An array of extracted transactions.'),
});
export type PdfTransactionOutput = z.infer<typeof PdfTransactionOutputSchema>;

// Looser schema for individual transactions, as AI might miss fields
const LooseExtractedTransactionSchema = z.object({
  date: z.string().optional().describe("The date of the transaction (e.g., 'YYYY-MM-DD' or 'DD/MM/YYYY')."),
  description: z.string().optional().describe('A brief description of the transaction.'),
  amount: z.number().optional().describe('The transaction amount (positive number).'),
  type: z.enum(['credit', 'debit']).optional().describe("The type of transaction: 'credit' or 'debit'."),
});

// Looser schema for the overall AI output
const LoosePdfTransactionOutputSchema = z.object({
  transactions: z.array(LooseExtractedTransactionSchema).optional().describe('An array of extracted transactions.'),
});

export async function extractTransactionsFromPdf(
  input: PdfTransactionInput
): Promise<PdfTransactionOutput> {
  return extractTransactionsFlow(input);
}

const extractTransactionsPrompt = ai.definePrompt({
  name: 'extractTransactionsFromPdfPrompt',
  input: {schema: PdfTransactionInputSchema},
  // No output schema here; we will parse the text output manually.
  prompt: `You are a financial assistant AI. Your task is to analyze the provided document (a bank statement PDF) and extract all transactions.
For each transaction, identify the date, a concise description, the amount, and whether it is a 'credit' (money in) or a 'debit' (money out).

Present the extracted transactions as a JSON string. The JSON should be an object with a single key "transactions", which is an array of transaction objects.
Each transaction object MUST have the following fields: "date" (string), "description" (string), "amount" (number), and "type" (string, either "credit" or "debit").
Ensure dates are as precise as possible (e.g., 'YYYY-MM-DD' or 'DD/MM/YYYY'). Amounts should be positive numbers.

Example of the expected JSON string format:
{
  "transactions": [
    { "date": "2023-01-15", "description": "Grocery Store Purchase", "amount": 55.20, "type": "debit" },
    { "date": "2023-01-16", "description": "Salary Deposit", "amount": 2500.00, "type": "credit" }
  ]
}

Document content:
{{media url=pdfDataUri}}
`,
});

const extractTransactionsFlow = ai.defineFlow(
  {
    name: 'extractTransactionsFlow',
    inputSchema: PdfTransactionInputSchema,
    outputSchema: PdfTransactionOutputSchema, // The flow itself still promises this strict output
  },
  async (input: PdfTransactionInput): Promise<PdfTransactionOutput> => {
    const llmResponse = await extractTransactionsPrompt(input);
    const rawTextOutput = llmResponse.text;

    console.log('Transaction Extraction LLM Raw Text Output:', rawTextOutput);
    console.log('Transaction Extraction LLM Usage:', llmResponse.usage);

    if (!rawTextOutput) {
      console.error('LLM returned empty text output.');
      return {transactions: []};
    }

    let parsedJson: any;
    try {
      // Sometimes LLMs wrap JSON in backticks or add explanations, try to extract clean JSON
      const jsonMatch = rawTextOutput.match(/```json\s*([\s\S]*?)\s*```|({[\s\S]*})/);
      const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[2]) : rawTextOutput;
      parsedJson = JSON.parse(jsonString);
    } catch (e) {
      console.error('Failed to parse JSON from LLM output:', e, 'Raw output was:', rawTextOutput);
      return {transactions: []};
    }

    const parsedWithLooseSchema = LoosePdfTransactionOutputSchema.safeParse(parsedJson);

    if (!parsedWithLooseSchema.success || !parsedWithLooseSchema.data || !parsedWithLooseSchema.data.transactions) {
      console.error('Failed to validate parsed JSON against loose schema:', parsedWithLooseSchema.success ? 'Data missing transactions' : parsedWithLooseSchema.error.issues);
      return {transactions: []};
    }
    
    const looseTransactions = parsedWithLooseSchema.data.transactions;
    console.log(`Found ${looseTransactions.length} transactions in loosely parsed array.`);

    const validTransactions = looseTransactions.filter(
      (tx): tx is ExtractedTransaction => { // Type guard to the strict type
        const isValid = 
          tx && // Ensure tx is not null or undefined
          typeof tx === 'object' && // Ensure tx is an object
          typeof tx.date === 'string' && tx.date.trim() !== '' &&
          typeof tx.description === 'string' && tx.description.trim() !== '' &&
          typeof tx.amount === 'number' &&
          (tx.type === 'credit' || tx.type === 'debit');
        if (!isValid) {
           console.warn('Invalid transaction filtered out:', JSON.stringify(tx, null, 2));
        }
        return isValid;
      }
    );
    console.log(`Found ${validTransactions.length} valid transactions after strict filtering.`);

    return {transactions: validTransactions};
  }
);
