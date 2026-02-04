'use client';

import { useState, useEffect } from 'react';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, TextField, Box, Typography, Chip
} from '@mui/material';
import { useToastHandler } from '@/hooks/use-toast-handler';

interface Product {
  id: string;
  name: string;
  size: string;
  buyingPrice: string;
  currentStock: number;
}

interface DraftItem {
  productId: string;
  productName: string;
  productSize: string;
  unitCost: number;
  desiredQuantity: number;
  totalCost: number;
  currentStock: number;
}

interface DraftOrderDialogProps {
  open: boolean;
  onClose: () => void;
  products: Product[];
  onSubmit: (items: Array<{productId: string; quantity: number; unitCost: string}>, notes: string) => Promise<void>;
  loading: boolean;
}

export function DraftOrderDialog({ open, onClose, products, onSubmit, loading }: DraftOrderDialogProps) {
  const [items, setItems] = useState<DraftItem[]>([]);
  const [notes, setNotes] = useState('');
  const { showToast } = useToastHandler();

  useEffect(() => {
    if (products.length > 0) {
      setItems(products.map(p => ({
        productId: p.id,
        productName: p.name,
        productSize: p.size,
        unitCost: parseFloat(p.buyingPrice),
        desiredQuantity: 0,
        totalCost: 0,
        currentStock: p.currentStock
      })));
    }
  }, [products]);

  const updateQuantity = (productId: string, quantity: number) => {
    setItems(prev => prev.map(item => 
      item.productId === productId 
        ? { ...item, desiredQuantity: quantity, totalCost: quantity * item.unitCost }
        : item
    ));
  };

  const handleSubmit = async () => {
    const validItems = items.filter(item => item.desiredQuantity > 0);
    if (validItems.length === 0) {
      showToast({ type: 'error', title: 'Validation Error', message: 'At least one item with quantity > 0 is required' });
      return;
    }

    await onSubmit(
      validItems.map(item => ({
        productId: item.productId,
        quantity: item.desiredQuantity,
        unitCost: item.unitCost.toString()
      })),
      notes
    );
  };

  const totalOrderCost = items.reduce((sum, item) => sum + item.totalCost, 0);

  const columns: GridColDef[] = [
    { 
      field: 'productName', 
      headerName: 'Product', 
      flex: 1,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">{params.value}</Typography>
          <Typography variant="caption" color="text.secondary">{params.row.productSize}</Typography>
        </Box>
      )
    },
    { 
      field: 'currentStock', 
      headerName: 'Current Stock', 
      width: 100,
      renderCell: (params: GridRenderCellParams) => (
        <Chip 
          label={params.value} 
          size="small" 
          color={params.value > 0 ? 'success' : 'error'}
        />
      )
    },
    { 
      field: 'unitCost', 
      headerName: 'Unit Cost', 
      width: 100,
      renderCell: (params: GridRenderCellParams) => `$${params.value.toFixed(2)}`
    },
    {
      field: 'desiredQuantity',
      headerName: 'Desired Qty',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <TextField
          type="number"
          size="small"
          value={params.value}
          onChange={(e) => updateQuantity(params.row.productId, parseInt(e.target.value) || 0)}
          inputProps={{ min: 0 }}
          sx={{ width: '100px' }}
        />
      )
    },
    { 
      field: 'totalCost', 
      headerName: 'Total Cost', 
      width: 100,
      renderCell: (params: GridRenderCellParams) => `$${params.value.toFixed(2)}`
    }
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Create Purchase Order - DRAFT</Typography>
          <Chip label="DRAFT" color="default" size="small" />
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            📝 Phase 1: Order Creation - Enter desired quantities for products you want to order
          </Typography>
          <Typography variant="caption" color="text.secondary">
            • Unit costs are read-only (from product.buyingPrice)
            • Total cost = desiredQuantity × unitCost (calculated automatically)
            • You can edit this order until you submit it for approval
          </Typography>
        </Box>

        <TextField
          fullWidth
          multiline
          rows={2}
          label="Order Notes (Optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          sx={{ mb: 2 }}
          placeholder="Add any notes about this purchase order..."
        />

        <Box sx={{ height: 400, mb: 2 }}>
          <DataGrid
            rows={items.map((item, index) => ({ id: index, ...item }))}
            columns={columns}
            hideFooter
            disableRowSelectionOnClick
            density="compact"
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="h6">
            Total Order Cost: ${totalOrderCost.toFixed(2)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Items with quantity: {items.filter(item => item.desiredQuantity > 0).length}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading}
        >
          Save as Draft
        </Button>
      </DialogActions>
    </Dialog>
  );
}