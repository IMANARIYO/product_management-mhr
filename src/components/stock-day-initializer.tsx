/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState } from "react";
import { Button, Card, CardContent, Typography, Box, Alert, Tooltip } from "@mui/material";
import { initializeStockDay, verifyProductStock, verifyStockDay, closeStockDay } from "@/app/actions/stock-day-init";

interface StockDayResult {
  stockDay: {
    id: string;
    businessDate: Date;
    status: string;
    openedAt: Date;
    verifiedAt?: Date | null;
    closedAt?: Date | null;
  };
  snapshots: Array<{
    id: string;
    expectedOpeningStock: number;
    openingStock: number;
    variance: number | null;
    isVerified: number;
  }>;
}

export default function StockDayInitializer() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StockDayResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInitialize = async () => {
    setLoading(true);
    setError(null);
    try {
      const today = new Date();
      const result = await initializeStockDay(today);
      setResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initialize stock day");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyProduct = async (snapshotId: string, actualCount: number) => {
    setLoading(true);
    setError(null);
    try {
      await verifyProductStock(snapshotId, actualCount);
      // Refresh the data
      const today = new Date();
      const refreshed = await initializeStockDay(today);
      setResult(refreshed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify product");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyStockDay = async () => {
    if (!result?.stockDay) return;

    setLoading(true);
    setError(null);
    try {
      await verifyStockDay(result.stockDay.id);
      // Refresh the data
      const today = new Date();
      const refreshed = await initializeStockDay(today);
      setResult(refreshed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify stock day");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseStockDay = async () => {
    if (!result?.stockDay) return;

    setLoading(true);
    setError(null);
    try {
      await closeStockDay(result.stockDay.id);
      // Refresh the data
      const today = new Date();
      const refreshed = await initializeStockDay(today);
      setResult(refreshed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to close stock day");
    } finally {
      setLoading(false);
    }
  };

  const allProductsVerified = result?.snapshots?.every(snapshot => snapshot.isVerified === 1) ?? false;
  const unverifiedCount = result?.snapshots?.filter(snapshot => snapshot.isVerified !== 1).length ?? 0;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Stock Day Initialization Demo
      </Typography>

      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          onClick={handleInitialize}
          disabled={loading}
          sx={{ mr: 2 }}
        >
          Initialize Today's Stock Day
        </Button>

        {result?.stockDay && (
          <>
            {result.stockDay.status === "OPEN" && (
              <Tooltip
                title={!allProductsVerified ? `Please verify all ${unverifiedCount} remaining products before proceeding` : ""}
                arrow
              >
                <span>
                  <Button
                    variant="outlined"
                    onClick={handleVerifyStockDay}
                    disabled={loading || !allProductsVerified}
                    sx={{ mr: 2 }}
                  >
                    Verify Stock Day:::@@@
                  </Button>
                </span>
              </Tooltip>
            )}

            {result.stockDay.status === "VERIFIED" && (
              <Button
                variant="outlined"
                color="error"
                onClick={handleCloseStockDay}
                disabled={loading}
              >
                Close Stock Day
              </Button>
            )}
          </>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {result && (
        <>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <div className="flex justify-between items-center">
                <div>
                  <Typography variant="h6" gutterBottom>
                    Stock Day Status: {result.stockDay.status}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Business Date: {new Date(result.stockDay.businessDate).toLocaleDateString()}
                  </Typography>
                </div>
                {result.stockDay.status === "OPEN" && (
                  <div className="text-center">
                    <Typography variant="h4" color={unverifiedCount > 0 ? "error" : "success"}>
                      {unverifiedCount}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Products to Verify
                    </Typography>
                  </div>
                )}
              </div>
              <Typography variant="body2" color="text.secondary">
                Opened At: {new Date(result.stockDay.openedAt).toLocaleString()}
              </Typography>
              {result.stockDay.verifiedAt && (
                <Typography variant="body2" color="text.secondary">
                  Verified At: {new Date(result.stockDay.verifiedAt).toLocaleString()}
                </Typography>
              )}
              {result.stockDay.closedAt && (
                <Typography variant="body2" color="text.secondary">
                  Closed At: {new Date(result.stockDay.closedAt).toLocaleString()}
                </Typography>
              )}
            </CardContent>
          </Card>

          {result?.snapshots && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Product Snapshots ({result.snapshots.length})
                </Typography>

                <Box sx={{ maxHeight: 400, overflow: "auto" }}>
                  {result.snapshots.map((snapshot, index: number) => (
                    <Box
                      key={snapshot.id}
                      sx={{
                        p: 2,
                        mb: 1,
                        border: 1,
                        borderColor: "divider",
                        borderRadius: 1,
                        bgcolor: snapshot.isVerified ? "success.light" : "grey.100",
                      }}
                    >
                      <Typography variant="subtitle2">
                        Product {index + 1} - Expected: {snapshot.expectedOpeningStock}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Opening: {snapshot.openingStock} |
                        Variance: {snapshot.variance || "Not calculated"} |
                        Verified: {snapshot.isVerified ? "Yes" : "No"}
                      </Typography>

                      {!snapshot.isVerified && (
                        <Box sx={{ mt: 1 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleVerifyProduct(snapshot.id, snapshot.expectedOpeningStock)}
                            disabled={loading}
                            sx={{ mr: 1 }}
                          >
                            Verify (Same Count)
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleVerifyProduct(snapshot.id, snapshot.expectedOpeningStock + 1)}
                            disabled={loading}
                            sx={{ mr: 1 }}
                          >
                            Verify (+1)
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleVerifyProduct(snapshot.id, Math.max(0, snapshot.expectedOpeningStock - 1))}
                            disabled={loading}
                          >
                            Verify (-1)
                          </Button>
                        </Box>
                      )}
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </Box>
  );
}