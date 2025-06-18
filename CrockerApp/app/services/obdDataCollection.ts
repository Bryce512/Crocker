import { Device } from "react-native-ble-plx";

// Create pure functions that don't depend on the context
export const obdDataFunctions = {
  /**
   * Fetch battery voltage from OBD-II device
   * @returns Promise with voltage as string if successful
   */
  fetchVoltage: async (
    plxDevice: Device | null,
    sendCommand: (device: Device, command: string, retries?: number) => Promise<string>,
    logMessage: (message: string) => void
  ): Promise<string | null> => {
    if (!plxDevice) {
      logMessage("❌ No device connected, cannot fetch voltage");
      return null;
    }

    try {
      logMessage("🔋 Fetching battery voltage...");

      // Send voltage command with retries
      const response = await sendCommand(plxDevice, "AT RV", 2);

      // Parse voltage from response
      if (response) {
        const voltageMatch = response.match(/(\d+\.?\d*)V?/);
        if (voltageMatch) {
          const voltage = voltageMatch[1];
          logMessage(`🔋 Detected voltage: ${voltage}V`);
          return voltage; // Just return the value
        } else {
          logMessage(`📬 Raw response: ${response} (could not parse voltage)`);
          return null;
        }
      }

      logMessage("❌ No response received for voltage command");
      return null;
    } catch (error) {
      logMessage(`❌ Error fetching voltage: ${String(error)}`);
      return null;
    }
  },

  /**
   * Fetch engine RPM
   * OBD-II PID: 0C
   */
  fetchRPM: async (
    plxDevice: Device | null,
    sendCommand: (device: Device, command: string, retries?: number) => Promise<string>,
    logMessage: (message: string) => void
  ): Promise<number | null> => {
    if (!plxDevice) {
      logMessage("❌ No device connected, cannot fetch RPM");
      return null;
    }

    try {
      logMessage("🔄 Fetching engine RPM...");

      // Send RPM command (PID: 0C)
      const response = await sendCommand(plxDevice, "010C", 2);

      // Parse RPM from response
      if (response) {
        const rpmRegex = /41 0C ([0-9A-F]{2}) ([0-9A-F]{2})/i;
        const match = response.match(rpmRegex);

        if (match) {
          const a = parseInt(match[1], 16);
          const b = parseInt(match[2], 16);
          const rpm = (a * 256 + b) / 4;

          logMessage(`🔄 Engine RPM: ${rpm}`);
          return rpm;
        } else {
          logMessage(`❌ Could not parse RPM from response: ${response}`);
          return null;
        }
      }

      return null;
    } catch (error) {
      logMessage(`❌ Error fetching RPM: ${String(error)}`);
      return null;
    }
  }
};
