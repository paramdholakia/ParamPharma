export interface CompanySettings {
  id: number;
  company_name: string;
  legal_name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  gstin: string;
  pan: string;
  dl_number_20b: string;
  dl_number_21b: string;
  upi_id: string;
  bank_name: string;
  bank_branch: string;
  bank_account_no: string;
  bank_ifsc: string;
}

export interface Customer {
  id: number;
  party_name: string;
  customer_category?: string;
  mobile?: string;
  phone?: string;
  email?: string;
  billing_address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  pan?: string;
  dl_number?: string;
  credit_limit?: number;
  payment_terms_days?: number;
  current_balance: number;
}

export interface Product {
  id: number;
  product_code: string;
  medicine_name?: string;
  product_name: string;
  generic_name?: string;
  manufacturer?: string;
  category?: string;
  hsn_code?: string;
  packing?: string;
  mrp: number;
  ptr: number;
  pts: number;
  gst_rate: number;
  min_stock_level: number;
  total_stock?: number;
  batches?: Batch[];
}

export interface Batch {
  id: number;
  product_id: number;
  batch_number: string;
  expiry_date: string;
  mrp: number;
  ptr: number;
  pts: number;
  current_stock: number;
  status?: string;
}

export interface InvoiceItemPayload {
  product_id: number;
  batch_id: number;
  product_name: string;
  batch_number: string;
  expiry_date: string;
  packing?: string;
  hsn_code?: string;
  quantity: number;
  free_quantity: number;
  mrp: number;
  rate: number;
  discount_percent: number;
  gst_rate: number;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_amount: number;
}

export interface CustomerPaymentPayload {
  customer_id: number;
  amount: number;
  payment_date: string;
  payment_mode: string;
  reference_no?: string;
  bank_name?: string;
  cheque_date?: string;
  invoice_id?: number;
  notes?: string;
}

export interface LedgerEntry {
  id: number;
  transaction_date: string;
  reference_type: string;
  reference_id?: number;
  reference_number: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
  running_balance: number;
}

export interface DashboardMetrics {
  totalSalesToday: number;
  totalCollectionsToday: number;
  totalReceivables: number;
  lowStockCount: number;
  expiringBatchesCount: number;
}
