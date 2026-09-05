import { Order, Product } from '../types';

/**
 * Escapes a cell value for standard CSV compliance (RFC 4180).
 */
function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) {
    return '""';
  }
  const str = String(val);
  // If string contains quotes, commas, newlines, or carriage returns, wrap in quotes and escape quotes
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Triggers a browser download of a CSV file given headers and rows.
 */
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): void {
  const headerLine = headers.map(escapeCsvCell).join(',');
  const rowLines = rows.map((row) => row.map(escapeCsvCell).join(','));
  const csvContent = [headerLine, ...rowLines].join('\r\n');

  // Prepend UTF-8 BOM (\uFEFF) to ensure Microsoft Excel and Numbers parse Unicode/Currency properly
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports the currently viewed/filtered orders to a CSV file.
 */
export function exportOrdersToCsv(orders: Order[], filterTag?: string): void {
  const headers = [
    'Order ID',
    'Order Number',
    'Date & Time',
    'Customer Name',
    'Customer Email',
    'Customer Phone',
    'Order Status',
    'Payment Status',
    'Payment Method',
    'UTR / UPI Ref',
    'Payment Verified By',
    'Payment Verified At',
    'Items Summary',
    'Total Items Qty',
    'Subtotal (INR)',
    'Shipping Fee (INR)',
    'Discount (INR)',
    'Total Amount (INR)',
    'Est. Supplier Cost (INR)',
    'Est. Margin (INR)',
    'Shipping Recipient',
    'Shipping Phone',
    'Street Address',
    'City',
    'State',
    'Postal Code',
    'Country',
    'Supplier Order ID',
    'Courier / Carrier',
    'AWB / Tracking Number',
    'Tracking URL',
    'Internal Notes'
  ];

  const rows = orders.map((order) => {
    const itemsSummary = (order.items || [])
      .map((item) => `${item.productTitle || (item as any).title || 'Item'} (Qty: ${item.quantity}, Price: ₹${item.unitPrice ?? (item as any).price ?? 0})`)
      .join('; ');

    const totalQty = (order.items || []).reduce((sum, it) => sum + (it.quantity || 1), 0);

    const formattedDate = order.createdAt 
      ? new Date(order.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) 
      : '';

    const verifiedDate = order.paymentVerifiedAt
      ? new Date(order.paymentVerifiedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
      : '';

    return [
      order.id,
      order.orderNumber,
      formattedDate,
      order.customer?.name || '',
      order.customer?.email || '',
      order.customer?.phone || '',
      order.orderStatus,
      order.paymentStatus,
      order.paymentMethod,
      order.utrNumber || '',
      order.paymentVerifiedBy || '',
      verifiedDate,
      itemsSummary,
      totalQty,
      order.totalAmount - (order.shippingFee || 0) + (order.discountAmount || 0),
      order.shippingFee || 0,
      order.discountAmount || 0,
      order.totalAmount,
      order.totalSupplierCost || 0,
      order.estimatedMargin || (order.totalAmount - (order.totalSupplierCost || 0)),
      order.shippingAddress?.fullName || order.customer?.name || '',
      order.shippingAddress?.phone || order.customer?.phone || '',
      order.shippingAddress?.street || '',
      order.shippingAddress?.city || '',
      order.shippingAddress?.state || '',
      order.shippingAddress?.postalCode || '',
      order.shippingAddress?.country || 'India',
      order.supplierOrderId || '',
      order.courierName || order.carrier || '',
      order.trackingNumber || order.awbNumber || '',
      order.trackingUrl || '',
      order.notes || ''
    ];
  });

  const cleanFilter = filterTag && filterTag !== 'ALL' 
    ? `-${filterTag.toLowerCase().replace(/[^a-z0-9]/g, '_')}` 
    : '';
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `shoply-orders${cleanFilter}-${dateStr}.csv`;

  downloadCsv(filename, headers, rows);
}

/**
 * Exports the currently viewed/filtered products to a CSV file.
 */
export function exportProductsToCsv(products: Product[], categoryTag?: string): void {
  const headers = [
    'Product ID',
    'SKU',
    'Title',
    'Category',
    'Status',
    'Stock',
    'MRP (INR)',
    'Selling Price (INR)',
    'Supplier Cost (INR)',
    'Gross Margin (INR)',
    'Margin (%)',
    'Units Sold',
    'Total Revenue (INR)',
    'Supplier Name',
    'Supplier ID',
    'Supplier Product ID',
    'Supplier SKU',
    'Supplier Catalog URL',
    'Created Date',
    'Updated Date'
  ];

  const rows = products.map((prod) => {
    const marginAmount = prod.sellingPrice - (prod.supplierCost || 0);
    const marginPercent = prod.sellingPrice > 0 
      ? Math.round((marginAmount / prod.sellingPrice) * 100) 
      : 0;

    const formattedCreated = prod.createdAt
      ? new Date(prod.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
      : '';
    const formattedUpdated = prod.updatedAt
      ? new Date(prod.updatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
      : '';

    return [
      prod.id,
      prod.sku,
      prod.title,
      prod.category,
      prod.status,
      prod.stock,
      prod.mrp,
      prod.sellingPrice,
      prod.supplierCost,
      marginAmount,
      `${marginPercent}%`,
      prod.soldCount || 0,
      prod.revenue || ((prod.soldCount || 0) * prod.sellingPrice),
      prod.supplierName || '',
      prod.supplierId || '',
      prod.supplierProductId || '',
      prod.supplierSku || '',
      prod.supplierUrl || '',
      formattedCreated,
      formattedUpdated
    ];
  });

  const cleanCategory = categoryTag && categoryTag !== 'ALL'
    ? `-${categoryTag.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
    : '';
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `shoply-products${cleanCategory}-${dateStr}.csv`;

  downloadCsv(filename, headers, rows);
}
