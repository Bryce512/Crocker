// Domain Models for Type Safety
export interface BluetoothDevice {
  id: string;
  name: string | null;
  rssi: number;
  isConnectable?: boolean;
}

export interface ConnectionState {
  isConnected: boolean;
  isScanning: boolean;
  deviceId: string | null;
  deviceName: string | null;
}

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  phoneNumber: string | null;
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
}

export interface Event {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  description?: string;
  assignedKidId?: string | null;
  lastModified: Date;
}

export interface Kid {
  id: string;
  name: string;
  age?: number;
  notes?: string;
  deviceId?: string; // Link to registered device
  alertPreferences?: {
    defaultIntervals: number[]; // minutes before event [15, 10, 5]
    quietHours: { start: string; end: string }; // HH:MM format
    alertStyle: "gentle" | "persistent";
  };
  needsResync?: boolean; // Legacy - now handled by EventSyncService
}

// Enhanced Device Management Models
export interface RegisteredDevice {
  id: string; // Bluetooth device ID (MAC address)
  name: string | null; // Original Bluetooth name
  nickname: string; // User-assigned name
  deviceType: "soristuffy" | "esp32" | "other";
  registeredAt: Date;
  lastConnected: Date | null;
  connectionCount: number;
  isActive: boolean; // Can be temporarily disabled
  rssi?: number; // Last known signal strength
  batteryLevel?: number; // If supported by device
  firmwareVersion?: string; // If available
  assignedKidId?: string | null; // Which kid this device belongs to
}

export interface DeviceProfile {
  deviceId: string;
  alertSettings: {
    vibrationIntensity: "low" | "medium" | "high";
    alertIntervals: number[]; // minutes before event
    quietHours: {
      enabled: boolean;
      start: string; // HH:MM format
      end: string; // HH:MM format
    };
  };
  syncSettings: {
    autoSync: boolean;
    syncFrequency: number; // hours
    maxRetries: number;
  };
  lastSyncAt: Date | null;
  preferences: {
    autoConnect: boolean;
    connectionTimeout: number; // seconds
    reconnectAttempts: number;
  };
}

export interface PairingSession {
  sessionId: string;
  deviceId: string;
  deviceName: string | null;
  startedAt: Date;
  status:
    | "scanning"
    | "connecting"
    | "pairing"
    | "success"
    | "failed"
    | "cancelled";
  attempts: number;
  error?: string;
  completedAt?: Date;
}

// Service Response Types
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ConnectionResponse extends ServiceResponse<BluetoothDevice> {
  device?: BluetoothDevice;
}

// Error Types
export interface AppError {
  code: string;
  message: string;
  originalError?: any;
}

// Event Sync Types
export interface EventBatch {
  kidId: string;
  generatedAt: Date;
  validUntil: Date;
  alerts: EventAlert[];
  checksum: string;
}

export interface EventAlert {
  eventId: string;
  eventTitle: string;
  alertTime: Date;
  minutesUntilEvent: number;
  alertType: "transition_warning" | "final_warning";
  vibrationPattern?: number[];
}

// Sync Status Types
export interface SyncMetrics {
  totalDevices: number;
  devicesNeedingSync: number;
  lastSyncCheck: Date | null;
  successfulSyncsLast24h: number;
  failedSyncsLast24h: number;
}
