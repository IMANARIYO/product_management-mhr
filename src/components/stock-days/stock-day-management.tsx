'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Button, TextField, Dialog, DialogTitle, DialogContent, Table, TableHead, TableRow, TableCell, TableBody, Chip } from '@mui/material';
import { CheckCircle, Add, Visibility } from '@mui/icons-material';
import { toast } from 'sonner';
import { getCurrentUser } from '@/app/actions/auth';
import { getCurrentStockDay, openStockDay, verifyStockSnapshot, verifyStockDay, addStockToSnapshot } from '@/app/actions/stock-days';
import { StockDayStatus } from '@/db/types';

interface StockSnapshot {
  id: string;
  productId: string;
  openingStock: number;
  stockIn: number;
  stockOut: number;
  closingStock: number;
  isOutOfStock: number;
  product: {
    id: string;
    name: string;
    size: string;
  };
}

interface StockDay {
  id: string;
  businessDate: Date;
  status: StockDayStatus;
  snapshots: StockSnapshot[];
}

interface CurrentUser {
  id: string;
  fullName: string;
  role: 'ADMIN' | 'EMPLOYEE';
}

export function StockDayManagement() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [stockDay, setStockDay] = useState<StockDay | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [addStockDialogOpen, setAddStockDialogOpen] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<StockSnapshot | null>(null);
  const [verifiedQuantity, setVerifiedQuantity] = useState(0);
  const [addQuantity, setAddQuantity] = useState(0);
  const [addReason, setAddReason] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [userResult, stockDayResult] = await Promise.all([
        getCurrentUser(),
        getCurrentStockDay()
      ]);

      if (userResult) setUser(userResult as CurrentUser);
      if (stockDayResult.success && stockDayResult.stockDay) {
        setStockDay(stockDayResult.stockDay);
      }
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenStockDay = async () => {
    setLoading(true);
    try {
      const result = await openStockDay();
      if (result.success) {
        toast.success('Stock day opened successfully');
        fetchData();
      } else {
        toast.error(result.error || 'Failed to open stock day');
      }
    } catch (error) {
      toast.error('Failed to open stock day');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyStock = (snapshot: StockSnapshot) => {
    setSelectedSnapshot(snapshot);
    setVerifiedQuantity(snapshot.openingStock);
    setVerifyDialogOpen(true);
  };

  const handleConfirmVerify = async () => {
    if (!selectedSnapshot || !stockDay) return;

    setLoading(true);
    try {
      const result = await verifyStockSnapshot(stockDay.id, selectedSnapshot.productId, verifiedQuantity);
      if (result.success) {
        toast.success('Stock verified successfully');
        setVerifyDialogOpen(false);
        setSelectedSnapshot(null);
        fetchData();
      } else {
        toast.error(result.error || 'Failed to verify stock');
      }
    } catch (error) {
      toast.error('Failed to verify stock');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = (snapshot: StockSnapshot) => {
    setSelectedSnapshot(snapshot);
    setAddQuantity(0);
    setAddReason('');
    setAddStockDialogOpen(true);
  };

  const handleConfirmAddStock = async () => {
    if (!selectedSnapshot || !stockDay || addQuantity <= 0) return;

    setLoading(true);
    try {
      const result = await addStockToSnapshot(stockDay.id, selectedSnapshot.productId, addQuantity, addReason);
      if (result.success) {
        toast.success('Stock added successfully');
        setAddStockDialogOpen(false);
        setSelectedSnapshot(null);
        fetchData();
      } else {
        toast.error(result.error || 'Failed to add stock');
      }
    } catch (error) {
      toast.error('Failed to add stock');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyStockDay = async () => {
    if (!stockDay) return;

    setLoading(true);
    try {
      const result = await verifyStockDay(stockDay.id);
      if (result.success) {
        toast.success('Stock day verified successfully');
        fetchData();
      } else {
        toast.error(result.error || 'Failed to verify stock day');
      }
    } catch (error) {
      toast.error('Failed to verify stock day');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: StockDayStatus) => {
    switch (status) {
      case 'OPEN': return 'primary';
      case 'VERIFIED': return 'success';
      case 'CLOSED': return 'default';
      default: return 'default';
    }
  };

  if (!user) return null;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Stock Day Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage daily stock verification and tracking
          </p>
        </div>
        {!stockDay && (
          <Button
            variant="contained"
            onClick={handleOpenStockDay}
            disabled={loading}
          >
            Open Stock Day
          </Button>
        )}
      </div>

      {stockDay ? (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <Typography variant="h6">
                    Stock Day - {new Date(stockDay.businessDate).toDateString()}
                  </Typography>
                  <Chip 
                    label={stockDay.status} 
                    color={getStatusColor(stockDay.status)}
                    size="small"
                    className="mt-2"
                  />
                </div>
                {stockDay.status === 'OPEN' && user.role === 'ADMIN' && (
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<CheckCircle />}
                    onClick={handleVerifyStockDay}
                    disabled={loading}
                  >
                    Verify Stock Day
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <Typography variant="h6" className="mb-4">Product Stock Verification</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell>Opening Stock</TableCell>
                    <TableCell>Stock In</TableCell>
                    <TableCell>Stock Out</TableCell>
                    <TableCell>Closing Stock</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stockDay.snapshots.map((snapshot) => (
                    <TableRow key={snapshot.id}>
                      <TableCell>
                        {snapshot.product.name} ({snapshot.product.size})
                      </TableCell>
                      <TableCell>{snapshot.openingStock}</TableCell>
                      <TableCell>{snapshot.stockIn}</TableCell>
                      <TableCell>{snapshot.stockOut}</TableCell>
                      <TableCell>{snapshot.closingStock}</TableCell>
                      <TableCell>
                        {snapshot.isOutOfStock ? (
                          <Chip label="Out of Stock" color="error" size="small" />
                        ) : (
                          <Chip label="In Stock" color="success" size="small" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="small"
                            startIcon={<Visibility />}
                            onClick={() => handleVerifyStock(snapshot)}
                            disabled={stockDay.status !== 'OPEN'}
                          >
                            Verify
                          </Button>
                          <Button
                            size="small"
                            startIcon={<Add />}
                            onClick={() => handleAddStock(snapshot)}
                            disabled={stockDay.status !== 'OPEN'}
                          >
                            Add Stock
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <Typography variant="h6" className="mb-2">No Stock Day Open</Typography>
            <Typography color="textSecondary" className="mb-4">
              Open a stock day to start tracking daily inventory
            </Typography>
            <Button
              variant="contained"
              onClick={handleOpenStockDay}
              disabled={loading}
            >
              Open Stock Day
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={verifyDialogOpen} onClose={() => setVerifyDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Verify Stock</DialogTitle>
        <DialogContent>
          {selectedSnapshot && (
            <div className="space-y-4 mt-2">
              <Typography>
                Product: {selectedSnapshot.product.name} ({selectedSnapshot.product.size})
              </Typography>
              <Typography>
                Current Opening Stock: {selectedSnapshot.openingStock}
              </Typography>
              <TextField
                fullWidth
                type="number"
                label="Verified Quantity"
                value={verifiedQuantity}
                onChange={(e) => setVerifiedQuantity(parseInt(e.target.value) || 0)}
                inputProps={{ min: 0 }}
              />
              <div className="flex justify-end gap-2">
                <Button onClick={() => setVerifyDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleConfirmVerify} variant="contained" disabled={loading}>
                  Verify
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={addStockDialogOpen} onClose={() => setAddStockDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Stock</DialogTitle>
        <DialogContent>
          {selectedSnapshot && (
            <div className="space-y-4 mt-2">
              <Typography>
                Product: {selectedSnapshot.product.name} ({selectedSnapshot.product.size})
              </Typography>
              <TextField
                fullWidth
                type="number"
                label="Quantity to Add"
                value={addQuantity}
                onChange={(e) => setAddQuantity(parseInt(e.target.value) || 0)}
                inputProps={{ min: 1 }}
              />
              <TextField
                fullWidth
                label="Reason"
                value={addReason}
                onChange={(e) => setAddReason(e.target.value)}
                placeholder="e.g., New delivery, Found extra stock"
              />
              <div className="flex justify-end gap-2">
                <Button onClick={() => setAddStockDialogOpen(false)}>Cancel</Button>
                <Button 
                  onClick={handleConfirmAddStock} 
                  variant="contained" 
                  disabled={loading || addQuantity <= 0}
                >
                  Add Stock
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}