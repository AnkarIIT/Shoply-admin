import { recordClientActivity, fetchApi } from './apiClient';

export interface FulfilmentItemRow {
  orderId: string;
  orderNumber: string;
  orderDate: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  itemTitle: string;
  itemSku: string;
  quantity: number;
  supplierName: string;
  supplierProductId: string;
  supplierCost: number;
  totalSupplierCost: number;
  supplierOrderId?: string;
  status: string;
}

export const fulfilmentService = {
  async getPendingFulfilments(): Promise<FulfilmentItemRow[]> {
    recordClientActivity();
    return fetchApi<FulfilmentItemRow[]>('/api/fulfilment');
  },

  generateOrderPacketText(row: FulfilmentItemRow): string {
    return `--- SHOPLY SUPPLIER FULFILMENT PACKET ---
Order Number: ${row.orderNumber}
Date: ${new Date(row.orderDate).toLocaleString()}
Product: ${row.itemTitle}
Supplier SKU: ${row.supplierProductId}
Quantity: ${row.quantity}
Supplier: ${row.supplierName}
Target Cost: ₹${row.supplierCost}

Shipping Destination:
Name: ${row.customerName}
Phone: ${row.customerPhone}
Address: ${row.shippingAddress}
----------------------------------------`;
  },
};