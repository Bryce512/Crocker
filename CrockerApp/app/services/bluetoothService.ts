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

// OBD initialization
export const initializeOBD = async (
  deviceId: string
): Promise<ServiceResponse<boolean>> => {
  try {
    await BleManager.retrieveServices(deviceId);

    // OBD initialization commands
    const commands = [
      "ATZ", // Reset
      "ATL0", // Turn off linefeeds
      "ATH0", // Turn off headers
      "ATE0", // Turn off echo
      "ATS0", // Turn off spaces
      "ATI", // Get version info
      "AT SP 0", // Set protocol to auto
    ];

    // Send commands sequentially with delays
    for (const cmd of commands) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      // Note: Actual command sending would be handled by the hook layer
    }

    return {
      success: true,
      data: true,
    };
  } catch (error) {
    return {
      success: false,
      error: `OBD initialization failed: ${error}`,
    };
  }
};

export default {
  // Utility functions
  stringToBytes,
  base64ToBytes,

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

  // OBD operations
  initializeOBD,

  // Constants
  SERVICE_UUID,
  WRITE_UUID,
  READ_UUID,
};
