"use client";

import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, XCircle, Calendar } from "lucide-react";
import { getStockDay } from "@/app/actions/stock-day-init";

interface StockDayStatus {
  exists: boolean;
  status?: "OPEN" | "VERIFIED" | "CLOSED";
  businessDate?: Date;
  canCreateCreditSale: boolean;
  message: string;
}

interface StockDayStatusCheckerProps {
  onStatusChange?: (canCreateSale: boolean) => void;
}

export function StockDayStatusChecker({ onStatusChange }: StockDayStatusCheckerProps) {
  const [stockDayStatus, setStockDayStatus] = useState<StockDayStatus>({
    exists: false,
    canCreateCreditSale: false,
    message: "Checking stock day status...",
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkStockDayStatus();
  }, []);

  useEffect(() => {
    onStatusChange?.(stockDayStatus.canCreateCreditSale);
  }, [stockDayStatus.canCreateCreditSale, onStatusChange]);

  const checkStockDayStatus = async () => {
    setIsLoading(true);
    try {
      const today = new Date();
      const result = await getStockDay(today);
      
      if (!result) {
        setStockDayStatus({
          exists: false,
          canCreateCreditSale: false,
          message: "No stock day initialized for today. Please initialize stock day first.",
        });
      } else {
        const { stockDay } = result;
        const canCreateSale = stockDay.status === "VERIFIED";
        
        let message = "";
        switch (stockDay.status) {
          case "OPEN":
            message = "Stock day is open but not verified. Credit sales require verification first.";
            break;
          case "VERIFIED":
            message = "Stock day is verified. Credit sales are allowed.";
            break;
          case "CLOSED":
            message = "Stock day is closed. Credit sales are not allowed.";
            break;
          default:
            message = `Stock day status: ${stockDay.status}. Credit sales may not be allowed.`;
        }

        setStockDayStatus({
          exists: true,
          status: stockDay.status,
          businessDate: stockDay.businessDate,
          canCreateCreditSale: canCreateSale,
          message,
        });
      }
    } catch (error) {
      console.error("Error checking stock day status:", error);
      setStockDayStatus({
        exists: false,
        canCreateCreditSale: false,
        message: "Error checking stock day status. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (isLoading) return <Calendar className="h-4 w-4" />;
    if (!stockDayStatus.exists) return <XCircle className="h-4 w-4 text-red-500" />;
    if (stockDayStatus.canCreateCreditSale) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  };

  const getStatusBadge = () => {
    if (isLoading) return <Badge variant="secondary">Checking...</Badge>;
    if (!stockDayStatus.exists) return <Badge variant="destructive">No Stock Day</Badge>;
    
    switch (stockDayStatus.status) {
      case "OPEN":
        return <Badge variant="secondary">OPEN</Badge>;
      case "VERIFIED":
        return <Badge variant="default" className="bg-green-500">VERIFIED</Badge>;
      case "CLOSED":
        return <Badge variant="outline">CLOSED</Badge>;
      default:
        return <Badge variant="secondary">{stockDayStatus.status}</Badge>;
    }
  };

  const getAlertVariant = () => {
    if (stockDayStatus.canCreateCreditSale) return "default";
    return "destructive";
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {getStatusIcon()}
          Stock Day Status
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert variant={getAlertVariant()}>
          <AlertDescription className="flex items-center justify-between">
            <span>{stockDayStatus.message}</span>
            {stockDayStatus.businessDate && (
              <span className="text-sm text-muted-foreground">
                {new Date(stockDayStatus.businessDate).toLocaleDateString()}
              </span>
            )}
          </AlertDescription>
        </Alert>
        
        {!stockDayStatus.canCreateCreditSale && (
          <div className="mt-3 text-sm text-muted-foreground">
            <p><strong>Credit Sale Requirements:</strong></p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Stock day must be initialized for today</li>
              <li>Stock day status must be VERIFIED</li>
              <li>All products must be verified before credit sales</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}