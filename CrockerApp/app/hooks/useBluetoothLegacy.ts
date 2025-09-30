// Migration helper for components using the old Bluetooth context interface
// This provides backward compatibility while you update components gradually

import { useBluetooth } from "../contexts/BluetoothContext";

/**
 * Legacy compatibility hook - use this temporarily while migrating components
 * @deprecated Use useBluetooth() directly with new interface
 */
export const useBluetoothLegacy = () => {
  const context = useBluetooth();

  return {
    // New structured approach (recommended)
    connectionState: context.connectionState,
    obdData: context.obdData,

    // Legacy compatibility (flatten for old components)
    isConnected: context.connectionState.isConnected,
    isScanning: context.connectionState.isScanning,
    deviceId: context.connectionState.deviceId,
    deviceName: context.connectionState.deviceName,
    voltage: context.obdData.voltage,
    rpm: context.obdData.rpm,
    speed: context.obdData.speed,

    // Pass through other properties
    discoveredDevices: context.discoveredDevices,
    rememberedDevice: context.rememberedDevice,
    plxDevice: context.plxDevice,
    showDeviceSelector: context.showDeviceSelector,
    reconnectAttempt: context.reconnectAttempt,

    // Pass through actions
    startScan: context.startScan,
    connectToDevice: context.connectToDevice,
    disconnectDevice: context.disconnectDevice,
    sendCommand: context.sendCommand,
    setDiscoveredDevices: context.setDiscoveredDevices,
    setShowDeviceSelector: context.setShowDeviceSelector,
    logMessage: context.logMessage,
  };
};

/**
 * Example of how to migrate a component:
 *
 * // Old way:
 * const { isConnected, voltage } = useBluetooth();
 *
 * // New way (recommended):
 * const { connectionState, obdData } = useBluetooth();
 * const isConnected = connectionState.isConnected;
 * const voltage = obdData.voltage;
 *
 * // Temporary compatibility:
 * const { isConnected, voltage } = useBluetoothLegacy();
 */

export default useBluetoothLegacy;
