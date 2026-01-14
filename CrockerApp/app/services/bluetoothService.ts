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

// BLE UUIDs - Custom service for CrockerDisplay
const SERVICE_UUID = "550e8400-e29b-41d4-a716-446655440000";
const CONFIG_CHAR_UUID = "550e8400-e29b-41d4-a716-446655440001";
const FILE_TRANSFER_CHAR_UUID = "550e8400-e29b-41d4-a716-446655440002";
const STATUS_CHAR_UUID = "550e8400-e29b-41d4-a716-446655440003";
const TIME_SYNC_CHAR_UUID = "550e8400-e29b-41d4-a716-446655440004";

// BLE MTU size (typically 512 bytes, minus overhead leaves ~480 for payload)
const BLE_FILE_CHUNK_SIZE = 480;

// Legacy aliases for backward compatibility
const WRITE_UUID = FILE_TRANSFER_CHAR_UUID;
const READ_UUID = CONFIG_CHAR_UUID;
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

// Simple hash function for checksum (replaces Buffer which isn't available in React Native)
const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Convert to base64-like string (first 8 chars)
  return Math.abs(hash).toString(16).padStart(8, "0").substring(0, 8);
};

// Create event schedule JSON for a specific device
// Filters events assigned to the given device and creates the simplified format
// Device firmware expects: {"events": [{...}, {...}]}
export const createEventScheduleForDevice = async (
  deviceId: string,
  eventsOverride?: any[]
): Promise<string> => {
  try {
    const firebaseService = require("./firebaseService").default;

    // Use provided events or fetch from Firebase
    const allEvents: any[] =
      eventsOverride || (await firebaseService.getEvents());
    console.log(
      `🔍 DEBUG: Retrieved ${allEvents.length} total events ${
        eventsOverride ? "(from local state)" : "(from Firebase)"
      }`
    );
    // Calculate time range: from 00:01 today to 23:59 today (local time)
    // This ensures we capture only today's scheduled events
    const now = new Date();
    
    // Start: 00:01 today (local time)
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 1, 0, 0); // Set to 00:01
    
    // End: 23:59 today (local time)
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999); // Set to 23:59:59.999

    console.log(
      `🔍 DEBUG: Filtering for events between ${startOfDay.toLocaleString()} and ${endOfDay.toLocaleString()}`
    );
    console.log(`🔍 DEBUG: Device ID to match: ${deviceId}`);

    // Filter events for current day that are assigned to this device
    const deviceEvents = allEvents.filter((event: any) => {
      const eventStart = new Date(event.startTime);
      const isInTimeRange = eventStart >= startOfDay && eventStart <= endOfDay;
      const isAssignedToDevice =
        event.assignedDeviceIds && event.assignedDeviceIds.includes(deviceId);
      
      
      return isInTimeRange && isAssignedToDevice;
    });

    console.log(
      `✅ DEBUG: ${deviceEvents.length} events pass filter for device ${deviceId}`
    );
    deviceEvents.forEach((e) => {
      console.log(
        `  ✓ Event: "${e.title}" at ${new Date(
          e.startTime
        ).toLocaleTimeString()}`
      );
    });

    // Sort events by start time
    deviceEvents.sort(
      (a: any, b: any) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    // Create event schedule in the specified format
    const scheduleEvents = deviceEvents.map((event: any) => {
      const startTime = new Date(event.startTime);
      const endTime = new Date(event.endTime);

      // Calculate minutes from midnight (local time)
      const startOfDay = new Date(startTime);
      startOfDay.setHours(0, 0, 0, 0);
      const minutesFromMidnight = Math.floor(
        (startTime.getTime() - startOfDay.getTime()) / (1000 * 60)
      );

      // Calculate duration in seconds
      const durationSeconds = Math.floor(
        (endTime.getTime() - startTime.getTime()) / 1000
      );

      return {
        start: minutesFromMidnight,
        duration: durationSeconds,
        label: (event.title || "Untitled Event").substring(0, 50),
        path:
          event.path ||
          `/sdcard/${event.title?.toLowerCase().replace(/\s+/g, "-")}.png` ||
          "/sdcard/event.png",
      };
    });

    // Create simple events array payload
    const payload = {
      events: scheduleEvents,
    };

    console.log(
      `📅 Created event schedule for device ${deviceId} with ${deviceEvents.length} events`
    );
    console.log(`📦 Schedule size: ${JSON.stringify(payload).length} bytes`);

    return JSON.stringify(payload);
  } catch (error) {
    console.error("Error creating event schedule for device:", error);
    // Return empty schedule on error
    const emptyPayload = {
      events: [],
    };
    return JSON.stringify(emptyPayload);
  }
};

