import { toast } from 'sonner';

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  toast?: {
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  };
}

/**
 * Handles API responses and shows appropriate toast notifications
 */
export function handleApiResponse<T>(response: ApiResponse<T>): T | null {
  if (response.toast) {
    switch (response.toast.type) {
      case 'success':
        toast.success(response.toast.title, {
          description: response.toast.message,
        });
        break;
      case 'error':
        toast.error(response.toast.title, {
          description: response.toast.message,
        });
        break;
      case 'warning':
        toast.warning(response.toast.title, {
          description: response.toast.message,
        });
        break;
      case 'info':
        toast.info(response.toast.title, {
          description: response.toast.message,
        });
        break;
    }
  }

  if (!response.success && response.error && !response.toast) {
    toast.error('Error', {
      description: response.error,
    });
  }

  return response.success ? (response.data ?? null) : null;
}

/**
 * Handles errors from try-catch blocks
 */
export function handleError(error: unknown, context?: string): void {
  console.error(`Error${context ? ` in ${context}` : ''}:`, error);
  
  let message = 'An unexpected error occurred';
  
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  }
  
  toast.error('Error', {
    description: message,
  });
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(message: string): ApiResponse {
  return {
    success: false,
    error: message,
    toast: {
      type: 'error',
      title: 'Error',
      message,
    },
  };
}

/**
 * Creates a standardized success response
 */
export function createSuccessResponse<T>(data?: T, message?: string): ApiResponse<T> {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };
  
  if (message) {
    response.toast = {
      type: 'success',
      title: 'Success',
      message,
    };
  }
  
  return response;
}