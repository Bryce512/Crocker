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
  const logMessage = bleConnectionHook.logMessage;

  // Reference to hook's log to track changes

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

  // Verify connection periodically
  useEffect(() => {
    if (isConnected && deviceId) {
      const interval = setInterval(async () => {
        const stillConnected = await verifyConnection(deviceId);
        if (!stillConnected && rememberedDevice) {
          logMessage("Connection lost, attempting reconnection from context");
          connectToRememberedDevice();
        }
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [isConnected, deviceId, rememberedDevice]);

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
