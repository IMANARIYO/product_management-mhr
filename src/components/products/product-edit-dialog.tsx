'use client';

import { useState, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Box, Typography, Alert, Card, CardContent,
  Select, MenuItem, FormControl, InputLabel, Chip
} from '@mui/material';
import { TrendingUp, TrendingDown, Inventory } from '@mui/icons-material';
import { useToastHandler } from '@/hooks/use-toast-handler';

interface Product {
  id: string;
  name: string;
  type: string;
  size: string;
  buyingPrice: string;
  sellingPrice: string;
  status: string;
  currentStock: number;
  image?: string;
}

interface ProductEditDialogProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  onUpdate: (productId: string, data: Record<string, unknown>) => Promise<{ success: boolean }>;
  loading: boolean;
}

export function ProductEditDialog({ open, onClose, product, onUpdate, loading }: ProductEditDialogProps) {
  const [formData, setFormData] = useState(() => {
    if (product) {
      return {
        name: product.name,
        type: product.type,
        size: product.size,
        buyingPrice: product.buyingPrice,
        sellingPrice: product.sellingPrice,
        status: product.status,
        image: product.image || ''
      };
    }
    return {
      name: '',
      type: '',
      size: '',
      buyingPrice: '',
      sellingPrice: '',
      status: '',
      image: ''
    };
  });

  const [warnings, setWarnings] = useState<string[]>([]);
  const [priceAnalysis, setPriceAnalysis] = useState({
    margin: 0,
    marginPercent: 0,
    buyingPriceChange: 0,
    sellingPriceChange: 0,
    buyingPriceChangePercent: 0,
    sellingPriceChangePercent: 0
  });

  const { showToast } = useToastHandler();

  const calculatePriceAnalysis = useCallback((oldBuying: string, oldSelling: string, newBuying: string, newSelling: string, currentStatus: string) => {
    const oldBuyingNum = parseFloat(oldBuying);
    const oldSellingNum = parseFloat(oldSelling);
    const newBuyingNum = parseFloat(newBuying);
    const newSellingNum = parseFloat(newSelling);

    const margin = newSellingNum - newBuyingNum;
    const marginPercent = newBuyingNum > 0 ? (margin / newBuyingNum) * 100 : 0;

    const buyingPriceChange = newBuyingNum - oldBuyingNum;
    const sellingPriceChange = newSellingNum - oldSellingNum;

    const buyingPriceChangePercent = oldBuyingNum > 0 ? (buyingPriceChange / oldBuyingNum) * 100 : 0;
    const sellingPriceChangePercent = oldSellingNum > 0 ? (sellingPriceChange / oldSellingNum) * 100 : 0;

    setPriceAnalysis({
      margin,
      marginPercent,
      buyingPriceChange,
      sellingPriceChange,
      buyingPriceChangePercent,
      sellingPriceChangePercent
    });

    // Generate warnings
    const newWarnings: string[] = [];

    if (margin <= 0) {
      newWarnings.push('⚠️ Negative or zero profit margin detected');
    }

    if (Math.abs(buyingPriceChangePercent) > 20) {
      newWarnings.push(`🔥 Buying price change exceeds 20% (${buyingPriceChangePercent.toFixed(1)}%)`);
    }

    if (Math.abs(sellingPriceChangePercent) > 20) {
      newWarnings.push(`🔥 Selling price change exceeds 20% (${sellingPriceChangePercent.toFixed(1)}%)`);
    }

    if (product && product.currentStock > 0 && currentStatus === 'ARCHIVED' && product.status === 'ACTIVE') {
      newWarnings.push(`📦 Cannot archive product with ${product.currentStock} units in stock`);
    }

    setWarnings(newWarnings);
  }, [product]);

  const handleFieldChange = (field: string, value: string) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);

    if ((field === 'buyingPrice' || field === 'sellingPrice' || field === 'status') && product) {
      calculatePriceAnalysis(
        product.buyingPrice,
        product.sellingPrice,
        field === 'buyingPrice' ? value : newFormData.buyingPrice,
        field === 'sellingPrice' ? value : newFormData.sellingPrice,
        field === 'status' ? value : newFormData.status
      );
    }
  };

  const handleSubmit = async () => {
    if (!product) return;

    // Validation
    if (!formData.name.trim()) {
      showToast({ type: 'error', title: 'Validation Error', message: 'Product name is required' });
      return;
    }

    const buyingPrice = parseFloat(formData.buyingPrice);
    const sellingPrice = parseFloat(formData.sellingPrice);

    if (isNaN(buyingPrice) || buyingPrice <= 0) {
      showToast({ type: 'error', title: 'Validation Error', message: 'Buying price must be greater than 0' });
      return;
    }

    if (isNaN(sellingPrice) || sellingPrice <= 0) {
      showToast({ type: 'error', title: 'Validation Error', message: 'Selling price must be greater than 0' });
      return;
    }

    // Check for negative margin confirmation
    if (sellingPrice <= buyingPrice) {
      const confirmed = window.confirm(
        `⚠️ Profit Margin Warning\n\n` +
        `Buying Price: ${buyingPrice.toFixed(2)}\n` +
        `Selling Price: ${sellingPrice.toFixed(2)}\n` +
        `Margin: ${(sellingPrice - buyingPrice).toFixed(2)} (${((sellingPrice - buyingPrice) / buyingPrice * 100).toFixed(1)}%)\n\n` +
        `This product will be sold at a loss or zero profit.\n` +
        `Do you want to proceed anyway?`
      );

      if (!confirmed) return;
    }

    // Check for archive with stock confirmation
    if (product.currentStock > 0 && formData.status === 'ARCHIVED' && product.status === 'ACTIVE') {
      const confirmed = window.confirm(
        `⚠️ Archive Warning\n\n` +
        `This product has ${product.currentStock} units in stock.\n\n` +
        `Archiving will:\n` +
        `• Hide product from active listings\n` +
        `• Prevent new purchase orders\n` +
        `• Keep stock data intact for audit\n\n` +
        `Are you sure you want to archive?`
      );

      if (!confirmed) return;
    }

    // Check for significant price changes
    if (Math.abs(priceAnalysis.buyingPriceChangePercent) > 20 || Math.abs(priceAnalysis.sellingPriceChangePercent) > 20) {
      const confirmed = window.confirm(
        `🔥 Significant Price Change Warning\n\n` +
        `Buying Price Change: ${priceAnalysis.buyingPriceChangePercent.toFixed(1)}%\n` +
        `Selling Price Change: ${priceAnalysis.sellingPriceChangePercent.toFixed(1)}%\n\n` +
        `Large price changes (>20%) will be flagged for management review.\n` +
        `Do you want to proceed?`
      );

      if (!confirmed) return;
    }

    const result = await onUpdate(product.id, formData);

    if (result?.success) {
      onClose();
    }
  };

  if (!product) return null;

  const hasChanges = Object.keys(formData).some(key =>
    formData[key as keyof typeof formData] !== (product as Product)[key as keyof Product]
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Edit Product</Typography>
          <Box display="flex" gap={1}>
            <Chip
              icon={<Inventory />}
              label={`${product.currentStock} in stock`}
              color={product.currentStock > 0 ? 'success' : 'error'}
              size="small"
            />
            <Chip
              label={product.status}
              color={product.status === 'ACTIVE' ? 'success' : 'default'}
              size="small"
            />
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {warnings.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              <strong>Warnings Detected:</strong>
            </Typography>
            {warnings.map((warning, index) => (
              <Typography key={index} variant="body2">
                {warning}
              </Typography>
            ))}
          </Alert>
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 2 }}>
          <TextField
            fullWidth
            label="Product Name"
            value={formData.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            required
          />

          <FormControl fullWidth>
            <InputLabel>Product Type</InputLabel>
            <Select
              value={formData.type}
              onChange={(e) => handleFieldChange('type', e.target.value)}
              label="Product Type"
            >
              <MenuItem value="BEER">Beer</MenuItem>
              <MenuItem value="SODA">Soda</MenuItem>
              <MenuItem value="WINE">Wine</MenuItem>
              <MenuItem value="SPIRIT">Spirit</MenuItem>
              <MenuItem value="LIQUOR">Liquor</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Size"
            value={formData.size}
            onChange={(e) => handleFieldChange('size', e.target.value)}
            required
            placeholder="e.g., 330ml, 750ml, 1L"
          />

          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={formData.status}
              onChange={(e) => handleFieldChange('status', e.target.value)}
              label="Status"
            >
              <MenuItem value="ACTIVE">Active</MenuItem>
              <MenuItem value="ARCHIVED">Archived</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Price Section */}
        <Card sx={{ mt: 2, mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              💰 Price Management
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
              <Box>
                <TextField
                  fullWidth
                  label="Buying Price"
                  type="number"
                  value={formData.buyingPrice}
                  onChange={(e) => handleFieldChange('buyingPrice', e.target.value)}
                  required
                  inputProps={{ min: 0, step: 0.01 }}
                  InputProps={{
                    startAdornment: priceAnalysis.buyingPriceChange !== 0 && (
                      <Box sx={{ mr: 1 }}>
                        {priceAnalysis.buyingPriceChange > 0 ? (
                          <TrendingUp color="success" fontSize="small" />
                        ) : (
                          <TrendingDown color="error" fontSize="small" />
                        )}
                      </Box>
                    )
                  }}
                />
                {priceAnalysis.buyingPriceChange !== 0 && (
                  <Typography variant="caption" color={priceAnalysis.buyingPriceChange > 0 ? 'success.main' : 'error.main'}>
                    {priceAnalysis.buyingPriceChange > 0 ? '+' : ''}{priceAnalysis.buyingPriceChange.toFixed(2)}
                    ({priceAnalysis.buyingPriceChangePercent > 0 ? '+' : ''}{priceAnalysis.buyingPriceChangePercent.toFixed(1)}%)
                  </Typography>
                )}
              </Box>

              <Box>
                <TextField
                  fullWidth
                  label="Selling Price"
                  type="number"
                  value={formData.sellingPrice}
                  onChange={(e) => handleFieldChange('sellingPrice', e.target.value)}
                  required
                  inputProps={{ min: 0, step: 0.01 }}
                  InputProps={{
                    startAdornment: priceAnalysis.sellingPriceChange !== 0 && (
                      <Box sx={{ mr: 1 }}>
                        {priceAnalysis.sellingPriceChange > 0 ? (
                          <TrendingUp color="success" fontSize="small" />
                        ) : (
                          <TrendingDown color="error" fontSize="small" />
                        )}
                      </Box>
                    )
                  }}
                />
                {priceAnalysis.sellingPriceChange !== 0 && (
                  <Typography variant="caption" color={priceAnalysis.sellingPriceChange > 0 ? 'success.main' : 'error.main'}>
                    {priceAnalysis.sellingPriceChange > 0 ? '+' : ''}{priceAnalysis.sellingPriceChange.toFixed(2)}
                    ({priceAnalysis.sellingPriceChangePercent > 0 ? '+' : ''}{priceAnalysis.sellingPriceChangePercent.toFixed(1)}%)
                  </Typography>
                )}
              </Box>
            </Box>

            <Box sx={{ mt: 2, p: 2, bgcolor: priceAnalysis.margin <= 0 ? 'error.light' : 'success.light', borderRadius: 1 }}>
              <Typography variant="body2" fontWeight="bold">
                💹 Profit Analysis
              </Typography>
              <Typography variant="body2">
                Margin: {priceAnalysis.margin.toFixed(2)} ({priceAnalysis.marginPercent.toFixed(1)}%)
              </Typography>
              {priceAnalysis.margin <= 0 && (
                <Typography variant="body2" color="error">
                  ⚠️ This product will be sold at a loss or zero profit
                </Typography>
              )}
            </Box>
          </CardContent>
        </Card>

        <TextField
          fullWidth
          label="Image URL (Optional)"
          value={formData.image}
          onChange={(e) => handleFieldChange('image', e.target.value)}
          placeholder="https://example.com/product-image.jpg"
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !hasChanges}
          color={warnings.length > 0 ? 'warning' : 'primary'}
        >
          {warnings.length > 0 ? 'Update with Warnings' : 'Update Product'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}