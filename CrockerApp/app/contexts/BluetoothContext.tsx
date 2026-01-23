import React, {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { useBleConnection } from "../services/bleConnections";
import { AppState } from "react-native";
import { Device } from "react-native-ble-plx";
import BleManager from "react-native-ble-manager";
import { obdDataFunctions } from "../services/obdDataCollection";
import bluetoothService from "../services/bluetoothService";
import AppErrorService from "../services/errorService";
import deviceManagementService from "../services/deviceManagementService";
import { useEventSync } from "../hooks/useEventSync";
import { BluetoothDevice, ConnectionState, RegisteredDevice } from "../models";
import { DeviceSyncStatus } from "../services/eventSyncService";

// Enhanced context interface with device management and sync
interface BluetoothContextType {
  // Connection state
  connectionState: ConnectionState;

  // Device management
  discoveredDevices: BluetoothDevice[];
  registeredDevices: RegisteredDevice[];
  rememberedDevice: BluetoothDevice | null;
  plxDevice: Device | null;

  // Sync management
  syncStatus: DeviceSyncStatus[];
  devicesNeedingSync: DeviceSyncStatus[];
  isSyncing: boolean;

  // UI state
  showDeviceSelector: boolean;
  reconnectAttempt: number;

  // Core actions (enhanced)
  startScan: () => Promise<void>;
  connectToDevice: (device: BluetoothDevice) => Promise<boolean>;
  disconnectDevice: () => Promise<void>;

  // Device management actions
  loadRegisteredDevices: () => Promise<void>;
  connectToRegisteredDevice: (device: RegisteredDevice) => Promise<boolean>;

  // Event sync actions
  syncDeviceEvents: (kidId: string, deviceId?: string) => Promise<boolean>;
  markAllDevicesForResync: () => Promise<void>;
  forceSyncAll: () => Promise<void>;
  refreshSyncStatus: () => Promise<void>;

  // State setters
  setDiscoveredDevices: (devices: BluetoothDevice[]) => void;
  setShowDeviceSelector: (show: boolean) => void;
  setSyncingFlag: (isSyncing: boolean) => void;

  // Utility functions
  logMessage: (message: string) => void;
}

// Create the context
const BluetoothContext = createContext<BluetoothContextType | undefined>(
  undefined
);

// Provider component
export const BluetoothProvider = ({ children }: { children: ReactNode }) => {
  // Get base BLE functionality from the hook
  const bleConnectionHook = useBleConnection();

  // Get event sync functionality
  const eventSync = useEventSync();

  // State variables managed at the context level

  // Maintain context-level state that persists across screens
  const [isConnected, setIsConnected] = useState(bleConnectionHook.isConnected);
  const [isScanning, setIsScanning] = useState(bleConnectionHook.isScanning);
  const [deviceId, setDeviceId] = useState<string | null>(
    bleConnectionHook.deviceId
  );
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [discoveredDevices, setDiscoveredDevices] = useState<any[]>(
    bleConnectionHook.discoveredDevices
  );
  const [showDeviceSelector, setShowDeviceSelector] = useState(
    bleConnectionHook.showDeviceSelector
  );

  const [rememberedDevice, setRememberedDevice] = useState(
    bleConnectionHook.rememberedDevice
  );
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [registeredDevices, setRegisteredDevices] = useState<
    RegisteredDevice[]
  >([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const logMessage = bleConnectionHook.logMessage;

  // Reference to hook's log to track changes

  // Monitor connection state changes and log them
  useEffect(() => {
    if (isConnected && deviceId) {
      logMessage(
        `✅ CONNECTED to device: ${deviceName || deviceId}`
      );
    } else if (!isConnected && deviceId) {
      logMessage(
        `❌ DISCONNECTED from device: ${deviceName || deviceId}`
      );
    }
  }, [isConnected, deviceId, deviceName]);

  // Sync hook state to context state
  useEffect(() => {
    setIsConnected(bleConnectionHook.isConnected);
    setDeviceId(bleConnectionHook.deviceId);
    setDiscoveredDevices(bleConnectionHook.discoveredDevices);
    setShowDeviceSelector(bleConnectionHook.showDeviceSelector);
    setRememberedDevice(bleConnectionHook.rememberedDevice);
  }, [
    bleConnectionHook.isConnected,
    bleConnectionHook.deviceId,
    bleConnectionHook.discoveredDevices,
    bleConnectionHook.showDeviceSelector,
    bleConnectionHook.rememberedDevice,
  ]);

  // Load registered devices on initialization
  useEffect(() => {
    console.log(
      "🔷 BluetoothContext: Initializing and loading registered devices"
    );
    loadRegisteredDevices();
  }, []);

  // Monitor app state for background/foreground transitions
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        verifyAndReconnectIfNeeded();
        loadRegisteredDevices(); // Refresh registered devices when app becomes active
      }
    });

    return () => subscription.remove();
  }, [deviceId, isConnected]);

  // Verify connection periodically (but skip during sync)
  useEffect(() => {
    if (isConnected && deviceId && !isSyncing) {
      const interval = setInterval(async () => {
        const stillConnected = await verifyConnection(deviceId);
        if (!stillConnected && rememberedDevice) {
          logMessage("Connection lost, attempting reconnection from context");
          connectToRememberedDevice();
        }
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [isConnected, deviceId, rememberedDevice, isSyncing]);

  // Keep-alive effect: Send periodic RSSI reads to prevent device timeout
  // This runs even during sync to keep the connection alive
  useEffect(() => {
    if (isConnected && deviceId) {
      const interval = setInterval(async () => {
        try {
          // Send a lightweight RSSI read to keep the device active
          await verifyConnection(deviceId);
          logMessage("💓 Keep-alive signal sent");
        } catch (error) {
          logMessage(
            `⚠️ Keep-alive signal failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }, 5000); // Send keep-alive every 5 seconds

      return () => clearInterval(interval);
    }
  }, [isConnected, deviceId]);

  // Auto-connect effect: Continuously scan for registered devices and auto-connect
  // Skip when syncing to prevent BLE operation interference
  useEffect(() => {
    let scanInterval: NodeJS.Timeout | null = null;
    let isAutoConnecting = false;

    const startAutoConnect = async () => {
      // Skip if any operation is in progress
      if (isAutoConnecting || isSyncing) {
        logMessage("⏭️ Skipping auto-scan: operation in progress");
        return;
      }

      // Skip auto-scan if we're already connected - let manual disconnection happen first
      if (isConnected && deviceId) {
        logMessage("⏭️ Skipping auto-scan: device already connected");
        return;
      }

      // Don't proceed if we have no registered devices
      if (registeredDevices.length === 0) {
        logMessage("⏭️ No registered devices available for auto-connect");
        return;
      }

      isAutoConnecting = true;

      try {
        logMessage(
          `🔍 Auto-scanning for ${registeredDevices.length} registered device(s)...`
        );

        // Start active BLE scan - use longer scan time to ensure discovery
        try {
          await BleManager.scan([], 5, false); // Scan for 5 seconds
        } catch (scanError) {
          console.error("Scan initiation error:", scanError);
          logMessage(`⚠️ Scan initiation error: ${scanError}`);
          // Continue anyway, we can still check already discovered
        }

        // Wait longer for scan to complete
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Get both connected and discovered devices
        const connectedPeripherals = await BleManager.getConnectedPeripherals(
          []
        );
        const discoveredPeripherals =
          await BleManager.getDiscoveredPeripherals();

        // Combine all found devices
        const allFoundDevices = [
          ...connectedPeripherals,
          ...discoveredPeripherals,
        ];

        // Check if any registered device is in range
        for (const registeredDevice of registeredDevices) {
          // First try to match by ID
          let foundDevice = allFoundDevices.find(
            (d) => d.id === registeredDevice.id
          );

          // If not found by ID, try to match by name
          if (!foundDevice && registeredDevice.name) {
            foundDevice = allFoundDevices.find(
              (d) =>
                d.name === registeredDevice.name ||
                d.name === registeredDevice.nickname
            );
            if (foundDevice) {
              logMessage(
                `⚠️ Matched by name instead of ID. Device ID in database may be outdated: ${registeredDevice.id} → ${foundDevice.id}`
              );
            }
          }

          if (foundDevice) {
            logMessage(
              `✨ Registered device found in range: ${
                registeredDevice.nickname || registeredDevice.id
              }`
            );

            // Check if device is already in the connected peripherals list
            const isAlreadyConnected = connectedPeripherals.some(
              (d) => d.id === foundDevice!.id
            );

            if (!isAlreadyConnected) {
              logMessage(
                `🔗 Auto-connecting to ${registeredDevice.nickname}...`
              );
              try {
                // If we matched by name, update the device ID to the actual found device
                const deviceToConnect =
                  foundDevice.id !== registeredDevice.id
                    ? { ...registeredDevice, id: foundDevice.id }
                    : registeredDevice;

                await connectToRegisteredDevice(deviceToConnect);
                logMessage(`✅ Auto-connected to ${registeredDevice.nickname}`);
                return; // Exit after successful connection
              } catch (error) {
                console.error("Auto-connect failed:", error);
                logMessage(
                  `⚠️ Failed to auto-connect: ${
                    error instanceof Error ? error.message : String(error)
                  }`
                );
              }
            } else {
              logMessage(
                `ℹ️ Device already connected: ${registeredDevice.nickname}`
              );
            }
          }
        }
      } catch (error) {
        console.error("Auto-connect scan error:", error);
        logMessage(
          `⚠️ Auto-scan error: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      } finally {
        isAutoConnecting = false;
      }
    };

    // Start auto-scan interval (check every 30 seconds instead of 10)
    // Wait 2 seconds before first attempt to let devices load
    // Reduced frequency to prevent connection interference
    const initialDelay = setTimeout(() => {
      startAutoConnect();
      scanInterval = setInterval(startAutoConnect, 30000);
    }, 2000);

    return () => {
      clearTimeout(initialDelay);
      if (scanInterval) {
        clearInterval(scanInterval);
      }
    };
  }, [isConnected, deviceId, registeredDevices, isSyncing]);

  // Enhanced version of verifyConnection that updates context state
  const verifyConnection = async (deviceId: string): Promise<boolean> => {
    try {
      const isStillConnected = await bleConnectionHook.verifyConnection(
        deviceId
      );
      setIsConnected(isStillConnected);
      return isStillConnected;
    } catch (error) {
      setIsConnected(false);
      return false;
    }
  };

  // Verify and reconnect if needed
  const verifyAndReconnectIfNeeded = async () => {
    if (isConnected && deviceId) {
      logMessage("Verifying connection after app state change...");
      const stillConnected = await verifyConnection(deviceId);

      if (!stillConnected && rememberedDevice) {
        logMessage("Connection lost, attempting reconnection from context");
        try {
          await connectToRememberedDevice();
        } catch (error) {
          console.error("Reconnection failed:", error);
        }
      }
    }
  };

  // Enhanced connect function that updates context state
  const connectToDevice = async (device: any): Promise<boolean> => {
    try {
      logMessage(`Connecting to ${device.name || "Unnamed Device"}...`);
      const success = await bleConnectionHook.connectToDevice(device);

      if (success) {
        setIsConnected(true);
        setDeviceId(device.id);
        setDeviceName(device.name);
        setRememberedDevice(device);

        // Wait a moment for device to stabilize after connection
        await new Promise((resolve) => setTimeout(resolve, 200));

        // Send current unix timestamp to device after successful connection
        try {
          logMessage("📡 Syncing time with device...");
          await bluetoothService.sendTimestampToPeripheral(device.id);
          logMessage("✅ Device time synced");
        } catch (error) {
          console.error("⚠️ Failed to send timestamp:", error);
          // Don't fail the connection if timestamp send fails
        }
      }

      return success;
    } catch (error) {
      logMessage(
        `Connection error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return false;
    }
  };

  // Enhanced reconnect function that updates context state
  const connectToRememberedDevice = async (): Promise<boolean> => {
    try {
      setReconnectAttempt((prev) => prev + 1);
      const success = await bleConnectionHook.connectToRememberedDevice();

      if (success && rememberedDevice) {
        setIsConnected(true);
        setDeviceId(rememberedDevice.id);
        setDeviceName(rememberedDevice.name);
      }

      return success;
    } catch (error) {
      logMessage(
        `Reconnection error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return false;
    }
  };

  // Enhanced disconnect function
  const disconnectDevice = async (): Promise<void> => {
    try {
      await bleConnectionHook.disconnectDevice();
      setIsConnected(false);
      setDeviceId(null);
      setDeviceName(null);
      setRememberedDevice(null);
      setReconnectAttempt(0);
      logMessage("✅ Device disconnected and state cleared");
    } catch (error) {
      logMessage(
        `Disconnect error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  // Enhanced scan function
  const startScan = async (): Promise<void> => {
    try {
      await bleConnectionHook.startScan();
    } catch (error) {
      logMessage(
        `Scan error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  // Enhanced reconnect function with robustness
  const robustReconnect = async (): Promise<boolean> => {
    try {
      setReconnectAttempt((prev) => prev + 1);

      // First try normal reconnect
      let success = await connectToRememberedDevice();

      // If failed, try additional methods
      if (!success && rememberedDevice) {
        // Try with enhanced verification
        logMessage(
          "First attempt failed, trying with enhanced verification..."
        );
        const enhancedVerified = await enhancedVerifyConnection(
          rememberedDevice.id
        );

        if (enhancedVerified) {
          setIsConnected(true);
          setDeviceId(rememberedDevice.id);
          return true;
        }
      }

      return success;
    } catch (error) {
      logMessage(
        `Robust reconnect error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return false;
    }
  };

  // Load registered devices from device management service
  const loadRegisteredDevices = async (): Promise<void> => {
    try {
      const response = await deviceManagementService.getRegisteredDevices();
      if (response.success && response.data) {
        setRegisteredDevices(response.data);
        logMessage(`Loaded ${response.data.length} registered devices`);
      }
    } catch (error) {
      logMessage(
        `Error loading registered devices: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  // Connect to a registered device
  const connectToRegisteredDevice = async (
    device: RegisteredDevice
  ): Promise<boolean> => {
    try {
      logMessage(`Connecting to registered device: ${device.nickname}`);

      const bluetoothDevice: BluetoothDevice = {
        id: device.id,
        name: device.name,
        rssi: device.rssi || -100,
        isConnectable: true,
      };

      const success = await connectToDevice(bluetoothDevice);

      if (success) {
        // Mark device as connected in device management service
        await deviceManagementService.markDeviceConnected(device.id);
        logMessage(`Successfully connected to ${device.nickname}`);
      }

      return success;
    } catch (error) {
      logMessage(
        `Error connecting to registered device: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return false;
    }
  };

  // Enhanced verification with additional checks
  const enhancedVerifyConnection = async (
    deviceId: string
  ): Promise<boolean> => {
    try {
      // First try standard verification
      const basicVerified = await verifyConnection(deviceId);
      if (basicVerified) return true;

      // Additional verification logic can be added here
      // For example, trying to read a characteristic
      logMessage("Running enhanced verification steps...");

      return false; // Default to false until implemented
    } catch (error) {
      return false;
    }
  };

  // Create context value matching the enhanced interface
  const contextValue: BluetoothContextType = {
    // Connection state
    connectionState: {
      isConnected,
      isScanning,
      deviceId,
      deviceName,
    },

    // Device management
    discoveredDevices,
    registeredDevices,
    rememberedDevice,
    plxDevice: bleConnectionHook.plxDevice,

    // Sync management
    syncStatus: eventSync.allSyncStatus,
    devicesNeedingSync: eventSync.devicesNeedingSync,
    isSyncing: eventSync.isSyncing,

    // UI state
    showDeviceSelector,
    reconnectAttempt,

    // Core actions
    startScan,
    connectToDevice,
    disconnectDevice,

    // Device management actions
    loadRegisteredDevices,
    connectToRegisteredDevice,

    // Event sync actions
    syncDeviceEvents: eventSync.syncDeviceEvents,
    markAllDevicesForResync: eventSync.markAllDevicesForResync,
    forceSyncAll: eventSync.forceSyncAll,
    refreshSyncStatus: eventSync.refreshSyncStatus,

    // State setters
    setDiscoveredDevices,
    setShowDeviceSelector,
    setSyncingFlag: setIsSyncing,

    // Utility
    logMessage,
  };

  return (
    <BluetoothContext.Provider value={contextValue}>
      {children}
    </BluetoothContext.Provider>
  );
};

export const useBluetooth = () => {
  const context = useContext(BluetoothContext);

  if (context === undefined) {
    throw new Error("useBluetooth must be used within a BluetoothProvider");
  }

  return context;
};
