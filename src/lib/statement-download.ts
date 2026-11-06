import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { STATEMENT_LOGO_KEY, STATEMENT_BANK_LOGO_KEY, STATEMENT_PDF_KEY } from '@/lib/constants';
import { writeAppState } from '@/lib/indexed-db';

export interface StatementDownloadAssets {
  bobWorldLogo?: string | null;
  bankLogo?: string | null;
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

/**
 * Saves exactly one generated statement PDF. Branding stays embedded in the
 * PDF; source logo assets are never exported as separate files or attachments.
 */
export async function saveStatementPdf(
  pdf: Blob,
  fileName: string,
): Promise<string> {
  const platform = Capacitor.getPlatform();
  const native = Capacitor.isNativePlatform();
  const pdfDataUri = await blobToDataUri(pdf);
  await writeAppState(STATEMENT_PDF_KEY, pdfDataUri);

  const safeFileName = fileName.toLowerCase().endsWith('.pdf') ? fileName : fileName + '.pdf';
  if (native) {
    await Filesystem.writeFile({
      path: 'Downloads/' + safeFileName,
      data: pdfDataUri.split(',')[1],
      directory: Directory.Documents,
      recursive: true,
    });
    return platform === 'android'
      ? 'Documents/Downloads'
      : 'Files > On My iPhone > BOB World > Downloads';
  }

  const pdfFile = new File([pdf], safeFileName, { type: 'application/pdf' });
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' && navigator.canShare({ files: [pdfFile] })) {
    try {
      await navigator.share({
        files: [pdfFile],
        title: 'BOB World account statement',
      });
      return 'iOS/browser share sheet (choose Save to Files)';
    } catch (shareError) {
      if (shareError instanceof Error && shareError.name === 'AbortError') {
        return 'Share sheet closed without saving';
      }
      console.warn('Single-PDF share sheet unavailable; using browser download:', shareError);
    }
  }

  triggerBrowserDownload(pdf, safeFileName);
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
