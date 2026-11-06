import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { STATEMENT_LOGO_KEY, STATEMENT_BANK_LOGO_KEY, STATEMENT_PDF_KEY } from '@/lib/constants';
import { writeAppState } from '@/lib/indexed-db';

export interface StatementDownloadAssets {
  bobWorldLogo?: string | null;
  bankLogo?: string | null;
}

function dataUriParts(dataUri: string): { mime: string; base64: string; extension: string } | null {
  const match = /^data:(image\/(?:png|jpeg|jpg));base64,([a-z0-9+/=]+)$/i.exec(dataUri);
  if (!match) return null;
  const mime = match[1].toLowerCase();
  return {
    mime,
    base64: match[2],
    extension: mime.includes('png') ? 'png' : 'jpg',
  };
}

async function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the statement brand asset.'));
    reader.onload = () => typeof reader.result === 'string'
      ? resolve(reader.result)
      : reject(new Error('Could not encode the statement brand asset.'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Loads the logo assets extracted from the reference statement as the
 * first-run defaults. User-uploaded Settings logos always take precedence.
 */
export async function ensureStatementBrandAssets(): Promise<StatementDownloadAssets> {
  if (typeof window === 'undefined') return {};
  const load = async (key: string, path: string): Promise<string | null> => {
    const existing = localStorage.getItem(key);
    if (existing && existing.startsWith('data:image/')) return existing;
    try {
      const response = await fetch(path, { cache: 'force-cache' });
      if (!response.ok) return null;
      const dataUri = await blobToDataUri(await response.blob());
      localStorage.setItem(key, dataUri);
      await writeAppState(key, dataUri);
      return dataUri;
    } catch (error) {
      console.warn('Default statement logo could not be loaded:', path, error);
      return null;
    }
  };

  const [bobWorldLogo, bankLogo] = await Promise.all([
    load(STATEMENT_LOGO_KEY, '/assets/branding/bob-world-logo.png'),
    load(STATEMENT_BANK_LOGO_KEY, '/assets/branding/bank-of-baroda-logo.png'),
  ]);
  return { bobWorldLogo, bankLogo };
}

function triggerBrowserDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function dataUriToBlob(dataUri: string, mime: string): Blob {
  const base64 = dataUri.slice(dataUri.indexOf(',') + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mime });
}

/**
 * Saves a generated statement to the device's Downloads location where the
 * platform exposes one. iOS native apps use Documents (visible in Files);
 * iOS Safari and desktop browsers use the browser download mechanism.
 *
 * The extracted brand images are also exported as separate files, while
 * remaining embedded in the generated PDF.
 */
export async function saveStatementPdfAndAssets(
  pdf: Blob,
  fileName: string,
  assets: StatementDownloadAssets = {},
): Promise<string> {
  const platform = Capacitor.getPlatform();
  const native = Capacitor.isNativePlatform();
  const pdfDataUri = await blobToDataUri(pdf);
  await writeAppState(STATEMENT_PDF_KEY, pdfDataUri);

  if (native) {
    const directory = Directory.Documents;
    const downloadsPath = (relativePath: string) => 'Downloads/' + relativePath;
    await Filesystem.writeFile({
      path: downloadsPath(fileName),
      data: pdfDataUri.split(',')[1],
      directory,
      recursive: true,
    });

    const savedAssets: Array<[string, string | null | undefined]> = [
      ['BOB-World-Logo', assets.bobWorldLogo],
      ['Bank-of-Baroda-Logo', assets.bankLogo],
    ];
    for (const [baseName, dataUri] of savedAssets) {
      if (!dataUri) continue;
      const parts = dataUriParts(dataUri);
      if (!parts) continue;
      await Filesystem.writeFile({
        path: downloadsPath('Statement-Assets/' + baseName + '.' + parts.extension),
        data: parts.base64,
        directory,
        recursive: true,
      });
    }

    return platform === 'android'
      ? 'Documents/Downloads'
      : 'Files > On My iPhone > BOB World > Downloads';
  }

  const browserAssets: Array<[string, string | null | undefined]> = [
    ['BOB-World-Logo', assets.bobWorldLogo],
    ['Bank-of-Baroda-Logo', assets.bankLogo],
  ];
  const shareFiles = [new File([pdf], fileName, { type: 'application/pdf' })];
  for (const [baseName, dataUri] of browserAssets) {
    if (!dataUri) continue;
    const parts = dataUriParts(dataUri);
    if (!parts) continue;
    shareFiles.push(new File([dataUriToBlob(dataUri, parts.mime)], baseName + '.' + parts.extension, { type: parts.mime }));
  }

  // iOS Safari exposes Save to Files through the native file share sheet.
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' && navigator.canShare({ files: shareFiles })) {
    try {
      await navigator.share({
        files: shareFiles,
        title: 'BOB World transaction statement',
      });
      return 'iOS/browser share sheet (choose Save to Files)';
    } catch (shareError) {
      if (shareError instanceof Error && shareError.name === 'AbortError') {
        return 'Share sheet closed without saving';
      }
      console.warn('Statement share sheet unavailable; using browser downloads:', shareError);
    }
  }

  triggerBrowserDownload(pdf, fileName);
  for (const [baseName, dataUri] of browserAssets) {
    if (!dataUri) continue;
    const parts = dataUriParts(dataUri);
    if (!parts) continue;
    triggerBrowserDownload(dataUriToBlob(dataUri, parts.mime), baseName + '.' + parts.extension);
  }

  return 'Downloads';
}

/** Saves one generated PDF (for example a transaction receipt). */
export async function savePdfToDownloads(pdf: Blob, fileName: string): Promise<string> {
  const platform = Capacitor.getPlatform();
  if (Capacitor.isNativePlatform()) {
    const directory = Directory.Documents;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not prepare the PDF for saving.'));
      reader.onload = () => typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('Could not encode the PDF.'));
      reader.readAsDataURL(pdf);
    });
    await Filesystem.writeFile({
      path: 'Downloads/' + fileName,
      data: dataUrl.split(',')[1],
      directory,
      recursive: true,
    });
    return platform === 'android' ? 'Documents/Downloads' : 'Files > On My iPhone > BOB World > Downloads';
  }

  const pdfOnly = pdf.type === 'application/pdf' ? pdf : new Blob([pdf], { type: 'application/pdf' });
  triggerBrowserDownload(pdfOnly, fileName.toLowerCase().endsWith('.pdf') ? fileName : fileName + '.pdf');
  return 'Downloads';
}
