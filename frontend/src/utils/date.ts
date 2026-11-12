export const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Standard date formatter across all tables, forms and registers: DD/MON/YYYY
 * e.g. "12/Nov/2026"
 */
export function formatDate(val?: string | Date | null): string {
  if (!val) return '-';
  try {
    const raw = typeof val === 'string' ? val.trim() : val.toISOString();
    const datePart = raw.split('T')[0];
    const parts = datePart.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parts[2].padStart(2, '0');
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${day}/${MONTHS[monthIdx]}/${year}`;
      }
    }
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    const day = String(d.getDate()).padStart(2, '0');
    const month = MONTHS[d.getMonth()];
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(val);
  }
}

/**
 * Formats expiry date for medicines as MM/YYYY or DD/MON/YYYY
 */
export function formatExpiry(val?: string | null): string {
  if (!val) return '-';
  const parts = val.split('-');
  if (parts.length >= 2) {
    const monthIdx = parseInt(parts[1], 10) - 1;
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${MONTHS[monthIdx]}/${parts[0]}`;
    }
  }
  return formatDate(val);
}
