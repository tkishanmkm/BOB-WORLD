import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const root = process.cwd();
const copy = async (source, target) => {
  await mkdir(dirname(target), { recursive: true });
  await copyFile(source, target);
};

const pdfWorker = resolve(root, 'node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs');
await copy(pdfWorker, resolve(root, 'public/pdf.worker.min.mjs'));

const tesseractRoot = resolve(root, 'node_modules/tesseract.js');
const coreRoot = resolve(root, 'node_modules/tesseract.js-core');
const publicOcr = resolve(root, 'public/tesseract');
await copy(
  resolve(tesseractRoot, 'dist/worker.min.js'),
  resolve(publicOcr, 'worker.min.js'),
);

const coreFiles = [
  'tesseract-core.wasm.js',
  'tesseract-core.wasm',
  'tesseract-core-simd.wasm.js',
  'tesseract-core-simd.wasm',
  'tesseract-core-lstm.wasm.js',
  'tesseract-core-lstm.wasm',
  'tesseract-core-simd-lstm.wasm.js',
  'tesseract-core-simd-lstm.wasm',
];
for (const name of coreFiles) {
  await copy(resolve(coreRoot, name), resolve(publicOcr, 'core', name));
}

await copy(
  resolve(root, 'node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz'),
  resolve(publicOcr, 'lang/eng.traineddata.gz'),
);

console.log('Copied the local PDF.js worker, Tesseract worker/core, and English OCR data.');
