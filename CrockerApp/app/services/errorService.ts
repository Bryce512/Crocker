// Centralized Error Handling Service
import { AppError } from "../models";

export enum ErrorCode {
  // Authentication errors
  AUTH_USER_NOT_FOUND = "auth/user-not-found",
  AUTH_WRONG_PASSWORD = "auth/wrong-password",
  AUTH_INVALID_EMAIL = "auth/invalid-email",
  AUTH_TOO_MANY_REQUESTS = "auth/too-many-requests",
  AUTH_WEAK_PASSWORD = "auth/weak-password",
  AUTH_EMPTY_EMAIL = "auth/empty-email",

  // Bluetooth errors
  BLUETOOTH_NOT_ENABLED = "bluetooth/not-enabled",
  BLUETOOTH_PERMISSIONS_DENIED = "bluetooth/permissions-denied",
  BLUETOOTH_CONNECTION_FAILED = "bluetooth/connection-failed",
  BLUETOOTH_DEVICE_NOT_FOUND = "bluetooth/device-not-found",
  BLUETOOTH_SCAN_FAILED = "bluetooth/scan-failed",

  // Data errors
  DATA_NOT_FOUND = "data/not-found",
  DATA_SAVE_FAILED = "data/save-failed",
  DATA_DELETE_FAILED = "data/delete-failed",
  DATA_INVALID_FORMAT = "data/invalid-format",

  // Network errors
  NETWORK_UNAVAILABLE = "network/unavailable",
  NETWORK_TIMEOUT = "network/timeout",

  // Generic errors
  UNKNOWN_ERROR = "unknown/error",
  VALIDATION_ERROR = "validation/error",
}

export class AppErrorService {
  // Create standardized error objects
  static createError(
    code: ErrorCode,
    message: string,
    originalError?: any
  ): AppError {
    return {
      code,
      message,
      originalError,
    };
  }

  // Get user-friendly error messages
  static getUserFriendlyMessage(error: AppError): string {
    switch (error.code) {
      case ErrorCode.AUTH_USER_NOT_FOUND:
        return "No account exists with this email address.";
      case ErrorCode.AUTH_WRONG_PASSWORD:
        return "The password you entered is incorrect.";
      case ErrorCode.AUTH_INVALID_EMAIL:
        return "Please enter a valid email address.";
      case ErrorCode.AUTH_TOO_MANY_REQUESTS:
        return "Too many failed attempts. Please try again later.";
      case ErrorCode.AUTH_WEAK_PASSWORD:
        return "Password must be at least 6 characters long.";
      case ErrorCode.AUTH_EMPTY_EMAIL:
        return "Email address is required.";

      case ErrorCode.BLUETOOTH_NOT_ENABLED:
        return "Please turn on Bluetooth to use this feature.";
      case ErrorCode.BLUETOOTH_PERMISSIONS_DENIED:
        return "Bluetooth permissions are required to connect to devices.";
      case ErrorCode.BLUETOOTH_CONNECTION_FAILED:
        return "Failed to connect to the device. Please try again.";
      case ErrorCode.BLUETOOTH_DEVICE_NOT_FOUND:
        return "Device not found. Make sure it's nearby and discoverable.";
      case ErrorCode.BLUETOOTH_SCAN_FAILED:
        return "Failed to scan for devices. Please check your Bluetooth settings.";

      case ErrorCode.DATA_NOT_FOUND:
        return "The requested data could not be found.";
      case ErrorCode.DATA_SAVE_FAILED:
        return "Failed to save your changes. Please try again.";
      case ErrorCode.DATA_DELETE_FAILED:
        return "Failed to delete the item. Please try again.";
      case ErrorCode.DATA_INVALID_FORMAT:
        return "The data format is invalid. Please check your input.";

      case ErrorCode.NETWORK_UNAVAILABLE:
        return "No internet connection. Please check your network settings.";
      case ErrorCode.NETWORK_TIMEOUT:
        return "Request timed out. Please try again.";

      case ErrorCode.VALIDATION_ERROR:
        return "Please check your input and try again.";

      default:
        return error.message || "An unexpected error occurred.";
    }
  }

  // Log errors for debugging
  static logError(error: AppError, context?: string): void {
    const timestamp = new Date().toISOString();
    const contextInfo = context ? ` [${context}]` : "";

    console.error(
      `${timestamp}${contextInfo} ERROR [${error.code}]: ${error.message}`,
      error.originalError || ""
    );

    // In production, you might want to send this to a logging service
    // crashlytics().recordError(error.originalError || new Error(error.message));
  }

