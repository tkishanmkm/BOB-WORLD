export interface ImpsCharge {
  base: number;
  gst: number;
  total: number;
  slab: 'UP_TO_1000' | '1001_TO_25000' | '25001_TO_500000';
}

export function calculateImpsCharge(amount: number): ImpsCharge | null {
  if (!Number.isFinite(amount) || amount <= 0 || amount > 500_000) return null;
  const base = amount <= 1_000 ? 2.5 : amount <= 25_000 ? 5 : 15;
  const gst = Math.round(base * 0.18 * 100) / 100;
  return {
    base,
    gst,
    total: Math.round((base + gst) * 100) / 100,
    slab: amount <= 1_000 ? 'UP_TO_1000' : amount <= 25_000 ? '1001_TO_25000' : '25001_TO_500000',
  };
}

export function createImpsReference(): string {
  const digits = new Uint8Array(12);
  crypto.getRandomValues(digits);
  let reference = String((digits[0] % 9) + 1);
  for (let index = 1; index < digits.length; index += 1) reference += String(digits[index] % 10);
  return reference;
}

export function maskImpsPayeeAccount(accountNumber: string): string {
  const digits = accountNumber.replace(/\D/g, '');
  if (!digits) return '';
  return 'X'.repeat(Math.max(4, digits.length - 4)) + digits.slice(-4);
}

/** BOB's IMPS charge narration uses the eight-character privacy mask. */
export function maskImpsChargeAccount(accountNumber: string): string {
  const digits = accountNumber.replace(/\D/g, '');
  if (!digits) return 'XXXXXXXX';
  if (digits.length >= 8) return 'XXXXXXXX';
  return 'X'.repeat(Math.max(2, digits.length - 4)) + digits.slice(-4);
}

export function buildImpsNarrations(
  reference: string,
  payeeAccountNumber: string,
  remarks: string,
): { transfer: string; charge: string } {
  const safeRemarks = remarks.replace(/[\/\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40) || 'IMPS TRANSFER';
  return {
    transfer: 'IMPS/P2A/' + reference + '/' + maskImpsPayeeAccount(payeeAccountNumber) + '/' + safeRemarks,
    charge: 'CHARGES FOR\n:IMPS/P2A/' + reference + '/' + maskImpsChargeAccount(payeeAccountNumber),
  };
}

export function generateLocalOtp(): string {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return String(values[0] % 1_000_000).padStart(6, '0');
}
