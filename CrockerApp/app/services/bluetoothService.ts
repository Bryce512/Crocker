// Pure Bluetooth Service - Business Logic Only
import { Platform, PermissionsAndroid } from "react-native";
import BleManager from "react-native-ble-manager";
import { BleManager as BlePlxManager, Device } from "react-native-ble-plx";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  BluetoothDevice,
  ConnectionResponse,
  ServiceResponse,
} from "../models";

// Constants
const SERVICE_UUID = "0000fff0-0000-1000-8000-00805f9b34fb";
const WRITE_UUID = "0000fff2-0000-1000-8000-00805f9b34fb";
const READ_UUID = "0000fff1-0000-1000-8000-00805f9b34fb";
const REMEMBERED_DEVICE_KEY = "@soriApp:rememberedDevice";
const blePlxManager = new BlePlxManager();

// Pure utility functions
export const stringToBytes = (str: string): number[] => {
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    bytes.push(str.charCodeAt(i));
  }
  return bytes;
};

export const base64ToBytes = (b64: string): number[] => {
  try {
    const decoded = atob(b64);
    const bytes = [];
    for (let i = 0; i < decoded.length; i++) {
      bytes.push(decoded.charCodeAt(i));
    }
    return bytes;
  } catch (error) {
    console.log(`Error converting base64 to bytes: ${error}`);
    return [];
  }
};

// Permission management
export const requestBluetoothPermissions = async (): Promise<boolean> => {
  try {
    if (Platform.OS === "ios") {
      await BleManager.start({ showAlert: false });
      return true;
    } else if (Platform.OS === "android") {
      let permissionsToRequest: string[] = [];

      if (Platform.Version >= 31) {
        // Android 12+
        permissionsToRequest = [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ];
      } else if (Platform.Version >= 23) {
        // Android 6-11
        permissionsToRequest = [
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ];
      }

      const permissionResults = await PermissionsAndroid.requestMultiple(
        permissionsToRequest as any
      );

      const denied = Object.values(permissionResults).includes(
        PermissionsAndroid.RESULTS.DENIED
      );
      return !denied;
    }
    return false;
  } catch (error) {
    console.error("Error requesting permissions:", error);
    return false;
  }
};

// Device memory management
export const saveRememberedDevice = async (
  device: BluetoothDevice
): Promise<void> => {
  try {
    await AsyncStorage.setItem(REMEMBERED_DEVICE_KEY, JSON.stringify(device));
  } catch (error) {
    console.error("Failed to save device:", error);
    throw error;
  }
};

export const getRememberedDevice =
  async (): Promise<BluetoothDevice | null> => {
    try {
      const deviceJson = await AsyncStorage.getItem(REMEMBERED_DEVICE_KEY);
      return deviceJson ? JSON.parse(deviceJson) : null;
    } catch (error) {
      console.error("Failed to load remembered device:", error);
      return null;
    }
  };

export const forgetRememberedDevice = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(REMEMBERED_DEVICE_KEY);
  } catch (error) {
    console.error("Failed to forget device:", error);
    throw error;
  }
};

// Connection management
export const initializeBluetooth = async (): Promise<
  ServiceResponse<boolean>
