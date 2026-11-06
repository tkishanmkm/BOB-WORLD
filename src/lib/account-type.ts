import type { AccountDetailsType } from '@/lib/types';

/** Resolve the saved account type without silently assuming a current account. */
export function getAccountTypeLabel(account: Pick<AccountDetailsType, 'accountType' | 'accountTypeName'>): string {
  // The canonical short type wins; the full bank product name is a fallback.
  const raw = (account.accountType?.trim() || account.accountTypeName?.trim() || '').toLowerCase();

  if (/\bsav(?:ing|ings)\b/.test(raw)) return 'SAVINGS ACCOUNT';
  if (/\bcurrent\b/.test(raw)) return 'CURRENT ACCOUNT';

  return raw ? raw.toUpperCase() : 'ACCOUNT TYPE NOT SET';
}