  // Handle and format Firebase auth errors
  static handleFirebaseAuthError(firebaseError: any): AppError {
    let code: ErrorCode;
    let message: string;

    switch (firebaseError.code) {
      case "auth/user-not-found":
        code = ErrorCode.AUTH_USER_NOT_FOUND;
        message = "No account exists with this email";
        break;
      case "auth/wrong-password":
        code = ErrorCode.AUTH_WRONG_PASSWORD;
        message = "Incorrect password";
        break;
      case "auth/invalid-email":
        code = ErrorCode.AUTH_INVALID_EMAIL;
        message = "Invalid email format";
        break;
      case "auth/too-many-requests":
        code = ErrorCode.AUTH_TOO_MANY_REQUESTS;
        message = "Too many failed login attempts";
        break;
      case "auth/weak-password":
        code = ErrorCode.AUTH_WEAK_PASSWORD;
        message = "Password must be at least 6 characters";
        break;
      default:
        code = ErrorCode.UNKNOWN_ERROR;
        message = firebaseError.message || "Authentication failed";
    }

    const error = this.createError(code, message, firebaseError);
    this.logError(error, "Firebase Auth");
    return error;
  }

  // Handle Bluetooth errors
  static handleBluetoothError(
    bluetoothError: any,
    operation: string
  ): AppError {
    let code: ErrorCode;
    let message: string;

    // Determine error type based on the error message or operation
    if (
      bluetoothError.message?.includes("not enabled") ||
      bluetoothError.message?.includes("off")
    ) {
      code = ErrorCode.BLUETOOTH_NOT_ENABLED;
      message = "Bluetooth is not enabled";
    } else if (bluetoothError.message?.includes("permission")) {
      code = ErrorCode.BLUETOOTH_PERMISSIONS_DENIED;
      message = "Bluetooth permissions denied";
    } else if (operation === "connect") {
      code = ErrorCode.BLUETOOTH_CONNECTION_FAILED;
      message = "Failed to connect to device";
    } else if (operation === "scan") {
      code = ErrorCode.BLUETOOTH_SCAN_FAILED;
      message = "Failed to scan for devices";
    } else {
      code = ErrorCode.UNKNOWN_ERROR;
      message = bluetoothError.message || "Bluetooth operation failed";
    }

    const error = this.createError(code, message, bluetoothError);
    this.logError(error, `Bluetooth ${operation}`);
    return error;
  }

  // Handle data/API errors
  static handleDataError(dataError: any, operation: string): AppError {
    let code: ErrorCode;
    let message: string;

    if (dataError.message?.includes("not found")) {
      code = ErrorCode.DATA_NOT_FOUND;
      message = "Data not found";
    } else if (
      operation === "save" ||
      operation === "create" ||
      operation === "update"
    ) {
      code = ErrorCode.DATA_SAVE_FAILED;
      message = "Failed to save data";
    } else if (operation === "delete") {
      code = ErrorCode.DATA_DELETE_FAILED;
      message = "Failed to delete data";
    } else {
      code = ErrorCode.UNKNOWN_ERROR;
      message = dataError.message || "Data operation failed";
    }

    const error = this.createError(code, message, dataError);
    this.logError(error, `Data ${operation}`);
    return error;
  }

  // Validate common input fields
  static validateEmail(email: string): AppError | null {
    if (!email || !email.trim()) {
      return this.createError(
        ErrorCode.AUTH_EMPTY_EMAIL,
        "Email cannot be empty"
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return this.createError(
        ErrorCode.AUTH_INVALID_EMAIL,
        "Invalid email format"
      );
    }

    return null;
  }

  static validatePassword(password: string): AppError | null {
    if (!password || password.length < 6) {
      return this.createError(
        ErrorCode.AUTH_WEAK_PASSWORD,
        "Password must be at least 6 characters"
      );
    }

    return null;
  }

  static validateRequired(value: any, fieldName: string): AppError | null {
    if (!value || (typeof value === "string" && !value.trim())) {
      return this.createError(
        ErrorCode.VALIDATION_ERROR,
        `${fieldName} is required`
      );
    }

    return null;
  }
}

export default AppErrorService;
