'use client';

import { Dialog, DialogTitle, DialogContent, Typography, Chip, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
import { PurchaseOrderStatus } from '@/db/types';

interface ViewOrderDialogProps {
  open: boolean;
  onClose: () => void;
  order: {
    id: string;
    orderNumber: string;
    totalAmount: string;
    status: PurchaseOrderStatus;
    notes?: string | null;
    items: Array<{
      id: string;
      quantity: number;
      unitCost: string;
      totalCost: string;
      product: {
        name: string;
        size: string;
      };
    }>;
  } | null;
}

export function ViewOrderDialog({ open, onClose, order }: ViewOrderDialogProps) {
  const getStatusColor = (status: PurchaseOrderStatus) => {
    const colors: Record<PurchaseOrderStatus, 'default' | 'primary' | 'success' | 'info' | 'error'> = {
      DRAFT: 'default',
      SUBMITTED: 'primary',
      CONFIRMED: 'success',
      EXECUTED_AT_MARKET: 'info',
      REJECTED_FOR_STOCK: 'error',
      STOCK_ENTERED: 'success',
      CANCELLED: 'error'
    };
    return colors[status] || 'default';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Purchase Request Details</DialogTitle>
      <DialogContent>
        {order && (
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Typography variant="subtitle2">Order Number</Typography>
                <Typography>{order.orderNumber}</Typography>
              </div>
              <div>
                <Typography variant="subtitle2">Status</Typography>
                <Chip 
                  label={order.status.replace('_', ' ')} 
                  color={getStatusColor(order.status)} 
                  size="small" 
                />
              </div>
              <div>
                <Typography variant="subtitle2">Total Amount</Typography>
                <Typography>${order.totalAmount}</Typography>
              </div>
            </div>

            <div>
              <Typography variant="subtitle2" className="mb-2">Items</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell>Quantity</TableCell>
                    <TableCell>Unit Cost</TableCell>
                    <TableCell>Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.product.name} ({item.product.size})</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>${item.unitCost}</TableCell>
                      <TableCell>${item.totalCost}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {order.notes && (
              <div>
                <Typography variant="subtitle2">Notes</Typography>
                <Typography>{order.notes}</Typography>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}