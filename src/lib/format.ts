export function formatMoney(amount: number): string {
  return amount.toLocaleString() + ' RWF';
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  }) + ', ' + d.toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit',
  });
}

/** Date + time including seconds — used for precise reports/exports. */
export function formatDateTimeSec(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  }) + ', ' + d.toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
}

export function generateCode(prefix: string = 'SG'): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return prefix + '-' + code;
}

export function generateNumericCode(
  prefix: string,
  digits: 3 | 4,
  existingCodes: string[]
): string {
  const min = digits === 3 ? 100 : 1000;
  const max = digits === 3 ? 999 : 9999;
  let attempts = 0;
  while (attempts < 1000) {
    const num = Math.floor(Math.random() * (max - min + 1)) + min;
    const code = `${prefix}-${num}`;
    if (!existingCodes.includes(code)) return code;
    attempts++;
  }
  throw new Error('Could not generate unique code — pool exhausted');
}

/** Universal SG-#### code. Supports 3 or 4 digits (default 4). */
export function generateUniversalCode(existingCodes: string[], digits: 3 | 4 = 4): string {
  const min = digits === 3 ? 100 : 1000;
  const max = digits === 3 ? 999 : 9999;
  let attempts = 0;
  while (attempts < 5000) {
    const num = Math.floor(Math.random() * (max - min + 1)) + min;
    const code = `SG-${num}`;
    if (!existingCodes.includes(code)) return code;
    attempts++;
  }
  throw new Error('Could not generate unique code — SG pool exhausted');
}

/** Sort schools so "Other" is always last */
export function sortSchoolsOtherLast(schools: any[]): any[] {
  const other = schools.filter(s => s.name === 'Other' || s.prefix === 'OTH');
  const rest = schools.filter(s => s.name !== 'Other' && s.prefix !== 'OTH');
  return [...rest, ...other];
}
