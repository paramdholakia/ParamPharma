export function formatCurrency(amount: number | string | undefined | null): string {
  const num = Number(amount) || 0;
  return `Rs. ${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(d.getDate()).padStart(2, '0');
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return String(dateString);
  }
}

export function formatExpiry(dateStr: string | undefined | null): string {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split('-');
    if (parts.length >= 2) {
      // YYYY-MM or YYYY-MM-DD
      const year = parts[0].slice(-2);
      const month = parts[1];
      return `${month}/${year}`;
    }
  } catch {}
  return String(dateStr);
}

export function isBatchExpiringSoon(expiryDate: string): 'expired' | 'critical' | 'safe' {
  if (!expiryDate) return 'safe';
  try {
    const exp = new Date(expiryDate);
    const now = new Date();
    const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'expired';
    if (diffDays <= 90) return 'critical';
  } catch {}
  return 'safe';
}

export function buildUpiDeepLink(
  upiId: string = 'aldholakia72@okicici',
  payeeName: string = 'PARAM PHARMA',
  amount: number,
  invoiceRef: string = ''
): string {
  const encName = encodeURIComponent(payeeName);
  const encNote = encodeURIComponent(`Bill ${invoiceRef} Param Pharma`);
  return `upi://pay?pa=${upiId}&pn=${encName}&am=${amount.toFixed(2)}&cu=INR&tn=${encNote}`;
}

export function buildWhatsAppLink(phone: string, text: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  return `whatsapp://send?phone=${targetPhone}&text=${encodeURIComponent(text)}`;
}
