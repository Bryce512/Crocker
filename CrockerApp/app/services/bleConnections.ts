import { useState, useEffect, useRef } from "react";
import {
  NativeModules,
  NativeEventEmitter,
  PermissionsAndroid,
  Platform,
  Alert,
} from "react-native";
import BleManager from "react-native-ble-manager";
import { BleManager as BlePlxManager, Device } from "react-native-ble-plx";
import base64 from "react-native-base64";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Buffer } from "buffer";

// Import new services
import bluetoothService from "./bluetoothService";
import AppErrorService, { ErrorCode } from "./errorService";
import { BluetoothDevice, ConnectionState } from "../models";

// Constants
const { BleManager: BleManagerModule } = NativeModules;
const bleEmitter = new NativeEventEmitter(NativeModules.BleManager);

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

// Re-export types for backward compatibility
export type { BluetoothDevice } from "../models";

// Re-export utility functions from bluetoothService
export const stringToBytes = bluetoothService.stringToBytes;
export const base64ToBytes = bluetoothService.base64ToBytes;

// Main BLE hook
export const useBleConnection = (options?: {
  onConnectionChange?: (connected: boolean, id: string | null) => void;
  onLogMessage?: (message: string) => void;
}) => {
  // Initialize BLE Manager once on hook mount (singleton pattern)
  const bleManagerInitialized = useRef(false);
  
  useEffect(() => {
    const initBleManager = async () => {
      if (bleManagerInitialized.current) {
        return; // Already initialized
      }
      
      try {
        await BleManager.start({ showAlert: false });
        bleManagerInitialized.current = true;
        console.log("✅ BLE Manager initialized (singleton)");
      } catch (error) {
        console.log(
          `⚠️ BLE Manager initialization note: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        // May already be initialized, which is fine
      }
    };
    
    initBleManager();
  }, []);

  // State variables
  const [isScanning, setIsScanning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [voltage, setVoltage] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  const [responseCallback, setResponseCallback] = useState<
    ((data: string) => void) | null
  >(null);
  const [discoveredDevices, setDiscoveredDevices] = useState<BluetoothDevice[]>(
    []
  );
  const lastSuccessfulCommandTime = useRef<number | null>(null);
  const [rememberedDevice, setRememberedDevice] =
    useState<BluetoothDevice | null>(null);
  const [plxDevice, setPlxDevice] = useState<Device | null>(null);

  // Characteristic UUIDs
  const [writeServiceUUID, setWriteServiceUUID] =
    useState<string>(SERVICE_UUID);
  const [writeCharUUID, setWriteCharUUID] = useState<string>(
    FILE_TRANSFER_CHAR_UUID
  );
  const [readCharUUID, setReadCharUUID] = useState<string>(CONFIG_CHAR_UUID);
  const activeOperations = useRef(0);
  const connectionLockTime = useRef<number | null>(null);

  // Set up disconnect listener to monitor connection status changes
  useEffect(() => {
    const disconnectSub = bleEmitter.addListener(
      "BleManagerDisconnectPeripheral",
      (data) => {
        logMessage(`📵 Device disconnected: ${data.peripheral}`);
        
        // Update connection state if this is the connected device
        if (data.peripheral === deviceId) {
          logMessage(`🔴 Connection lost - updating UI state`);
          setIsConnected(false);
          setDeviceId(null);
          forceClearLock();
          
          // Notify external callback if provided
          if (options?.onConnectionChange) {
            options.onConnectionChange(false, null);
          }
          
          // Note: Auto-reconnect logic is handled by the BluetoothContext's
          // verification and auto-connect effects. We just ensure the state is updated here.
        }
      }
    );

    return () => {
      disconnectSub.remove();
    };
  }, [deviceId, options]);

  // Clean up listeners on unmount
  useEffect(() => {
    // Clean up listeners
    return () => {
      if (activeOperations.current === 0) {
        logMessage("🧹 Cleaning up Bluetooth listeners");
        bleEmitter.removeAllListeners("BleManagerDiscoverPeripheral");
        bleEmitter.removeAllListeners(
          "BleManagerDidUpdateValueForCharacteristic"
        );
        bleEmitter.removeAllListeners("BleManagerDidUpdateState");
        bleEmitter.removeAllListeners("BleManagerConnectPeripheral");
        bleEmitter.removeAllListeners("BleManagerDisconnectPeripheral");
        bleEmitter.removeAllListeners("BleManagerStopScan");
      } else {
        logMessage("🛑 Skipping listener cleanup due to active operations");
      }
    };
  }, []);

  // Helper functions
  const logMessage = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setLog((prev) => [...prev, logEntry]);
    console.log(logEntry);

    // Call external logger if provided
    if (options?.onLogMessage) {
      options.onLogMessage(logEntry);
    }
  };

  // Modify the isLocked function to clear stale locks
  const isLocked = () => {
    if (connectionLockTime.current === null) return false;
    const now = Date.now();
    const lockExpired = now - connectionLockTime.current > 15000; // 15 second timeout

    if (lockExpired) {
      logMessage(
        "🔓 Connection lock expired automatically - clearing stale lock"
      );
      connectionLockTime.current = null;
      return false;
    }
    return true;
  };

  // Add this function to force clear any locks
  const forceClearLock = () => {
    if (connectionLockTime.current !== null) {
      logMessage("🔓 Forcibly clearing connection lock");
      connectionLockTime.current = null;
    }
  };

  const setLock = () => {
    connectionLockTime.current = Date.now();
  };

  const releaseLock = () => {
    connectionLockTime.current = null;
    logMessage("🔓 Releasing connection lock");
  };

  // Disconnect from device
  const disconnectDevice = async (
    targetDeviceId?: string
  ): Promise<boolean> => {
    // Use provided ID or fall back to currently connected device
    const finalDeviceId = targetDeviceId || deviceId;

    if (!finalDeviceId) {
      logMessage("❌ Cannot disconnect: No device ID specified");
      return false;
    }

    logMessage(`📵 Disconnecting from device ${finalDeviceId}...`);

    try {
      // First try to disconnect the PLX device if it exists
      if (
        plxDevice &&
        plxDevice.id.toLowerCase() === finalDeviceId.toLowerCase()
      ) {
        try {
          logMessage("Disconnecting PLX device...");
          await plxDevice.cancelConnection();
          setPlxDevice(null);
          logMessage("✅ PLX device disconnected");
        } catch (plxError) {
          logMessage(`⚠️ Error disconnecting PLX device: ${String(plxError)}`);
          // Continue with BleManager disconnect even if PLX disconnect fails
        }
      }

      // Then disconnect using BleManager
      await BleManager.disconnect(finalDeviceId);
      logMessage(`✅ Device disconnected successfully`);

      // Update connection state
      setIsConnected(false);
      setDeviceId(null);

      // Clear any connection locks
      forceClearLock();

      // Notify of connection change if callback provided
      if (options?.onConnectionChange) {
        options.onConnectionChange(false, null);
      }

      return true;
    } catch (error) {
      logMessage(
        `❌ Error during disconnect: ${
          error instanceof Error ? error.message : String(error)
        }`
      );

      // Check if we're actually still connected
      try {
        const connectedDevices = await BleManager.getConnectedPeripherals([]);
        const stillConnected = connectedDevices.some(
          (device) => device.id.toLowerCase() === finalDeviceId.toLowerCase()
        );

        if (!stillConnected) {
          // Device is already disconnected despite the error
          logMessage("ℹ️ Device is already disconnected");
          setIsConnected(false);
          setDeviceId(null);

          // Clear any connection locks
          forceClearLock();

          if (options?.onConnectionChange) {
            options.onConnectionChange(false, null);
          }
          return true;
        }
      } catch (checkError) {
        // Ignore errors checking connection state
      }

      return false;
    }
  };

  const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

  const sendCommand = async (
    device: Device,
    command: string,
    retries = 2 // Default to 2 retries
  ): Promise<string> => {
    if (!device) {
      console.error("No device connected");
      throw new Error("No device connected");
    }

    // Try multiple times if needed
    let lastError: Error | null = null;
    const now = Date.now();
    const lastCmdTime = lastSuccessfulCommandTime.current ?? 0;
    const needsWakeup = now - lastCmdTime > 5000; // 5 second threshold

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Only perform wake-up sequence if it's been a while since the last command
        if (needsWakeup && attempt === 0) {
          logMessage("💤 Device may be sleeping, sending quick wake-up...");
        } else if (attempt > 0) {
          // For retries, always send a wake-up
          logMessage(
            `📢 Retry attempt ${attempt}/${retries} - sending wake-up signal...`
          );
        }

        // Encode command properly for the OBD-II adapter
        const encodedCommand = Buffer.from(`${command}\r`, "utf8").toString(
          "base64"
        );
        console.log(
          `Sending Command (attempt ${attempt + 1}/${retries + 1}):`,
          command
        );

        await device.writeCharacteristicWithResponseForService(
          SERVICE_UUID,
          WRITE_UUID,
          encodedCommand
        );

        // Create promise for response
        const response = await new Promise<string>((resolve, reject) => {
          let receivedBytes: number[] = [];
          let responseText = "";
          let subscription: any = null;
          let isCompleted = false;

          try {
            subscription = device.monitorCharacteristicForService(
              SERVICE_UUID,
              READ_UUID,
              (error, characteristic) => {
                if (isCompleted) return;

                if (error) {
                  console.error("Error receiving response:", error);
                  if (subscription) {
                    try {
                      subscription.remove();
                    } catch (removalError) {
                      // Silently ignore removal errors
                    }
                  }

                  if (!isCompleted) {
                    isCompleted = true;
                    reject(error);
                  }
                  return;
                }

                if (characteristic?.value) {
                  const decodedChunk = base64.decode(characteristic.value);
                  console.log("Received Chunk:", decodedChunk);

                  for (let i = 0; i < decodedChunk.length; i++) {
                    receivedBytes.push(decodedChunk.charCodeAt(i));
                  }

                  if (decodedChunk.includes(">")) {
                    responseText = Buffer.from(receivedBytes)
                      .toString("utf8")
                      .trim();
                    console.log("Full Response (Raw):", responseText);

                    responseText = responseText
                      .replace(/\r/g, "")
                      .replace(/\n/g, "")
                      .replace(">", "");

                    if (responseText.startsWith(command)) {
                      responseText = responseText
                        .substring(command.length)
                        .trim();
                    }

                    console.log("Parsed Response:", responseText);
                    isCompleted = true;

                    if (subscription) {
                      try {
                        subscription.remove();
                      } catch (removalError) {
                        console.log("Ignoring subscription removal error");
                      }
                    }

                    resolve(responseText);
                  }
                }
              }
            );
          } catch (subError) {
            if (!isCompleted) {
              isCompleted = true;
              reject(subError);
            }
          }

          // Add a timeout - shorter for retry attempts
          const timeoutMs = attempt === retries ? 5000 : 3000;
          setTimeout(() => {
            if (!isCompleted) {
              isCompleted = true;
              if (subscription) {
                try {
                  subscription.remove();
                } catch (removalError) {
                  // Silently handle subscription removal errors
                }
              }

              if (receivedBytes.length > 0) {
                const partialResponse = Buffer.from(receivedBytes)
                  .toString("utf8")
                  .trim();
                resolve(partialResponse);
              } else {
                reject(new Error(`Command timed out (attempt ${attempt + 1})`));
              }
            }
          }, timeoutMs);
        });

        // If we got here, command succeeded - update timestamp and return
        lastSuccessfulCommandTime.current = Date.now();
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`Error sending command (attempt ${attempt + 1}):`, error);

        // On last attempt, throw the error
        if (attempt === retries) {
          throw lastError;
        }

        // Wait progressively longer between retries
        await new Promise((resolve) =>
          setTimeout(resolve, 500 * (attempt + 1))
        );
      }
    }

    // We shouldn't reach here, but just in case
    throw lastError || new Error("Unknown command error");
  };

  // Reconnect to previously used device
  const connectToRememberedDevice = async (): Promise<boolean> => {
    if (!rememberedDevice) {
      logMessage("⚠️ No remembered device found");
      return false;
    }

    try {
      // BLE Manager is already initialized in the hook
      // No need to reinitialize - it's a singleton

      // Now attempt connection
      const success = await connectToDevice(rememberedDevice);
      return success;
    } catch (error) {
      logMessage(`❌ Failed to connect to remembered device: ${String(error)}`);
      return false;
    }
  };

  // Add this function before the return statement
  const showAllDevices = async () => {
    logMessage("👁️ Showing all Bluetooth devices, including unnamed ones...");

    // Request permissions first
    const permissionsGranted = await requestPermissions();
    if (!permissionsGranted) {
      logMessage("⚠️ Cannot scan: insufficient permissions");
      return;
    }

    try {
      // Check if Bluetooth is on
      const bluetoothState = await BleManager.checkState();
      logMessage(`Bluetooth state before scan: ${bluetoothState}`);

      if (bluetoothState !== "on") {
        logMessage("❌ Cannot scan: Bluetooth is not enabled");
        return;
      }

      setIsScanning(true);
      setShowDeviceSelector(true);
      logMessage("🔎 Starting scan for ALL BLE devices (including unnamed)...");

      // Set up discovery listener for ALL devices
      const discoverSub = bleEmitter.addListener(
        "BleManagerDiscoverPeripheral",
        (device) => {
          // Add ALL devices, even those without names
          setDiscoveredDevices((prevDevices) => {
            const exists = prevDevices.some((d) => d.id === device.id);
            if (!exists) {
              logMessage(
                `🔍 Found device: ${device.name || "Unnamed"} (${
                  device.id
                }), RSSI: ${device.rssi}`
              );
              return [
                ...prevDevices,
                {
                  id: device.id,
                  name: device.name || null,
                  rssi: device.rssi,
                  isConnectable: device.isConnectable,
                },
              ];
            }
            return prevDevices;
          });
        }
      );

      // Start scanning with no filters and with duplicates allowed
      await BleManager.scan([], 5, true); // Longer scan (5 seconds) to find more devices
      logMessage("✅ Scanning started (showing ALL devices)");

      // Stop scan after timeout
      setTimeout(async () => {
        try {
          await BleManager.stopScan();
          logMessage("🛑 Scan stopped after timeout");

          // Get all discovered devices directly from BleManager
          const allDevices = await BleManager.getDiscoveredPeripherals();

          logMessage(`🔍 Total devices discovered: ${allDevices.length}`);

          // Update the state with ALL devices
          if (allDevices.length > 0) {
            const formattedDevices = allDevices.map((device) => ({
              id: device.id,
              name: device.name || null,
              rssi: device.rssi || -100,
              isConnectable: true, // Default to true if not specified
            }));

            setDiscoveredDevices(formattedDevices);
            logMessage(`✅ Showing all ${allDevices.length} devices`);
          }
        } catch (err) {
          logMessage(
            `❌ Error stopping scan: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        }

        discoverSub.remove();
        setIsScanning(false);
      }, 5000); // Match the scan timeout with the scan duration
    } catch (err) {
      setIsScanning(false);
      logMessage(
        `❌ Error during scan: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  };

  // Connect and bond with a device

  // Verify connection
  const verifyConnection = async (targetDeviceId: string): Promise<boolean> => {
    if (!targetDeviceId) return false;

    try {
      logMessage(`🔍 Verifying connection to device ${targetDeviceId}...`);

      const connectedDevices = await BleManager.getConnectedPeripherals([]);
      const isActuallyConnected = connectedDevices.some(
        (device) => device.id === targetDeviceId
      );

      if (!isActuallyConnected) {
        logMessage(
          "❌ Device reports as connected in app but not found in BleManager's connected devices!"
        );
        return false;
      }

      // Try to read RSSI as a lightweight connection test
      try {
        await BleManager.readRSSI(targetDeviceId);
        logMessage("✅ Connection verified - device responded to RSSI request");
        return true;
      } catch (rssiError) {
        logMessage(
          `❌ Device failed RSSI check: ${
            rssiError instanceof Error ? rssiError.message : String(rssiError)
          }`
        );
        return false;
      }
    } catch (error) {
      logMessage(
        `❌ Error verifying connection: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return false;
    }
  };

  // Load remembered device
  const loadRememberedDevice = async () => {
    try {
      logMessage("🔍 Checking for remembered device...");
      const deviceJson = await AsyncStorage.getItem(REMEMBERED_DEVICE_KEY);

      if (deviceJson) {
        const device = JSON.parse(deviceJson);
        setRememberedDevice(device);
        logMessage(
          `✅ Remembered device found: ${device.name || "Unnamed device"} (${
            device.id
          })`
        );
        return device;
      } else {
        logMessage("ℹ️ No remembered device found");
        return null;
      }
    } catch (error) {
      logMessage(
        `❌ Failed to load remembered device: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return null;
    }
  };

  // Device connection function
  const connectToDevice = async (device: BluetoothDevice): Promise<boolean> => {
    if (isLocked()) {
      logMessage(
        "⚠️ Connection already in progress, cancelling this connection"
      );
      return false;
    }

    setLock(); // Set connection lock

    try {
      // BLE Manager is already initialized in the hook - no need to reinitialize
      logMessage(`Connecting to ${device.id}...`);

      // Add a timeout to prevent hanging indefinitely
      const connectionPromise = BleManager.connect(device.id);
      const timeoutPromise = new Promise<void>((_, reject) =>
        setTimeout(
          () => reject(new Error("Connection timeout after 15 seconds")),
          15000
        )
      );

      await Promise.race([connectionPromise, timeoutPromise]);
      logMessage("✅ Connection established");

      // Discover services on the device to ensure it's fully connected
      logMessage("🔍 Discovering device services...");
      try {
        await BleManager.retrieveServices(device.id);
        logMessage("✅ Services discovered successfully");
      } catch (serviceError) {
        logMessage(
          `⚠️ Service discovery error: ${
            serviceError instanceof Error
              ? serviceError.message
              : String(serviceError)
          }`
        );
        // Continue anyway - services might be discovered later
      }

      // Send initial keep-alive command to device to confirm connection is active
      // This prevents devices from silently disconnecting due to timeout
      logMessage("📡 Sending keep-alive signal to device...");
      try {
        await BleManager.readRSSI(device.id);
        logMessage("✅ Keep-alive signal confirmed - device is responding");
      } catch (keepAliveError) {
        logMessage(
          `⚠️ Keep-alive signal failed: ${
            keepAliveError instanceof Error
              ? keepAliveError.message
              : String(keepAliveError)
          }`
        );
        // This is just a safety measure, don't fail the connection
      }

      // Update connection state
      setDeviceId(device.id);
      setIsConnected(true);

      // Remember this device for future
      await rememberDevice(device);

      releaseLock(); // Release connection lock
      return true;
    } catch (error) {
      logMessage(`❌ Connection failed: ${String(error)}`);
      releaseLock(); // Always release lock on error
      return false;
    }
  };

  // Save device for later use
  const rememberDevice = async (device: BluetoothDevice) => {
    try {
      await AsyncStorage.setItem(REMEMBERED_DEVICE_KEY, JSON.stringify(device));
      setRememberedDevice(device);
      logMessage(
        `💾 Device saved for future connections: ${
          device.name || "Unnamed device"
        }`
      );
    } catch (error) {
      logMessage(
        `❌ Failed to save device: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  // Forget previously remembered device
  const forgetRememberedDevice = async () => {
    try {
      await AsyncStorage.removeItem(REMEMBERED_DEVICE_KEY);
      setRememberedDevice(null);
      logMessage("🗑️ Remembered device has been forgotten");
    } catch (error) {
      logMessage(
        `❌ Failed to forget device: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  // Request permissions
  const requestPermissions = async () => {
    logMessage("🔐 Requesting Bluetooth permissions...");

    try {
      if (Platform.OS === "ios") {
        logMessage("📱 iOS detected, no explicit permission requests needed");
        // BLE Manager is already initialized in the hook
        return true;
      } else if (Platform.OS === "android") {
        logMessage(`📱 Android API level ${Platform.Version} detected`);

        let permissionsToRequest: string[] = [];
        let permissionResults = {};

        if (Platform.Version >= 31) {
          // Android 12+
          logMessage("Requesting Android 12+ permissions");
          permissionsToRequest = [
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ];
        } else if (Platform.Version >= 23) {
          logMessage("Requesting Android 6-11 permissions");
          permissionsToRequest = [
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ];
        }

        // Request permissions and log results
        permissionResults = await PermissionsAndroid.requestMultiple(
          permissionsToRequest as any
        );

        // Log each permission result
        Object.entries(permissionResults).forEach(([permission, result]) => {
          logMessage(`Permission ${permission}: ${result}`);
        });

        // Check if any permission was denied
        const denied = Object.values(permissionResults).includes(
          PermissionsAndroid.RESULTS.DENIED
        );
        if (denied) {
          logMessage("❌ Some permissions were denied!");
        } else {
          logMessage("✅ All permissions granted");
        }

        return !denied;
      }
    } catch (error) {
      logMessage(
        `❌ Error requesting permissions: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return false;
    }
  };

  // Scan for devices
  const startScan = async () => {
    logMessage("🔍 Preparing to scan for Bluetooth devices...");

    // Request permissions first
    const permissionsGranted = await requestPermissions();
    if (!permissionsGranted) {
      logMessage("⚠️ Cannot scan: insufficient permissions");
      return;
    }

    try {
      // BLE Manager is already initialized in the hook - no need to reinitialize
      
      // Check if Bluetooth is on
      const bluetoothState = await BleManager.checkState();
      logMessage(`Bluetooth state before scan: ${bluetoothState}`);

      if (bluetoothState !== "on") {
        logMessage("❌ Cannot scan: Bluetooth is not enabled");
        return;
      }

      setIsScanning(true);
      setDiscoveredDevices([]);
      // Set showDeviceSelector to true when scanning starts
      setShowDeviceSelector(true); // Add this line
      logMessage("🔎 Starting scan for all BLE devices...");

      // Set up discovery listener
      const discoverSub = bleEmitter.addListener(
        "BleManagerDiscoverPeripheral",
        (device) => {
          logMessage(`📡 RAW DEVICE: ${JSON.stringify(device)}`);

          // Only add devices that have a name
          if (device.name) {
            // Add to discovered devices if not already present
            setDiscoveredDevices((prevDevices) => {
              const exists = prevDevices.some((d) => d.id === device.id);
              if (!exists) {
                logMessage(
                  `🔍 Found named device: ${device.name} (${device.id}), RSSI: ${device.rssi}, Connectable: ${device.isConnectable}`
                );
                return [
                  ...prevDevices,
                  {
                    id: device.id,
                    name: device.name,
                    rssi: device.rssi,
                    isConnectable: device.isConnectable,
                  },
                ];
              }
              return prevDevices;
            });
          } else {
            // Just log unnamed devices but don't add them to the list
            logMessage(`⏭️ Skipping unnamed device with ID: ${device.id}`);
          }
        }
      );

      // Start scanning with no filters and with duplicates allowed
      await BleManager.scan([], 2, true);
      logMessage("✅ Scanning started (2 seconds)");

      // Get a list of known devices that might be connected already
      try {
        const connectedDevices = await BleManager.getConnectedPeripherals([]);
        logMessage(`🔌 Already connected devices: ${connectedDevices.length}`);
        connectedDevices.forEach((device) => {
          logMessage(`  → ${device.name || "Unnamed"} (${device.id})`);
        });
      } catch (err) {
        logMessage(
          `❌ Error getting connected devices: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }

      // Stop scan after 15 seconds
      setTimeout(async () => {
        try {
          await BleManager.stopScan();
          logMessage("🛑 Scan stopped after timeout");

          try {
            // Get discovered devices directly from BleManager
            const discoveredFromManager =
              await BleManager.getDiscoveredPeripherals();
            const namedDevices = discoveredFromManager.filter((d) => d.name);

            logMessage(
              `🔍 Total devices discovered by BleManager: ${discoveredFromManager.length}`
            );
            logMessage(
              `📱 Named devices: ${namedDevices.length}, Unnamed devices: ${
                discoveredFromManager.length - namedDevices.length
              }`
            );

            // Update the state with named devices directly from the manager
            if (namedDevices.length > 0) {
              // Map the devices to the expected format
              const formattedDevices = namedDevices.map((device) => ({
                id: device.id,
                name: device.name || null,
                rssi: device.rssi || -100,
                isConnectable: true, // Assume connectable unless proven otherwise
              }));

              setDiscoveredDevices(formattedDevices);
              logMessage(
                `✅ Setting ${namedDevices.length} named devices in state`
              );
            } else {
              logMessage(
                "⚠️ No named devices were discovered during this scan"
              );
            }
          } catch (err) {
            logMessage(
              `❌ Error getting discovered devices: ${
                err instanceof Error ? err.message : String(err)
              }`
            );
          }
        } catch (err) {
          logMessage(
            `❌ Error stopping scan: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        }

        discoverSub.remove();
        setIsScanning(false);
      }, 2000); // 2 seconds scan time
    } catch (err) {
      setIsScanning(false);
      logMessage(
        `❌ Error during scan: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  };

  // Discover device characteristics
  // Send JSON alert batch to ESP32 device
  const sendJSONAlert = async (
    jsonPayload: string,
    targetDeviceId?: string
  ): Promise<boolean> => {
    try {
      if (!isConnected) {
        logMessage("Not connected to any device");
        return false;
      }

      const device = targetDeviceId
        ? deviceId === targetDeviceId
          ? plxDevice
          : null
        : plxDevice;

      if (!device) {
        logMessage(
          `Target device ${targetDeviceId || "current"} not available`
        );
        return false;
      }

      logMessage(
        `Sending JSON alert batch (${jsonPayload.length} bytes) to ${
          device.name || device.id
        }`
      );

      // Convert JSON to bytes for ESP32
      const jsonBytes = Buffer.from(jsonPayload, "utf8");
      const base64Data = jsonBytes.toString("base64");

      // Send in chunks if payload is large (ESP32 has limited buffer)
      const CHUNK_SIZE = 500; // ESP32 safe chunk size
      const chunks = [];

      for (let i = 0; i < base64Data.length; i += CHUNK_SIZE) {
        chunks.push(base64Data.substring(i, i + CHUNK_SIZE));
      }

      logMessage(`Sending JSON in ${chunks.length} chunks`);

      // Send header with total chunks and payload info
      const header = JSON.stringify({
        type: "ALERT_BATCH",
        totalChunks: chunks.length,
        payloadSize: jsonPayload.length,
        timestamp: Math.floor(Date.now() / 1000),
      });

      // Send each chunk
      for (let i = 0; i < chunks.length; i++) {
        await sendCommand(device, `JSON_CHUNK:${i}:${chunks[i]}`);
        await new Promise((resolve) => setTimeout(resolve, 50)); // Small delay between chunks
        logMessage(`Sent chunk ${i + 1}/${chunks.length}`);
      }

      // Send completion signal
      await sendCommand(device, "JSON_COMPLETE");

      logMessage(
        `Successfully sent JSON alert batch to ${device.name || device.id}`
      );
      return true;
    } catch (error) {
      logMessage(
        `Error sending JSON alert: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return false;
    }
  };

  // Methods
  return {
    // State Variables
    voltage,
    discoveredDevices,
    isScanning,
    plxDevice,
    writeServiceUUID,
    writeCharUUID,
    readCharUUID,
    deviceId,
    lastSuccessfulCommandTime,
    showDeviceSelector,
    rememberedDevice,
    isConnected,
    showAllDevices,

    // Methods
    logMessage,
    startScan,
    connectToDevice,
    connectToRememberedDevice,
    disconnectDevice,
    sendCommand,
    verifyConnection,
    rememberDevice,
    forgetRememberedDevice,
    forceClearLock,

    // JSON Alert functions for ESP32
    sendJSONAlert,

    // Setters for discoveredDevices if needed externally
    setDiscoveredDevices,
  };
};
