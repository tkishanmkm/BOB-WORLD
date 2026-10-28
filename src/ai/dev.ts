
import { config } from 'dotenv';
config();

import '@/ai/flows/statement-summary.ts';
import '@/ai/flows/extract-transactions-from-pdf-flow.ts'; // Added import for the new flow