// Send event schedule to a device via CONFIG_CHAR_UUID (0001 characteristic)
export const sendEventScheduleToDevice = async (
  deviceId: string,
  eventsOverride?: any[]
): Promise<ServiceResponse<boolean>> => {
  try {
    console.log(`📡 Starting event schedule send for device ${deviceId}`);

    // Verify the device is still connected before attempting to send
    console.log(`🔍 Verifying connection status before event send...`);
    try {
      const connectedDevices = await BleManager.getConnectedPeripherals([]);
      const isStillConnected = connectedDevices.some(
        (device) => device.id === deviceId
      );
      
      if (!isStillConnected) {
        console.warn(
          `⚠️ Device ${deviceId} is not connected. Attempting to reconnect...`
        );
        
        // Try to reconnect
        try {
          await BleManager.connect(deviceId);
          await BleManager.retrieveServices(deviceId);
          console.log(`✅ Successfully reconnected to device ${deviceId}`);
        } catch (reconnectError) {
          console.error(
            `❌ Failed to reconnect to device ${deviceId}: ${reconnectError}`
          );
          return {
            success: false,
            error: `Device disconnected and reconnection failed: ${reconnectError}`,
          };
        }
      } else {
        console.log(`✅ Device ${deviceId} is still connected`);
      }
    } catch (connCheckError) {
      console.warn(`⚠️ Could not verify connection status: ${connCheckError}`);
      // Continue anyway, the write will fail if truly disconnected
    }

    // Create the event schedule JSON payload
    const scheduleJson = await createEventScheduleForDevice(
      deviceId,
      eventsOverride
    );

    // Convert JSON string to bytes for Bluetooth transmission
    const scheduleBytes = stringToBytes(scheduleJson);

    console.log(
      `📡 Sending event schedule (${scheduleBytes.length} bytes) to device ${deviceId}`
    );
    console.log("📋 Schedule payload:", scheduleJson);

    // Send length header first (4 bytes, big-endian) so device knows total payload size
    const lengthBuffer = new ArrayBuffer(4);
    const lengthView = new Uint32Array(lengthBuffer);
    lengthView[0] = scheduleBytes.length;
    const lengthBytes = Array.from(new Uint8Array(lengthBuffer));

    console.log(
      `📏 Sending length header: ${scheduleBytes.length} bytes (${lengthBytes
        .map((b) => "0x" + b.toString(16).padStart(2, "0"))
        .join(" ")})`
    );
    console.log(`📝 Length bytes type: ${typeof lengthBytes}, Array: ${Array.isArray(lengthBytes)}`);
    console.log(`📝 Length bytes content: [${lengthBytes.join(", ")}]`);

    try {
      console.log("📝 Writing length header...");
      await BleManager.write(
        deviceId,
        SERVICE_UUID,
        CONFIG_CHAR_UUID,
        lengthBytes,
        lengthBytes.length
      );
      console.log("✅ Length header written successfully");
    } catch (headerError) {
      console.error(
        `❌ Error writing length header: ${
          headerError instanceof Error ? headerError.message : String(headerError)
        }`
      );
      throw headerError;
    }

    // Delay after header to keep connection alive
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Send in chunks if necessary (BLE has MTU limits)
    console.log(`📦 Starting chunk send loop for ${scheduleBytes.length} bytes`);
    const chunkSize = BLE_FILE_CHUNK_SIZE;
    const totalChunks = Math.ceil(scheduleBytes.length / chunkSize);
    console.log(`📦 Total chunks to send: ${totalChunks}`);

    for (let i = 0; i < scheduleBytes.length; i += chunkSize) {
      const chunkNumber = Math.floor(i / chunkSize) + 1;
      console.log(`\n📦 === CHUNK ${chunkNumber}/${totalChunks} ===`);

      try {
        const chunk = scheduleBytes.slice(
          i,
          Math.min(i + chunkSize, scheduleBytes.length)
        );
        
        console.log(
          `📦 Chunk ${chunkNumber}: sliced ${chunk.length} bytes from position ${i}`
        );

        // Convert to Uint8Array for proper BLE transmission
        const uint8Chunk = new Uint8Array(chunk);
        const dataToWrite = Array.from(uint8Chunk);
        
        console.log(`📝 About to write ${dataToWrite.length} bytes to device`);
        console.log(`📝 Data type: ${typeof dataToWrite}, is Array: ${Array.isArray(dataToWrite)}`);
        
        // Add safety check before write
        if (!Array.isArray(dataToWrite) || dataToWrite.length === 0) {
          throw new Error(`Invalid data to write: ${JSON.stringify({
            isArray: Array.isArray(dataToWrite),
            length: dataToWrite.length,
            type: typeof dataToWrite
          })}`);
        }
        
        await BleManager.write(
          deviceId,
          SERVICE_UUID,
          CONFIG_CHAR_UUID,
          dataToWrite,
          dataToWrite.length
        );
        
        console.log(`✅ Chunk ${chunkNumber} written successfully`);
        
        // Delay between chunks to let device process
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (writeError) {
        console.error(
          `❌ Error writing chunk ${chunkNumber}: ${
            writeError instanceof Error ? writeError.message : String(writeError)
          }`
        );
        console.error(`Error stack: ${writeError instanceof Error ? writeError.stack : "no stack"}`);
        throw writeError;
      }
    }

    console.log(
      `✅ Event schedule sent successfully to CONFIG_CHAR_UUID for device ${deviceId}`
    );

    return {
      success: true,
      data: true,
    };
  } catch (error) {
    console.error("Error sending event schedule to device:", error);
    return {
      success: false,
      error: `Failed to send event schedule: ${error}`,
    };
  }
};

// Get events for the next 24 hours and create JSON payload for CrockerDisplay
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

    // Create events array payload (device firmware expects just this, not metadata)
    const eventsPayload = filteredEvents.map((event: any) => {
      const startTime = new Date(event.startTime);
      const endTime = new Date(event.endTime);

      // Calculate minutes from midnight
      const startOfDay = new Date(startTime);
      startOfDay.setHours(0, 0, 0, 0);
      const minutesFromMidnight = Math.floor(
        (startTime.getTime() - startOfDay.getTime()) / (1000 * 60)
      );

      // Calculate duration in seconds
      const durationSeconds = Math.floor(
        (endTime.getTime() - startTime.getTime()) / 1000
      );

      return {
        start: minutesFromMidnight,
        duration: durationSeconds,
        label: (event.title || "Untitled Event").substring(0, 30),
        path:
          event.path ||
          `/sdcard/${event.title?.toLowerCase().replace(/\s+/g, "-")}.png` ||
          "/sdcard/event.png",
      };
    });

    // Device firmware expects just the events array as JSON
    const payload = {
      events: eventsPayload,
    };

    const payloadString = JSON.stringify(payload);

    console.log(
      `📤 Created JSON payload for ${filteredEvents.length} events (next 24 hours)`
    );
    console.log(`📦 Payload size: ${payloadString.length} bytes`);
    console.log("📋 Payload:", payloadString);

    return payloadString;
  } catch (error) {
    console.error("Error creating events JSON:", error);
    // Return empty payload on error (just empty events array)
    const emptyPayload = {
      events: [],
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
    // Discover services on the device first
    console.log(`🔍 Discovering services on device ${deviceId}...`);
    await BleManager.retrieveServices(deviceId);
    console.log(`✅ Services discovered`);

    // Create the JSON payload
    const eventsJson = await createNext24HoursEventsJson(kidId);

    // Convert JSON string to bytes for Bluetooth transmission
    const jsonBytes = stringToBytes(eventsJson);

    console.log(`📡 Sending ${jsonBytes.length} bytes to device ${deviceId}`);
    console.log("📄 JSON Payload:", eventsJson);

    // Send in chunks if necessary (BLE has MTU limits)
    const chunkSize = BLE_FILE_CHUNK_SIZE;
    const totalChunks = Math.ceil(jsonBytes.length / chunkSize);
    for (let i = 0; i < jsonBytes.length; i += chunkSize) {
      const chunkNumber = Math.floor(i / chunkSize) + 1;
      const chunk = jsonBytes.slice(
        i,
        Math.min(i + chunkSize, jsonBytes.length)
      );
      console.log(
        `📦 Sending chunk ${chunkNumber}/${totalChunks} (${chunk.length} bytes)`
      );

      try {
        // Convert to Uint8Array for proper BLE transmission
        const uint8Chunk = new Uint8Array(chunk);
        const dataToWrite = Array.from(uint8Chunk);
        
        console.log(`📝 About to write ${dataToWrite.length} bytes to device`);
        
        // Add safety check before write
        if (!Array.isArray(dataToWrite) || dataToWrite.length === 0) {
          throw new Error(`Invalid data to write: ${JSON.stringify({
            isArray: Array.isArray(dataToWrite),
            length: dataToWrite.length,
            type: typeof dataToWrite
          })}`);
        }
        
        await BleManager.write(
          deviceId,
          SERVICE_UUID,
          WRITE_UUID,
          dataToWrite,
          dataToWrite.length
        );
        
        console.log(`✅ Chunk ${chunkNumber} written successfully`);
      } catch (writeError) {
        console.error(
          `❌ Error writing chunk ${chunkNumber}: ${
            writeError instanceof Error ? writeError.message : String(writeError)
          }`
        );
        throw writeError;
      }

      // Small delay between chunks to let device process
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(`✅ Events sent successfully to device ${deviceId}`);

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

// Create device configuration JSON with simplified event format
export const createDeviceConfigJson = async (
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

    // Create simplified event config format
    const configEvents = filteredEvents.map((event: any) => {
      const startTime = new Date(event.startTime);
      const endTime = new Date(event.endTime);

      // Calculate minutes from midnight (local time)
      const startOfDay = new Date(startTime);
      startOfDay.setHours(0, 0, 0, 0);
      const minutesFromMidnight = Math.floor(
        (startTime.getTime() - startOfDay.getTime()) / (1000 * 60)
      );

      // Calculate duration in seconds
      const durationSeconds = Math.floor(
        (endTime.getTime() - startTime.getTime()) / 1000
      );

      return {
        start: minutesFromMidnight,
        duration: durationSeconds,
        label: (event.title || "Untitled Event").substring(0, 30),
        path:
          event.path ||
          `/sdcard/${event.title?.toLowerCase().replace(/\s+/g, "-")}.png` ||
          "/sdcard/event.png",
      };
    });

    const payload = {
      events: configEvents,
    };

    console.log(`⚙️ Created device config for ${filteredEvents.length} events`);
    console.log(`📦 Config size: ${JSON.stringify(payload).length} bytes`);
    console.log("⚙️ Config payload:", payload);

    return JSON.stringify(payload);
  } catch (error) {
    console.error("Error creating device config JSON:", error);
    // Return empty config on error
    const emptyPayload = {
      events: [],
    };
    return JSON.stringify(emptyPayload);
  }
};

// Send device configuration JSON to connected peripheral
export const sendConfigToPeripheral = async (
  deviceId: string,
  kidId?: string
): Promise<ServiceResponse<boolean>> => {
  try {
    // Create the config JSON payload
    const configJson = await createDeviceConfigJson(kidId);

    // Convert JSON string to bytes for Bluetooth transmission
    const configBytes = stringToBytes(configJson);

    console.log(
      `⚙️ Sending config (${configBytes.length} bytes) to device ${deviceId}`
    );
    console.log("📋 Config payload:", configJson);

    // Convert to Uint8Array for proper BLE transmission
    const uint8Config = new Uint8Array(configBytes);
    const dataToWrite = Array.from(uint8Config);

    // Send via BLE on CONFIG characteristic
    await BleManager.write(
      deviceId,
      SERVICE_UUID,
      CONFIG_CHAR_UUID,
      dataToWrite,
      dataToWrite.length
    );

    console.log("✅ Config sent successfully to CONFIG_CHAR_UUID");

    return {
      success: true,
      data: true,
    };
  } catch (error) {
    console.error("Error sending config to peripheral:", error);
    return {
      success: false,
      error: `Failed to send config: ${error}`,
    };
  }
};

// Send current unix timestamp to connected peripheral
// Diagnostic function to list all services and characteristics on a device
export const listDeviceServices = async (
  deviceId: string
): Promise<ServiceResponse<any>> => {
  try {
    console.log(`🔍 Discovering all services on device ${deviceId}...`);
    
    // Use the BLE-PLX manager to get detailed service information
    const device = await blePlxManager.connectToDevice(deviceId);
    await device.discoverAllServicesAndCharacteristics();
    
    const services = await device.services();
    
    console.log(`\n📋 ===== DEVICE SERVICES AND CHARACTERISTICS =====`);
    console.log(`Device: ${deviceId}\n`);
    
    const servicesInfo: any[] = [];
    
    for (const service of services) {
      console.log(`\n🔹 Service: ${service.uuid}`);
      const characteristics = await service.characteristics();
      
      const charInfo: any[] = [];
      for (const char of characteristics) {
        console.log(`  └─ Characteristic: ${char.uuid}`);
        console.log(`     Properties: ${char.isReadable ? 'R' : '-'}${char.isWritableWithResponse ? 'W' : '-'}${char.isWritableWithoutResponse ? 'w' : '-'}${char.isNotifiable ? 'N' : '-'}${char.isIndicatable ? 'I' : '-'}`);
        charInfo.push({
          uuid: char.uuid,
          readable: char.isReadable,
          writable: char.isWritableWithResponse,
          writableWithoutResponse: char.isWritableWithoutResponse,
          notifiable: char.isNotifiable,
          indicatable: char.isIndicatable,
        });
      }
      
      servicesInfo.push({
        uuid: service.uuid,
        characteristics: charInfo,
      });
    }
    
    console.log(`\n✅ Found ${servicesInfo.length} services`);
    
    await device.cancelConnection();
    
    return {
      success: true,
      data: servicesInfo,
    };
  } catch (error) {
    console.error(`❌ Error discovering services: ${error}`);
    return {
      success: false,
      error: `Failed to discover services: ${error}`,
      data: null,
    };
  }
};

export const sendTimestampToPeripheral = async (
  deviceId: string
): Promise<ServiceResponse<boolean>> => {
  try {
    // Services should already be discovered from connectToDevice()
    // Skip redundant service discovery to avoid disconnects

    // Get current unix timestamp (in seconds)
    let unixTimestamp = Math.floor(Date.now() / 1000);

    // Adjust for timezone offset
    // Get timezone offset in minutes, convert to seconds
    const timezoneOffsetMinutes = new Date().getTimezoneOffset();
    const timezoneOffsetSeconds = timezoneOffsetMinutes * 60;

    // Adjust timestamp: currentUnix + (timezone * 3600)
    // Note: getTimezoneOffset() returns negative for east of UTC, positive for west
    // So we negate it to get the proper offset
    unixTimestamp = unixTimestamp - timezoneOffsetSeconds;

    // Convert timestamp to UTF8 string bytes
    const timestampString = unixTimestamp.toString();
    const timestampBytes = stringToBytes(timestampString);

    console.log(
      `⏰ Sending timezone-adjusted timestamp to device ${deviceId}: ${timestampString} (offset: ${-timezoneOffsetSeconds}s)`
    );
    console.log("📄 Timestamp bytes:", timestampBytes);

    // Convert to Uint8Array for proper BLE transmission
    const uint8Timestamp = new Uint8Array(timestampBytes);
    const dataToWrite = Array.from(uint8Timestamp);

    // Send via BLE on TIME_SYNC characteristic
    await BleManager.write(
      deviceId,
      SERVICE_UUID,
      TIME_SYNC_CHAR_UUID,
      dataToWrite,
      dataToWrite.length
    );

    return {
      success: true,
      data: true,
    };
  } catch (error) {
    console.error("Error sending timestamp to peripheral:", error);
    return {
      success: false,
      error: `Failed to send timestamp: ${error}`,
    };
  }
};

// Read device sync confirmation from STATUS characteristic (0003)
export const readDeviceSyncConfirmation = async (
  deviceId: string
): Promise<{ success: boolean; eventsSynced: boolean; error?: string }> => {
  try {
    console.log(`⏳ Reading device sync confirmation from ${deviceId}...`);

    // First ensure services are discovered
    await BleManager.retrieveServices(deviceId);

    // Read from STATUS characteristic
    const response = await BleManager.read(
      deviceId,
      SERVICE_UUID,
      STATUS_CHAR_UUID
    );

    // Response should be a byte array
    // Assuming device sends: [1] for success, [0] for failure
    const statusByte = response[0];
    const eventsSynced = statusByte === 1;

    console.log(
      `📊 Device sync status: ${eventsSynced ? "✅ Synced" : "❌ Failed"}`
    );

    return {
      success: true,
      eventsSynced,
    };
  } catch (error) {
    console.error("Error reading device sync confirmation:", error);
    return {
      success: false,
      eventsSynced: false,
      error: `Failed to read sync status: ${error}`,
    };
  }
};

export default {
  // Utility functions
  stringToBytes,
  base64ToBytes,
  createJson,

  // Event schedule creation and sending
  createEventScheduleForDevice,
  sendEventScheduleToDevice,
  readDeviceSyncConfirmation,

  // Event JSON creation (legacy)
  createNext24HoursEventsJson,
  sendEventsToPeripheral,
  createDeviceConfigJson,
  sendConfigToPeripheral,
  sendTimestampToPeripheral,
  
  // Diagnostic functions
  listDeviceServices,

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
  CONFIG_CHAR_UUID,
  FILE_TRANSFER_CHAR_UUID,
  STATUS_CHAR_UUID,
  TIME_SYNC_CHAR_UUID,
  BLE_FILE_CHUNK_SIZE,
  WRITE_UUID,
  READ_UUID,
};
