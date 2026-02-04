'use client';

import { useState, useEffect } from 'react';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, TextField, Box, Typography, Chip, Alert
} from '@mui/material';
import { useToastHandler } from '@/hooks/use-toast-handler';

interface PurchaseOrderItem {
  id: string;
  desiredQuantity: number;
  confirmedQuantity?: number | null;
  unitCost: string;
  totalCost: string;
  product: {
    id: string;
    name: string;
    size: string;
  };
}

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  status: string;
  items: PurchaseOrderItem[];
  creator: {
    fullName: string;
  };
  createdAt: Date;
  notes?: string | null;
}

interface ConfirmOrderDialogProps {
  open: boolean;
  onClose: () => void;
  order: PurchaseOrder | null;
  onConfirm: (confirmedItems: Array<{itemId: string; confirmedQuantity: number}>) => Promise<void>;
  loading: boolean;
}

export function ConfirmOrderDialog({ open, onClose, order, onConfirm, loading }: ConfirmOrderDialogProps) {
  const [confirmedQuantities, setConfirmedQuantities] = useState<{[itemId: string]: number}>({});
  const { showToast } = useToastHandler();

  useEffect(() => {
    if (order) {
      const initial: {[itemId: string]: number} = {};
      order.items.forEach(item => {
        initial[item.id] = item.confirmedQuantity || item.desiredQuantity;
      });
      setConfirmedQuantities(initial);
    }
  }, [order]);

  const updateConfirmedQuantity = (itemId: string, quantity: number) => {
    setConfirmedQuantities(prev => ({
      ...prev,
      [itemId]: quantity
    }));
  };

  const handleConfirm = async () => {
    if (!order) return;

    const confirmedItems = order.items.map(item => ({
      itemId: item.id,
      confirmedQuantity: confirmedQuantities[item.id] || 0
    }));

    const hasZeroQuantities = confirmedItems.some(item => item.confirmedQuantity <= 0);
    if (hasZeroQuantities) {
      showToast({ 
        type: 'warning', 
        title: 'Zero Quantities', 
        message: 'Items with 0 confirmed quantity will be removed from the order' 
      });
    }

    await onConfirm(confirmedItems);
  };

  if (!order) return null;

  const columns: GridColDef[] = [
    { 
      field: 'product', 
      headerName: 'Product', 
      flex: 1,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {params.value.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {params.value.size}
          </Typography>
        </Box>
      )
    },
    { 
      field: 'desiredQuantity', 
      headerName: 'Desired', 
      width: 80,
      renderCell: (params: GridRenderCellParams) => (
        <Chip label={params.value} size="small" color="info" />
      )
    },
    { 
      field: 'unitCost', 
      headerName: 'Unit Cost', 
      width: 100,
      renderCell: (params: GridRenderCellParams) => `$${parseFloat(params.value).toFixed(2)}`
    },
    {
      field: 'confirmedQuantity',
      headerName: 'Confirmed Qty',
      width: 140,
      renderCell: (params: GridRenderCellParams) => (
        <TextField
          type="number"
          size="small"
          value={confirmedQuantities[params.row.id] || 0}
          onChange={(e) => updateConfirmedQuantity(params.row.id, parseInt(e.target.value) || 0)}
          inputProps={{ min: 0 }}
          sx={{ width: '120px' }}
          color={
            (confirmedQuantities[params.row.id] || 0) !== params.row.desiredQuantity 
              ? 'warning' 
              : 'primary'
          }
        />
      )
    },
    { 
      field: 'confirmedTotal', 
      headerName: 'Confirmed Total', 
      width: 120,
      renderCell: (params: GridRenderCellParams) => {
        const confirmedQty = confirmedQuantities[params.row.id] || 0;
        const unitCost = parseFloat(params.row.unitCost);
        return `$${(confirmedQty * unitCost).toFixed(2)}`;
      }
    },
    {
      field: 'variance',
      headerName: 'Variance',
      width: 100,
      renderCell: (params: GridRenderCellParams) => {
        const confirmed = confirmedQuantities[params.row.id] || 0;
        const desired = params.row.desiredQuantity;
        const variance = confirmed - desired;
        
        if (variance === 0) return <Chip label="0" size="small" color="success" />;
        
        return (
          <Chip 
            label={variance > 0 ? `+${variance}` : variance.toString()} 
            size="small" 
            color={variance > 0 ? 'info' : 'warning'}
          />
        );
      }
    }
  ];

  const totalConfirmedCost = order.items.reduce((sum, item) => {
    const confirmedQty = confirmedQuantities[item.id] || 0;
    return sum + (confirmedQty * parseFloat(item.unitCost));
  }, 0);

  const totalDesiredCost = order.items.reduce((sum, item) => 
    sum + (item.desiredQuantity * parseFloat(item.unitCost)), 0
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Confirm Order {order.orderNumber}</Typography>
          <Chip label="SUBMITTED → CONFIRMED" color="warning" size="small" />
        </Box>
      </DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>
            📋 Phase 3: Admin Approval - Review and set confirmed quantities
          </Typography>
          <Typography variant="caption">
            • You can approve exact quantities, reduce, or increase as needed<br/>
            • confirmedQuantity can differ from desiredQuantity<br/>
            • Setting confirmedQuantity to 0 removes the item from the order<br/>
            • All items must have confirmedQuantity set before approval
          </Typography>
        </Alert>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2"><strong>Created by:</strong> {order.creator.fullName}</Typography>
          <Typography variant="body2"><strong>Created:</strong> {new Date(order.createdAt).toLocaleString()}</Typography>
          {order.notes && (
            <Typography variant="body2"><strong>Notes:</strong> {order.notes}</Typography>
          )}
        </Box>

        <Box sx={{ height: 400, mb: 2 }}>
          <DataGrid
            rows={order.items}
            columns={columns}
            hideFooter
            disableRowSelectionOnClick
            density="compact"
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Desired Total: ${totalDesiredCost.toFixed(2)}
            </Typography>
            <Typography variant="h6">
              Confirmed Total: ${totalConfirmedCost.toFixed(2)}
            </Typography>
          </Box>
          <Box textAlign="right">
            <Typography variant="body2" color="text.secondary">
              Items to order: {Object.values(confirmedQuantities).filter(qty => qty > 0).length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Variance: ${(totalConfirmedCost - totalDesiredCost).toFixed(2)}
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleConfirm} 
          variant="contained" 
          disabled={loading}
          color="success"
        >
          Confirm Order
        </Button>
      </DialogActions>
    </Dialog>
  );
}