> => {
  try {
    await BleManager.start({ showAlert: false });
    const state = await BleManager.checkState();

    return {
      success: state === "on",
      data: state === "on",
      error: state !== "on" ? `Bluetooth is ${state}` : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to initialize Bluetooth: ${error}`,
    };
  }
};

export const scanForDevices = async (
  includeUnnamed = false,
  duration = 2000
): Promise<ServiceResponse<BluetoothDevice[]>> => {
  try {
    const permissionsGranted = await requestBluetoothPermissions();
    if (!permissionsGranted) {
      return {
        success: false,
        error: "Insufficient permissions for Bluetooth scanning",
      };
    }

    const bluetoothState = await BleManager.checkState();
    if (bluetoothState !== "on") {
      return {
        success: false,
        error: "Bluetooth is not enabled",
      };
    }

    // Start scanning
    await BleManager.scan([], duration / 1000, true);

    // Wait for scan to complete
    await new Promise((resolve) => setTimeout(resolve, duration));

    // Get discovered devices
    const discoveredDevices = await BleManager.getDiscoveredPeripherals();

    // Filter devices based on preferences
    const filteredDevices = discoveredDevices
      .filter((device) => includeUnnamed || device.name)
      .map((device) => ({
        id: device.id,
        name: device.name || null,
        rssi: device.rssi || -100,
        isConnectable: true,
      }));

    return {
      success: true,
      data: filteredDevices,
    };
  } catch (error) {
    return {
      success: false,
      error: `Scan failed: ${error}`,
    };
  }
};

export const connectToDevice = async (
  device: BluetoothDevice
): Promise<ConnectionResponse> => {
  try {
    await BleManager.connect(device.id);
    await BleManager.retrieveServices(device.id);

    // Save device for future connections
    await saveRememberedDevice(device);

    return {
      success: true,
      data: device,
      device,
    };
  } catch (error) {
    return {
      success: false,
      error: `Connection failed: ${error}`,
    };
  }
};

export const disconnectFromDevice = async (
  deviceId: string
): Promise<ServiceResponse<boolean>> => {
  try {
    await BleManager.disconnect(deviceId);
    return {
      success: true,
      data: true,
    };
  } catch (error) {
    return {
      success: false,
      error: `Disconnect failed: ${error}`,
    };
  }
};

export const verifyConnection = async (
  deviceId: string
): Promise<ServiceResponse<boolean>> => {
  try {
    const connectedDevices = await BleManager.getConnectedPeripherals([]);
    const isConnected = connectedDevices.some(
      (device) => device.id === deviceId
    );

    if (isConnected) {
      try {
        await BleManager.readRSSI(deviceId);
        return { success: true, data: true };
      } catch (rssiError) {
        return { success: true, data: false };
      }
    }

    return { success: true, data: false };
  } catch (error) {
    return {
      success: false,
      error: `Connection verification failed: ${error}`,
    };
  }
};

export const getConnectedDevices = async (): Promise<
  ServiceResponse<BluetoothDevice[]>
> => {
  try {
    const connectedDevices = await BleManager.getConnectedPeripherals([]);
    const devices = connectedDevices.map((device) => ({
      id: device.id,
      name: device.name || null,
      rssi: device.rssi || -100,
      isConnectable: true,
    }));

    return {
      success: true,
      data: devices,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get connected devices: ${error}`,
    };
  }
};

export const createJson = (data: any): string => {
  return JSON.stringify(data);
};

// Interface for ESP32 event payload
interface ESP32EventPayload {
  timestamp: number;
  valid_until: number;
  kid_id: string;
  event_count: number;
  events: Array<{
    id: number;
    title: string;
    start_time: number;
    end_time: number;
    duration_minutes: number;
    alerts: Array<{
      alert_time: number;
      minutes_before: number;
      type: string;
    }>;
  }>;
  checksum?: string;
  error?: string;
}

