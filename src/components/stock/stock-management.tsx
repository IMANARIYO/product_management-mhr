'use client';

import { useState, useEffect, useMemo } from 'react';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Select, MenuItem, TextField, Button, Card, CardContent, Typography, Switch, FormControlLabel, Tabs, Tab, Box, InputAdornment } from '@mui/material';
import { Search } from 'lucide-react';
import { Product, StockActionType } from '@/db/types';
import { getCurrentUser } from '@/app/actions/auth';
import { handleStockAction } from '@/app/actions/stock';
import { useToastHandler } from '@/hooks/use-toast-handler';

interface StockAdjustmentRow {
  id: string;
  productName: string;
  productSize: string;
  currentStock: number;
  quantity: number;
  actionType: StockActionType | '';
  reason: string;
}

interface ProductWithStock extends Product {
  currentStock: number;
}

interface StockManagementProps {
  products: ProductWithStock[];
}

export function StockManagement({ products }: StockManagementProps) {
  const [rows, setRows] = useState<StockAdjustmentRow[]>([]);
  const [userRole, setUserRole] = useState<'ADMIN' | 'EMPLOYEE'>('EMPLOYEE');
  const [loading, setLoading] = useState(false);
  const [useGlobalSettings, setUseGlobalSettings] = useState(true);
  const [globalActionType, setGlobalActionType] = useState<StockActionType | ''>('');
  const [globalReason, setGlobalReason] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const { showToast, handleActionResult } = useToastHandler();

  useEffect(() => {
    const fetchUser = async () => {
      const user = await getCurrentUser();
      if (user) {
        setUserRole(user.role);
      }
    };
    fetchUser();

    // Initialize rows from products
    const initialRows: StockAdjustmentRow[] = products.map(product => ({
      id: product.id,
      productName: product.name,
      productSize: product.size,
      currentStock: product.currentStock,
      quantity: 0,
      actionType: '',
      reason: '',
    }));
    setRows(initialRows);
  }, [products]);

  // Filter and search logic
  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      const matchesSearch = row.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           row.productSize.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = !typeFilter || products.find(p => p.id === row.id)?.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [rows, searchTerm, typeFilter, products]);

  const handleSubmitAll = async () => {
    if (useGlobalSettings) {
      if (!globalActionType) {
        showToast({ type: 'error', title: 'Validation Error', message: 'Action Type is required' });
        return;
      }
      if (!globalReason.trim()) {
        showToast({ type: 'error', title: 'Validation Error', message: 'Reason is required' });
        return;
      }

      const rowsWithQuantity = filteredRows.filter(row => row.quantity > 0);
      if (rowsWithQuantity.length === 0) {
        showToast({ type: 'error', title: 'Validation Error', message: 'At least one product must have quantity > 0' });
        return;
      }

      if (userRole === 'EMPLOYEE' && (globalActionType === 'SOLD' || globalActionType === 'BROKEN')) {
        showToast({ type: 'error', title: 'Permission Denied', message: 'Employees cannot perform SOLD or BROKEN actions' });
        return;
      }
    } else {
      const validRows = filteredRows.filter(row => row.quantity > 0 && row.actionType !== '' && row.reason.trim());
      if (validRows.length === 0) {
        showToast({ type: 'error', title: 'Validation Error', message: 'At least one product must have quantity, action type, and reason' });
        return;
      }

      if (userRole === 'EMPLOYEE') {
        const invalidRows = validRows.filter(row => row.actionType === 'SOLD' || row.actionType === 'BROKEN');
        if (invalidRows.length > 0) {
          showToast({ type: 'error', title: 'Permission Denied', message: 'Employees cannot perform SOLD or BROKEN actions' });
          return;
        }
      }
    }

    setLoading(true);

    try {
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      const rowsToProcess = useGlobalSettings 
        ? filteredRows.filter(row => row.quantity > 0)
        : filteredRows.filter(row => row.quantity > 0 && row.actionType !== '' && row.reason.trim());

      for (const row of rowsToProcess) {
        try {
          const result = await handleStockAction({
            productId: row.id,
            actionType: useGlobalSettings ? (globalActionType as StockActionType) : (row.actionType as StockActionType),
            quantity: row.quantity,
            reason: useGlobalSettings ? globalReason : row.reason,
          });

          handleActionResult(result);

          if (result.success && 'newStock' in result) {
            successCount++;
            setRows(prev => prev.map(r => 
              r.id === row.id 
                ? { ...r, quantity: 0, actionType: useGlobalSettings ? r.actionType : '', reason: useGlobalSettings ? r.reason : '', currentStock: result.newStock }
                : r
            ));
          } else {
            errorCount++;
            if (result.error) {
              errors.push(`${row.productName}: ${result.error}`);
            }
          }
        } catch (error) {
          errorCount++;
          errors.push(`${row.productName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      if (successCount > 0) {
        if (useGlobalSettings) {
          setGlobalActionType('');
          setGlobalReason('');
        }
      }
      
      if (errorCount > 0 && errors.length > 0) {
        showToast({ 
          type: 'error', 
          title: `Failed to update ${errorCount} products`, 
          message: errors.slice(0, 3).join('; ') + (errors.length > 3 ? '...' : '')
        });
      }
    } catch (error) {
      showToast({ 
        type: 'error', 
        title: 'System Error', 
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      });
    } finally {
      setLoading(false);
    }
  };

  const updateRow = (id: string, field: keyof StockAdjustmentRow, value: string | number) => {
    setRows(prev => prev.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const tableColumns: GridColDef[] = [
    {
      field: 'productName',
      headerName: 'Product',
      width: 150,
      flex: 1,
    },
    {
      field: 'productSize',
      headerName: 'Size',
      width: 80,
    },
    {
      field: 'currentStock',
      headerName: 'Stock',
      width: 80,
      renderCell: (params) => `${params.value}`,
    },
    {
      field: 'quantity',
      headerName: 'Qty',
      width: 80,
      renderCell: (params) => (
        <TextField
          type="number"
          value={params.value || ''}
          onChange={(e) => updateRow(params.id as string, 'quantity', Number(e.target.value))}
          size="small"
          inputProps={{ min: 0 }}
          sx={{ width: '70px' }}
        />
      ),
    },
    ...(!useGlobalSettings ? [
      {
        field: 'actionType',
        headerName: 'Action',
        width: 120,
        renderCell: (params: GridRenderCellParams) => (
          <Select
            value={params.value || ''}
            onChange={(e) => updateRow(params.id as string, 'actionType', e.target.value)}
            size="small"
            displayEmpty
            sx={{ width: '110px' }}
          >
            <MenuItem value="">Select</MenuItem>
            <MenuItem value="STOCK_IN">Stock In</MenuItem>
            {userRole === 'ADMIN' && <MenuItem value="SOLD">Sold</MenuItem>}
            {userRole === 'ADMIN' && <MenuItem value="BROKEN">Broken</MenuItem>}
            <MenuItem value="COUNTED">Counted</MenuItem>
          </Select>
        ),
      },
      {
        field: 'reason',
        headerName: 'Reason',
        width: 150,
        flex: 1,
        renderCell: (params: GridRenderCellParams) => (
          <TextField
            value={params.value || ''}
            onChange={(e) => updateRow(params.id as string, 'reason', e.target.value)}
            size="small"
            placeholder="Reason"
            fullWidth
          />
        ),
      },
    ] : []),
  ];

  const uniqueTypes = [...new Set(products.map(p => p.type))];

  return (
    <div className="p-2 sm:p-4">
      <h2 className="text-xl sm:text-2xl font-bold mb-3">Stock Adjustment</h2>
      
      {/* View Mode Tabs */}
      <Tabs value={viewMode} onChange={(_, value) => setViewMode(value)} className="mb-4">
        <Tab label="Cards" value="cards" />
        <Tab label="Table" value="table" />
      </Tabs>

      {/* Search and Filters */}
      <Card className="mb-4">
        <CardContent className="p-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextField
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search className="h-4 w-4" />
                  </InputAdornment>
                ),
              }}
            />
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              size="small"
              displayEmpty
            >
              <MenuItem value="">All Types</MenuItem>
              {uniqueTypes.map(type => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Mode Toggle */}
      <Card className="mb-4">
        <CardContent className="p-3">
          <FormControlLabel
            control={
              <Switch
                checked={useGlobalSettings}
                onChange={(e) => setUseGlobalSettings(e.target.checked)}
              />
            }
            label="Use Global Settings"
            className="mb-2"
          />
          <Typography variant="body2" className="text-gray-600 text-xs">
            {useGlobalSettings 
              ? 'Set action type and reason once for all products'
              : 'Set action type and reason individually for each product'
            }
          </Typography>
        </CardContent>
      </Card>

      {/* Global Controls */}
      {useGlobalSettings && (
        <Card className="mb-4">
          <CardContent className="p-3">
            <Typography variant="h6" className="mb-3 text-sm font-semibold">Global Settings</Typography>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Action Type *</label>
                <Select
                  value={globalActionType}
                  onChange={(e) => setGlobalActionType(e.target.value as StockActionType | '')}
                  size="small"
                  fullWidth
                  displayEmpty
                >
                  <MenuItem value="">Select Action</MenuItem>
                  <MenuItem value="STOCK_IN">Stock In</MenuItem>
                  {userRole === 'ADMIN' && <MenuItem value="SOLD">Sold</MenuItem>}
                  {userRole === 'ADMIN' && <MenuItem value="BROKEN">Broken</MenuItem>}
                  <MenuItem value="COUNTED">Counted</MenuItem>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Reason *</label>
                <TextField
                  value={globalReason}
                  onChange={(e) => setGlobalReason(e.target.value)}
                  size="small"
                  placeholder="Enter reason"
                  fullWidth
                  multiline
                  rows={2}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Content based on view mode */}
      {viewMode === 'cards' ? (
        /* Cards View */
        <div className="space-y-3">
          {filteredRows.map((row) => (
            <Card key={row.id} className="border">
              <CardContent className="p-3">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-medium text-sm">{row.productName}</h3>
                    <p className="text-xs text-gray-500">{row.productSize}</p>
                  </div>
                  <span className="text-xs text-gray-500">{row.currentStock} units</span>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">Quantity</label>
                    <TextField
                      type="number"
                      value={row.quantity || ''}
                      onChange={(e) => updateRow(row.id, 'quantity', Number(e.target.value))}
                      size="small"
                      inputProps={{ min: 0 }}
                      fullWidth
                      placeholder="0"
                    />
                  </div>
                  
                  {!useGlobalSettings && (
                    <>
                      <div>
                        <label className="block text-xs font-medium mb-1">Action Type *</label>
                        <Select
                          value={row.actionType}
                          onChange={(e) => updateRow(row.id, 'actionType', e.target.value)}
                          size="small"
                          fullWidth
                          displayEmpty
                        >
                          <MenuItem value="">Select Action</MenuItem>
                          <MenuItem value="STOCK_IN">Stock In</MenuItem>
                          {userRole === 'ADMIN' && <MenuItem value="SOLD">Sold</MenuItem>}
                          {userRole === 'ADMIN' && <MenuItem value="BROKEN">Broken</MenuItem>}
                          <MenuItem value="COUNTED">Counted</MenuItem>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Reason *</label>
                        <TextField
                          value={row.reason}
                          onChange={(e) => updateRow(row.id, 'reason', e.target.value)}
                          size="small"
                          placeholder="Enter reason"
                          fullWidth
                          multiline
                          rows={2}
                        />
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Table View */
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={filteredRows}
            columns={tableColumns}
            initialState={{
              pagination: {
                paginationModel: {
                  pageSize: 15,
                },
              },
            }}
            pageSizeOptions={[10, 15, 25, 50]}
            disableRowSelectionOnClick
            density="compact"
            sx={{
              '& .MuiDataGrid-cell': {
                padding: '4px',
              },
            }}
          />
        </Box>
      )}
      
      {/* Submit Button */}
      <div className="mt-4 sticky bottom-4">
        <Button 
          variant="contained" 
          onClick={handleSubmitAll}
          disabled={loading}
          fullWidth
          size="large"
          className="py-3"
        >
          {loading ? 'Saving Changes...' : `Save All Changes (${filteredRows.filter(r => r.quantity > 0).length})`}
        </Button>
      </div>
    </div>
  );
}