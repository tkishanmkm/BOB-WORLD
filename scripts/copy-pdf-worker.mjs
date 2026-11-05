import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const source = resolve(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs');
const target = resolve(process.cwd(), 'public/pdf.worker.min.mjs');

await mkdir(dirname(target), { recursive: true });
await copyFile(source, target);
console.log('Copied the local PDF.js worker to public/pdf.worker.min.mjs');
