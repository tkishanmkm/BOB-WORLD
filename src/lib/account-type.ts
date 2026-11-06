import type { AccountDetailsType } from '@/lib/types';

/** Resolve the saved account type without silently assuming a current account. */
export function getAccountTypeLabel(account: Pick<AccountDetailsType, 'accountType' | 'accountTypeName'>): string {
  const raw = [account.accountType, account.accountTypeName]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .toLowerCase();

  if (/\bsav(?:ing|ings)\b/.test(raw)) return 'SAVINGS ACCOUNT';
  if (/\bcurrent\b/.test(raw)) return 'CURRENT ACCOUNT';

  const cleaned = raw.trim();
  return cleaned ? cleaned.toUpperCase() : 'ACCOUNT TYPE NOT SET';
}
