"use client";

import { toast } from "sonner";
import { useCallback } from "react";

export interface ToastData {
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
}

export function useToastHandler() {
  const showToast = useCallback((toastData: ToastData) => {
    switch (toastData.type) {
      case "success":
        toast.success(toastData.title, {
          description: toastData.message,
        });
        break;
      case "error":
        toast.error(toastData.title, {
          description: toastData.message,
        });
        break;
      case "warning":
        toast.warning(toastData.title, {
          description: toastData.message,
        });
        break;
      case "info":
        toast.info(toastData.title, {
          description: toastData.message,
        });
        break;
    }
  }, []);

  const handleActionResult = useCallback((result: any) => {
    if (result?.toast) {
      showToast(result.toast);
    }
  }, [showToast]);

  return {
    showToast,
    handleActionResult,
  };
}