// Get events for the next 24 hours and create JSON payload for peripheral
export const createNext24HoursEventsJson = async (
  kidId?: string
): Promise<string> => {
  try {
    const firebaseService = require("./firebaseService").default;

    // Get all events from Firebase
    const allEvents: any[] = await firebaseService.getEvents();

    // Calculate time range for next 24 hours
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Filter events for next 24 hours
    const upcomingEvents = allEvents.filter((event: any) => {
      const eventStart = new Date(event.startTime);
      return eventStart >= now && eventStart <= next24Hours;
    });

    // Further filter by kidId if provided
    const filteredEvents = kidId
      ? upcomingEvents.filter((event: any) => event.assignedKidId === kidId)
      : upcomingEvents;

    // Sort events by start time
    filteredEvents.sort(
      (a: any, b: any) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    // Create ESP32-friendly payload
    const payload: ESP32EventPayload = {
      timestamp: Math.floor(now.getTime() / 1000), // Unix timestamp
      valid_until: Math.floor(next24Hours.getTime() / 1000),
      kid_id: kidId || "default",
      event_count: filteredEvents.length,
      events: filteredEvents.map((event: any, index: number) => ({
        id: index + 1, // Simple sequential ID for ESP32
        title: (event.title || "Untitled Event").substring(0, 30), // Limit title length
        start_time: Math.floor(new Date(event.startTime).getTime() / 1000), // Unix timestamp
        end_time: Math.floor(new Date(event.endTime).getTime() / 1000),
        duration_minutes: Math.floor(
          (new Date(event.endTime).getTime() -
            new Date(event.startTime).getTime()) /
            (1000 * 60)
        ),
        // Default alert intervals: 15, 10, 5 minutes before
        alerts: [
          {
            alert_time: Math.floor(
              (new Date(event.startTime).getTime() - 15 * 60 * 1000) / 1000
            ),
            minutes_before: 15,
            type: "warning",
          },
          {
            alert_time: Math.floor(
              (new Date(event.startTime).getTime() - 10 * 60 * 1000) / 1000
            ),
            minutes_before: 10,
            type: "warning",
          },
          {
            alert_time: Math.floor(
              (new Date(event.startTime).getTime() - 5 * 60 * 1000) / 1000
            ),
            minutes_before: 5,
            type: "final",
          },
        ].filter(
          (alert) => alert.alert_time > Math.floor(now.getTime() / 1000)
        ), // Only future alerts
      })),
    };

    // Add checksum for data integrity
    const payloadString = JSON.stringify(payload.events);
    payload.checksum = Buffer.from(payloadString)
      .toString("base64")
      .substring(0, 8);

    console.log(
      `📤 Created JSON payload for ${filteredEvents.length} events (next 24 hours)`
    );
    console.log(`📦 Payload size: ${JSON.stringify(payload).length} bytes`);

    return JSON.stringify(payload);
  } catch (error) {
    console.error("Error creating events JSON:", error);
    // Return empty payload on error
    const now = new Date();
    const emptyPayload: ESP32EventPayload = {
      timestamp: Math.floor(now.getTime() / 1000),
      valid_until: Math.floor((now.getTime() + 24 * 60 * 60 * 1000) / 1000),
      kid_id: kidId || "default",
      event_count: 0,
      events: [],
      checksum: "empty000",
      error: "Failed to load events",
    };
    return JSON.stringify(emptyPayload);
  }
};

// Send events JSON to connected peripheral
export const sendEventsToPeripheral = async (
  deviceId: string,
  kidId?: string
): Promise<ServiceResponse<boolean>> => {
  try {
    // Create the JSON payload
    const eventsJson = await createNext24HoursEventsJson(kidId);

    // Convert JSON string to bytes for Bluetooth transmission
    const jsonBytes = stringToBytes(eventsJson);

    // Here you would integrate with your BLE write function
    // This is a placeholder - you'll need to implement the actual BLE write
    console.log(`📡 Sending ${jsonBytes.length} bytes to device ${deviceId}`);
    console.log("📄 JSON Payload:", eventsJson);

    // For now, just log the payload - you'll implement actual BLE write later
    await BleManager.write(deviceId, SERVICE_UUID, WRITE_UUID, jsonBytes);

    return {
      success: true,
      data: true,
    };
  } catch (error) {
    console.error("Error sending events to peripheral:", error);
    return {
      success: false,
      error: `Failed to send events: ${error}`,
    };
  }
};

export default {
  // Utility functions
  stringToBytes,
  base64ToBytes,
  createJson,

  // Event JSON creation
  createNext24HoursEventsJson,
  sendEventsToPeripheral,

  // Permission management
  requestBluetoothPermissions,

  // Device memory
  saveRememberedDevice,
  getRememberedDevice,
  forgetRememberedDevice,

  // Connection management
  initializeBluetooth,
  scanForDevices,
  connectToDevice,
  disconnectFromDevice,
  verifyConnection,
  getConnectedDevices,

  // Constants
  SERVICE_UUID,
  WRITE_UUID,
  READ_UUID,
};
