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
  lastSuccessfulCommandTime: number | null;
}

export interface OBDData {
  voltage: string | null;
  rpm: number | null;
  speed: number | null;
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
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  vin?: string;
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
