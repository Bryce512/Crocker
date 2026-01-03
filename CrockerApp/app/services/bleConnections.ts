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
const TARGET_DEVICE_NAME = "OBDII"; // Change to your device's Bluetooth name
const TARGET_DEVICE_ID = "53fc0537-e506-0bcf-81ec-e757067e9ed3"; // Change to your device's ID

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
  const [readCharUUID, setReadCharUUID] = useState<string>(
    CONFIG_CHAR_UUID
  );
  const activeOperations = useRef(0);
  const connectionLockTime = useRef<number | null>(null);

  // In the useEffect
  useEffect(() => {
    initializeBLE(deviceId || "");

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
  async function connectAndBond(deviceId: string): Promise<void> {
    try {
      // Initialize BleManager if needed
      await BleManager.start({ showAlert: false });

      // Connect to the device
      await BleManager.connect(deviceId);
      console.log("Connected to device", deviceId);

      // Bonding (Android only; iOS auto manages bonding)
      if (Platform.OS === "android") {
        try {
          await BleManager.createBond(deviceId);
          logMessage(`🔒 Bonded with device ${deviceId}...`);
        } catch (bondError) {
          logMessage(
            `❌ Failed to bond with device ${deviceId}: ${
              bondError instanceof Error ? bondError.message : String(bondError)
            }`
          );
          throw bondError; // Re-throw to handle in the catch block
        }
      }
      // Retrieve services after connection/bonding
      await BleManager.retrieveServices(deviceId);
    } catch (error) {
      console.error("connectAndBond error:", error);
      throw error;
    }
  }

  async function connectToBondedDeviceIfAvailable() {
    try {
      // Retrieve bonded devices (Android only)
      const bondedDevices = await BleManager.getBondedPeripherals();

      console.log("Bonded devices:", bondedDevices);

      // Find the target device by name or id
      const targetDevice = bondedDevices.find(
        (device) =>
          device.name === TARGET_DEVICE_NAME || device.id === TARGET_DEVICE_ID
      );

      if (!targetDevice) {
        console.log("No bonded target device found");
        return null;
      }

      // Check if already connected (optional)
      const connectedDevices = await BleManager.getConnectedPeripherals([]);
      const isAlreadyConnected = connectedDevices.some(
        (d) => d.id === targetDevice.id
      );
      if (isAlreadyConnected) {
        console.log("Device already connected");
        return targetDevice;
      }

      // Connect to the device
      console.log(`Connecting to bonded device ${targetDevice.id}...`);
      await BleManager.connect(targetDevice.id);
      console.log("Connected!");

      // Optional: retrieve services
      await BleManager.retrieveServices(targetDevice.id);

      return targetDevice;
    } catch (error) {
      console.error("Failed to connect to bonded device:", error);
      return null;
    }
  }

  const initializeBLE = async (deviceID: string) => {
    logMessage("🔄 Initializing Bluetooth module...");

    if (!BleManagerModule) {
      logMessage("❌ ERROR: BleManagerModule is not available!");
      return;
    }

    try {
      logMessage(
        `✅ BleManagerModule detected: ${Object.keys(BleManagerModule).join(
          ", "
        )}`
      );
      await BleManager.start({ showAlert: false });
      logMessage("✅ BLE Manager started successfully");

      const state = await BleManager.checkState();
      logMessage(`📱 Bluetooth state: ${state}`);

      // setupAllBleListeners(deviceID);
      await loadRememberedDevice();
    } catch (error) {
      logMessage(
        `❌ Failed to initialize BLE: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  // Setup BLE listeners
  const setupAllBleListeners = async (deviceID: string) => {
    logMessage("📡 Setting up Bluetooth event listeners");

    // State change listener
    bleEmitter.addListener("BleManagerDidUpdateState", (args) => {
      logMessage(`🔵 Bluetooth state changed: ${JSON.stringify(args)}`);
    });

    // Stop scan listener
    bleEmitter.addListener("BleManagerStopScan", () => {
      logMessage("🛑 Scan stopped");
      setIsScanning(false);
    });

    // Connection listeners
    bleEmitter.addListener("BleManagerConnectPeripheral", (args) => {
      logMessage(`🔌 Device connected: ${JSON.stringify(args)}`);
    });

    bleEmitter.addListener("BleManagerDisconnectPeripheral", (args) => {
      logMessage(`🔌 Device disconnected: ${JSON.stringify(args)}`);
      setIsConnected(false);
      setDeviceId(null);

      // Notify context
      if (options?.onConnectionChange) {
        options.onConnectionChange(false, null);
      }
    });

    bleEmitter.addListener(
      "BleManagerDidUpdateValueForCharacteristic",
      (args) => {
        logMessage(`🌐 GLOBAL EVENT - value updates: ${JSON.stringify(args)}`);
        const data = args.value;
        logMessage(`📬 Decoded response: ${data ?? "null"}`);
      }
    );

    // Start notifications
    try {
      await BleManager.retrieveServices(deviceID); // <- Always do this before startNotification
      logMessage(
        `Starting notifications on ${writeServiceUUID}/${readCharUUID}...`
      );
      await BleManager.startNotification(deviceID, "fff0", "fff1");

      logMessage("✅ Notifications started");
    } catch (err) {
      logMessage(
        `❌ startNotification failed: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  };

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
      logMessage(`Connecting to ${device.id}...`);
      await BleManager.connect(device.id);
      logMessage("✅ Connection established");

      // Update connection state
      setDeviceId(device.id);
      setIsConnected(true);

      // Discover services and set up notifications
      await discoverDeviceProfile(device.id);

      // Initialize OBD
      await initializeOBD(device.id);

      // Remember this device for future
      await rememberDevice(device);
      await getPlxDeviceFromConnection(device.id);

      releaseLock(); // Release connection lock
      return true;
    } catch (error) {
      logMessage(`❌ Connection failed: ${String(error)}`);
      releaseLock(); // Always release lock on error
      return false;
    }
  };

  // Reconnect to previously used device
  const connectToRememberedDevice = async (): Promise<boolean> => {
    if (!rememberedDevice) {
      logMessage("ℹ️ No remembered device found");
      return false;
    }

    await connectToDevice(rememberedDevice);

    try {
      initializeOBD(rememberedDevice.id);
      return true;
    } catch (error) {
      logMessage(
        `❌ Error initializing OBD for remembered device: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
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
        await BleManager.start({ showAlert: false });
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
  const discoverDeviceProfile = async (
    targetDeviceId: string
  ): Promise<boolean> => {
    try {
      logMessage(`🔍 Discovering device profile for ${targetDeviceId}...`);

      // Make sure we're connected
      const isConnected = await verifyConnection(targetDeviceId);
      if (!isConnected) {
        logMessage("❌ Cannot discover services - device not connected");
        return false;
      }

      // Retrieve services with retry
      let services = null;
      let retryCount = 3;

      while (retryCount > 0 && !services) {
        try {
          logMessage(`Retrieving services (attempt ${4 - retryCount}/3)...`);
          services = await BleManager.retrieveServices(targetDeviceId);
          break;
        } catch (error) {
          retryCount--;
          logMessage(
            `Failed to get services: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
          if (retryCount > 0) {
            logMessage(`Waiting before retry...`);
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      }

      if (!services) {
        logMessage("❌ Failed to retrieve services after multiple attempts");
        return false;
      }

      // Get available services
      if (services.services && services.services.length > 0) {
        logMessage(`✅ Discovered ${services.services.length} services:`);

        // For iOS and most react-native-ble-manager implementations, we need to look at each
        // service individually, not expecting characteristics to be a property
        let foundOBDService = false;

        // Common OBD service IDs (short format)
        const obdServiceIds = ["fff0", "ffe0", "ffb0"];

        // Find OBD-related service
        for (const service of services.services) {
          const serviceUUID = service.uuid.toLowerCase();
          logMessage(`Service: ${serviceUUID}`);

          // Check if this is a potential OBD service
          const isPotentialOBDService =
            obdServiceIds.some((id) => serviceUUID.includes(id)) ||
            serviceUUID === SERVICE_UUID.toLowerCase();

          if (isPotentialOBDService) {
            logMessage(`✅ Found potential OBD service: ${serviceUUID}`);

            // Try to use this service with common OBD characteristic patterns
            setWriteServiceUUID(service.uuid);

            // For CrockerDisplay service (550e8400-...440000):
            // - File Transfer: 550e8400-...440002
            // - Config: 550e8400-...440001
            // - Status: 550e8400-...440003
            if (serviceUUID.includes("550e8400")) {
              logMessage(`Using CrockerDisplay service pattern`);
              setWriteCharUUID(FILE_TRANSFER_CHAR_UUID);
              setReadCharUUID(CONFIG_CHAR_UUID);
              foundOBDService = true;
              break;
            }
            // For most OBD adapters, if service is fff0:
            // - Write characteristic is typically fff2
            // - Read/notify characteristic is typically fff1
            else if (serviceUUID.includes("fff0")) {
              logMessage(`Using standard OBD characteristic pattern`);
              setWriteCharUUID("fff2");
              setReadCharUUID("fff1");
              foundOBDService = true;
              break;
            }
            // For alternative service patterns
            else if (serviceUUID.includes("ffe0")) {
              setWriteCharUUID("ffe1"); // Common for HC-05/HC-06 modules
              foundOBDService = true;
              break;
            } else if (serviceUUID.includes("ffb0")) {
              setWriteCharUUID("ffb2"); // Another common pattern
              foundOBDService = true;
              break;
            }
          }
        }

        if (foundOBDService) {
          logMessage(`🎯 Will use service: ${writeServiceUUID}`);
          logMessage(`🎯 Will use write characteristic: ${writeCharUUID}`);
          return true;
        } else {
          // Fallback to CrockerDisplay default values if no proper service found
          logMessage(
            `⚠️ Could not identify suitable service, using CrockerDisplay defaults`
          );
          setWriteServiceUUID(SERVICE_UUID);
          setWriteCharUUID(FILE_TRANSFER_CHAR_UUID);
          setReadCharUUID(CONFIG_CHAR_UUID);
          return false;
        }
      } else {
        logMessage(`⚠️ No services found on device`);
        return false;
      }
    } catch (error) {
      logMessage(
        `❌ Error in device profile discovery: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return false;
    }
  };

  // Initialize OBD device
  const initializeOBD = async (
    targetDeviceId?: string | null
  ): Promise<boolean> => {
    // Use the provided ID or fall back to the hook's deviceId
    const finalDeviceId = targetDeviceId || deviceId;

    // Check that we have a valid device ID
    if (!finalDeviceId) {
      logMessage("❌ Cannot initialize OBD: No device ID available");
      return false;
    }

    try {
      logMessage("🔄 Initializing OBD-II adapter...");
      logMessage(`------ Retrieving services in InitializeOBD() ------`);
      const services = await BleManager.retrieveServices(finalDeviceId);
      logMessage(`Discovered services: ${JSON.stringify(services, null, 2)}`);
      await delay(500);

      setupAllBleListeners(finalDeviceId); // Ensure listeners are set up

      // Reset first and wait longer for it to complete
      logMessage("Sending reset command: ATZ");
      if (!plxDevice) {
        logMessage("❌ No PLX device available for reset");
        return false;
      }
      await sendCommand(plxDevice, "ATZ");

      // // Important: Wait longer after reset (2 seconds)
      logMessage("Waiting for device to reset...");
      await delay(500); // Wait 2 seconds for reset to complete

      // Now send the remaining commands SEQUENTIALLY
      const commands = [
        "ATL0", // Turn off linefeeds
        "ATH0", // Turn off headers
        "ATE0", // Turn off echo
        "ATS0", // Turn off spaces
        "ATI", // Get version info
        "AT SP 0", // Set protocol to auto
      ];

      for (const cmd of commands) {
        logMessage(`Sending init command: ${cmd}`);
        await delay(100); // Wait between commands
      }

      logMessage("✅ OBD initialization sequence completed");
      return true;
    } catch (error) {
      logMessage(
        `❌ OBD initialization failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return false;
    }
  };

  // Updated fix with both issues addressed
  const getPlxDeviceFromConnection = async (
    deviceId: string
  ): Promise<Device | null> => {
    try {
      logMessage("🔄 Creating BLE PLX device from connected device...");

      // Try both lowercase and uppercase IDs
      const upperDeviceId = deviceId.toUpperCase();
      const lowerDeviceId = deviceId.toLowerCase();

      // Try to find device with either case
      let plxDevices = await blePlxManager.devices([lowerDeviceId]);
      if (!plxDevices || plxDevices.length === 0) {
        plxDevices = await blePlxManager.devices([upperDeviceId]);
      }

      if (plxDevices && plxDevices.length > 0) {
        const device = plxDevices[0];

        // Important: Connect to the device explicitly
        logMessage(`Connecting to PLX device ${device.id}...`);
        const connectedDevice = await device.connect();
        logMessage("✅ PLX device connected successfully");

        // Discover services after connecting
        logMessage("Discovering services for PLX device...");
        const deviceWithServices =
          await connectedDevice.discoverAllServicesAndCharacteristics();
        logMessage("✅ Services discovered for PLX device");

        setPlxDevice(deviceWithServices);
        return deviceWithServices;
      }

      logMessage("❌ Device not found by BLE PLX");
      return null;
    } catch (error) {
      logMessage(
        `❌ Error getting PLX device: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return null;
    }
  };

  /**
   * Helper function to wake up the OBD-II device
   */
  const wakeUpDevice = async (device: Device): Promise<boolean> => {
    try {
      logMessage("💤 Performing full OBD device wake-up sequence...");

      try {
        const wakeupCmd = Buffer.from("\r", "utf8").toString("base64");
        await device.writeCharacteristicWithResponseForService(
          SERVICE_UUID,
          WRITE_UUID,
          wakeupCmd
        );
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (e) {
        // Ignore wake-up errors
      }

      // Update the last command time after a full wake-up
      lastSuccessfulCommandTime.current = Date.now();
      return true;
    } catch (error) {
      logMessage(`⚠️ Wake-up sequence failed: ${String(error)}`);
      return false;
    }
  };

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
          try {
            // Simple wake-up - just send a carriage return
            await wakeUpDevice(device);
            logMessage("✅ Device wake-up command sent successfully");
          } catch (wakeupError) {
            // Ignore wake-up errors
            logMessage("Wake-up command ignored error");
          }
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

      // Send header first
      await sendCommand(device, `JSON_HEADER:${header}`);
      await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay

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

  // Send single immediate alert (for testing or urgent alerts)
  const sendImmediateAlert = async (
    alertTitle: string,
    minutesUntil: number,
    targetDeviceId?: string
  ): Promise<boolean> => {
    const immediateAlert = {
      type: "IMMEDIATE_ALERT",
      title: alertTitle.substring(0, 50), // Limit for ESP32
      minutes_until: minutesUntil,
      timestamp: Math.floor(Date.now() / 1000),
      vibration: minutesUntil <= 5 ? [500, 200, 500] : [200, 100, 200],
    };

    return await sendJSONAlert(JSON.stringify(immediateAlert), targetDeviceId);
  };

  // Verify ESP32 received and processed alert batch
  const verifyAlertBatchDelivery = async (
    checksum: string,
    targetDeviceId?: string
  ): Promise<boolean> => {
    try {
      const device = targetDeviceId
        ? deviceId === targetDeviceId
          ? plxDevice
          : null
        : plxDevice;

      if (!device) {
        return false;
      }

      // Request ESP32 to confirm batch with checksum
      const response = await sendCommand(device, `VERIFY_BATCH:${checksum}`);

      // ESP32 should respond with 'BATCH_OK' or 'BATCH_ERROR'
      return response.includes("BATCH_OK");
    } catch (error) {
      logMessage(
        `Error verifying alert batch: ${
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
    initializeOBD,
    discoverDeviceProfile,
    forceClearLock,
    getPlxDeviceFromConnection,
    wakeUpDevice,

    // JSON Alert functions for ESP32
    sendJSONAlert,
    sendImmediateAlert,
    verifyAlertBatchDelivery,

    // Setters for discoveredDevices if needed externally
    setDiscoveredDevices,
    connectToBondedDeviceIfAvailable,
  };
};
