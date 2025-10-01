// Device Management Service - Handle registered devices and pairing flow
import AsyncStorage from "@react-native-async-storage/async-storage";
import firebaseService from "./firebaseService";
import {
  RegisteredDevice,
  DeviceProfile,
  PairingSession,
  BluetoothDevice,
  ServiceResponse,
} from "../models";

// Constants
const REGISTERED_DEVICES_KEY = "@soriApp:registeredDevices";
const DEVICE_PROFILES_KEY = "@soriApp:deviceProfiles";
const PAIRING_SESSION_KEY = "@soriApp:pairingSession";

class DeviceManagementService {
  private static instance: DeviceManagementService;

  static getInstance(): DeviceManagementService {
    if (!DeviceManagementService.instance) {
      DeviceManagementService.instance = new DeviceManagementService();
    }
    return DeviceManagementService.instance;
  }

  // ==================== REGISTERED DEVICES ====================

  async getRegisteredDevices(): Promise<ServiceResponse<RegisteredDevice[]>> {
    try {
      console.log("🔷 DeviceManagementService: Getting registered devices");

      // Try to get from Firebase first
      const user = firebaseService.getCurrentUser();
      if (user) {
        console.log("🔷 User authenticated, fetching from Firebase");
        try {
          const firebaseDevices = await this.getRegisteredDevicesFromFirebase(
            user.uid
          );
          console.log(`🔷 Found ${firebaseDevices.length} devices in Firebase`);

          if (firebaseDevices.length > 0) {
            // Cache locally for offline access
            await this.saveRegisteredDevicesLocal(firebaseDevices);
            return { success: true, data: firebaseDevices };
          }
        } catch (firebaseError) {
          console.warn(
            "🔶 Firebase fetch failed, using local cache:",
            firebaseError
          );
        }
      } else {
        console.log("🔶 No authenticated user, using local cache");
      }

      // Fallback to local storage
      const localDevices = await this.getRegisteredDevicesLocal();
      console.log(`🔷 Found ${localDevices.length} devices in local cache`);
      return { success: true, data: localDevices };
    } catch (error) {
      console.error("🔴 Error getting registered devices:", error);
      return {
        success: false,
        error: `Failed to get registered devices: ${error}`,
        data: [],
      };
    }
  }

  async registerDevice(
    bluetoothDevice: BluetoothDevice,
    nickname: string,
    assignedKidId?: string
  ): Promise<ServiceResponse<RegisteredDevice>> {
    try {
      const now = new Date();
      const registeredDevice: RegisteredDevice = {
        id: bluetoothDevice.id,
        name: bluetoothDevice.name,
        nickname: nickname.trim() || bluetoothDevice.name || "Unnamed Device",
        deviceType: this.detectDeviceType(bluetoothDevice.name),
        registeredAt: now,
        lastConnected: null,
        connectionCount: 0,
        isActive: true,
        rssi: bluetoothDevice.rssi,
        assignedKidId: assignedKidId || null,
      };

      // Save locally first
      await this.addRegisteredDeviceLocal(registeredDevice);

      // Create default profile
      const defaultProfile = this.createDefaultDeviceProfile(
        registeredDevice.id
      );
      await this.saveDeviceProfile(defaultProfile);

      // Sync to Firebase if user is authenticated
      const user = firebaseService.getCurrentUser();
      if (user) {
        try {
          await this.saveRegisteredDeviceToFirebase(user.uid, registeredDevice);
          await this.saveDeviceProfileToFirebase(user.uid, defaultProfile);
        } catch (firebaseError) {
          console.warn(
            "Firebase sync failed, device saved locally:",
            firebaseError
          );
        }
      }

      console.log(
        `✅ Device registered: ${registeredDevice.nickname} (${registeredDevice.id})`
      );
      return { success: true, data: registeredDevice };
    } catch (error) {
      console.error("Error registering device:", error);
      return {
        success: false,
        error: `Failed to register device: ${error}`,
      };
    }
  }

  async updateRegisteredDevice(
    deviceId: string,
    updates: Partial<RegisteredDevice>
  ): Promise<ServiceResponse<RegisteredDevice>> {
    try {
      const devices = await this.getRegisteredDevicesLocal();
      const deviceIndex = devices.findIndex((d) => d.id === deviceId);

      if (deviceIndex === -1) {
        return {
          success: false,
          error: "Device not found",
        };
      }

      const updatedDevice = { ...devices[deviceIndex], ...updates };
      devices[deviceIndex] = updatedDevice;

      await this.saveRegisteredDevicesLocal(devices);

      // Sync to Firebase
      const user = firebaseService.getCurrentUser();
      if (user) {
        try {
          await this.saveRegisteredDeviceToFirebase(user.uid, updatedDevice);
        } catch (firebaseError) {
          console.warn(
            "Firebase sync failed for device update:",
            firebaseError
          );
        }
      }

      return { success: true, data: updatedDevice };
    } catch (error) {
      console.error("Error updating device:", error);
      return {
        success: false,
        error: `Failed to update device: ${error}`,
      };
    }
  }

  async unregisterDevice(deviceId: string): Promise<ServiceResponse<boolean>> {
    try {
      const devices = await this.getRegisteredDevicesLocal();
      const filteredDevices = devices.filter((d) => d.id !== deviceId);

      await this.saveRegisteredDevicesLocal(filteredDevices);

      // Remove from Firebase
      const user = firebaseService.getCurrentUser();
      if (user) {
        try {
          await this.removeRegisteredDeviceFromFirebase(user.uid, deviceId);
          await this.removeDeviceProfileFromFirebase(user.uid, deviceId);
        } catch (firebaseError) {
          console.warn("Firebase removal failed:", firebaseError);
        }
      }

      // Clean up local profile
      await this.removeDeviceProfileLocal(deviceId);

      console.log(`🗑️ Device unregistered: ${deviceId}`);
      return { success: true, data: true };
    } catch (error) {
      console.error("Error unregistering device:", error);
      return {
        success: false,
        error: `Failed to unregister device: ${error}`,
      };
    }
  }

  // ==================== DEVICE PROFILES ====================

  async getDeviceProfile(
    deviceId: string
  ): Promise<ServiceResponse<DeviceProfile | null>> {
    try {
      const profiles = await this.getDeviceProfilesLocal();
      const profile = profiles.find((p) => p.deviceId === deviceId);

      return { success: true, data: profile || null };
    } catch (error) {
      console.error("Error getting device profile:", error);
      return {
        success: false,
        error: `Failed to get device profile: ${error}`,
        data: null,
      };
    }
  }

  async saveDeviceProfile(
    profile: DeviceProfile
  ): Promise<ServiceResponse<DeviceProfile>> {
    try {
      const profiles = await this.getDeviceProfilesLocal();
      const existingIndex = profiles.findIndex(
        (p) => p.deviceId === profile.deviceId
      );

      if (existingIndex >= 0) {
        profiles[existingIndex] = profile;
      } else {
        profiles.push(profile);
      }

      await this.saveDeviceProfilesLocal(profiles);

      // Sync to Firebase
      const user = firebaseService.getCurrentUser();
      if (user) {
        try {
          await this.saveDeviceProfileToFirebase(user.uid, profile);
        } catch (firebaseError) {
          console.warn("Firebase profile sync failed:", firebaseError);
        }
      }

      return { success: true, data: profile };
    } catch (error) {
      console.error("Error saving device profile:", error);
      return {
        success: false,
        error: `Failed to save device profile: ${error}`,
      };
    }
  }

  // ==================== PAIRING SESSION MANAGEMENT ====================

  async startPairingSession(
    deviceId: string,
    deviceName: string | null
  ): Promise<PairingSession> {
    const session: PairingSession = {
      sessionId: `pairing_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      deviceId,
      deviceName,
      startedAt: new Date(),
      status: "scanning",
      attempts: 0,
    };

    await AsyncStorage.setItem(PAIRING_SESSION_KEY, JSON.stringify(session));
    return session;
  }

  async updatePairingSession(
    sessionId: string,
    updates: Partial<PairingSession>
  ): Promise<PairingSession | null> {
    try {
      const sessionJson = await AsyncStorage.getItem(PAIRING_SESSION_KEY);
      if (!sessionJson) return null;

      const session = JSON.parse(sessionJson) as PairingSession;
      if (session.sessionId !== sessionId) return null;

      const updatedSession = { ...session, ...updates };
      await AsyncStorage.setItem(
        PAIRING_SESSION_KEY,
        JSON.stringify(updatedSession)
      );

      return updatedSession;
    } catch (error) {
      console.error("Error updating pairing session:", error);
      return null;
    }
  }

  async completePairingSession(
    sessionId: string,
    success: boolean,
    error?: string
  ): Promise<void> {
    try {
      const session = await this.updatePairingSession(sessionId, {
        status: success ? "success" : "failed",
        completedAt: new Date(),
        error: error,
      });

      if (session) {
        console.log(
          `Pairing session completed: ${success ? "SUCCESS" : "FAILED"}`
        );

        // Clean up session after completion
        setTimeout(() => {
          AsyncStorage.removeItem(PAIRING_SESSION_KEY);
        }, 5000); // Keep for 5 seconds for any UI updates
      }
    } catch (error) {
      console.error("Error completing pairing session:", error);
    }
  }

  async getCurrentPairingSession(): Promise<PairingSession | null> {
    try {
      const sessionJson = await AsyncStorage.getItem(PAIRING_SESSION_KEY);
      return sessionJson ? JSON.parse(sessionJson) : null;
    } catch (error) {
      console.error("Error getting current pairing session:", error);
      return null;
    }
  }

  // ==================== PRIVATE METHODS ====================

  private async getRegisteredDevicesLocal(): Promise<RegisteredDevice[]> {
    try {
      const devicesJson = await AsyncStorage.getItem(REGISTERED_DEVICES_KEY);
      if (!devicesJson) return [];

      const devices = JSON.parse(devicesJson) as RegisteredDevice[];

      // Restore Date objects
      return devices.map((device) => ({
        ...device,
        registeredAt: new Date(device.registeredAt),
        lastConnected: device.lastConnected
          ? new Date(device.lastConnected)
          : null,
      }));
    } catch (error) {
      console.error("Error getting local registered devices:", error);
      return [];
    }
  }

  private async saveRegisteredDevicesLocal(
    devices: RegisteredDevice[]
  ): Promise<void> {
    try {
      await AsyncStorage.setItem(
        REGISTERED_DEVICES_KEY,
        JSON.stringify(devices)
      );
    } catch (error) {
      console.error("Error saving registered devices locally:", error);
      throw error;
    }
  }

  private async addRegisteredDeviceLocal(
    device: RegisteredDevice
  ): Promise<void> {
    const devices = await this.getRegisteredDevicesLocal();

    // Remove existing device with same ID if it exists
    const filteredDevices = devices.filter((d) => d.id !== device.id);
    filteredDevices.push(device);

    await this.saveRegisteredDevicesLocal(filteredDevices);
  }

  private async getDeviceProfilesLocal(): Promise<DeviceProfile[]> {
    try {
      const profilesJson = await AsyncStorage.getItem(DEVICE_PROFILES_KEY);
      if (!profilesJson) return [];

      const profiles = JSON.parse(profilesJson) as DeviceProfile[];

      // Restore Date objects
      return profiles.map((profile) => ({
        ...profile,
        lastSyncAt: profile.lastSyncAt ? new Date(profile.lastSyncAt) : null,
      }));
    } catch (error) {
      console.error("Error getting local device profiles:", error);
      return [];
    }
  }

  private async saveDeviceProfilesLocal(
    profiles: DeviceProfile[]
  ): Promise<void> {
    try {
      await AsyncStorage.setItem(DEVICE_PROFILES_KEY, JSON.stringify(profiles));
    } catch (error) {
      console.error("Error saving device profiles locally:", error);
      throw error;
    }
  }

  private async removeDeviceProfileLocal(deviceId: string): Promise<void> {
    const profiles = await this.getDeviceProfilesLocal();
    const filteredProfiles = profiles.filter((p) => p.deviceId !== deviceId);
    await this.saveDeviceProfilesLocal(filteredProfiles);
  }

  // Firebase methods using the firebaseService
  private async getRegisteredDevicesFromFirebase(
    userId: string
  ): Promise<RegisteredDevice[]> {
    try {
      return await firebaseService.getDevices();
    } catch (error) {
      console.error("Error getting devices from Firebase:", error);
      return [];
    }
  }

  private async saveRegisteredDeviceToFirebase(
    userId: string,
    device: RegisteredDevice
  ): Promise<void> {
    await firebaseService.addDevice(device);
  }

  private async removeRegisteredDeviceFromFirebase(
    userId: string,
    deviceId: string
  ): Promise<void> {
    await firebaseService.deleteDevice(deviceId);
  }

  private async saveDeviceProfileToFirebase(
    userId: string,
    profile: DeviceProfile
  ): Promise<void> {
    // For now, we'll use the direct Firebase approach since device profiles aren't in firebaseService yet
    const database = require("firebase/database");
    const { getDatabase, ref, set } = database;

    const { getApp } = require("firebase/app");
    const db = getDatabase(getApp());
    const profileRef = ref(
      db,
      `users/${userId}/deviceProfiles/${profile.deviceId}`
    );
    await set(profileRef, profile);
  }

  private async removeDeviceProfileFromFirebase(
    userId: string,
    deviceId: string
  ): Promise<void> {
    const database = require("firebase/database");
    const { getDatabase, ref, remove } = database;

    const { getApp } = require("firebase/app");
    const db = getDatabase(getApp());
    const profileRef = ref(db, `users/${userId}/deviceProfiles/${deviceId}`);
    await remove(profileRef);
  }

  private detectDeviceType(
    deviceName: string | null
  ): "soristuffy" | "esp32" | "other" {
    if (!deviceName) return "other";

    const name = deviceName.toLowerCase();
    if (name.includes("sori") || name.includes("stuffy")) return "soristuffy";
    if (name.includes("esp32") || name.includes("esp")) return "esp32";

    return "other";
  }

  private createDefaultDeviceProfile(deviceId: string): DeviceProfile {
    return {
      deviceId,
      alertSettings: {
        vibrationIntensity: "medium",
        alertIntervals: [15, 10, 5], // Default: 15, 10, 5 minutes before event
        quietHours: {
          enabled: false,
          start: "22:00",
          end: "08:00",
        },
      },
      syncSettings: {
        autoSync: true,
        syncFrequency: 24, // Every 24 hours
        maxRetries: 3,
      },
      lastSyncAt: null,
      preferences: {
        autoConnect: true,
        connectionTimeout: 30, // 30 seconds
        reconnectAttempts: 3,
      },
    };
  }

  // ==================== UTILITY METHODS ====================

  async markDeviceConnected(deviceId: string): Promise<void> {
    try {
      const devices = await this.getRegisteredDevicesLocal();
      const device = devices.find((d) => d.id === deviceId);
      const currentCount = device?.connectionCount || 0;

      await this.updateRegisteredDevice(deviceId, {
        lastConnected: new Date(),
        connectionCount: currentCount + 1,
      });
    } catch (error) {
      console.error("Error marking device as connected:", error);
    }
  }

  async updateDeviceRSSI(deviceId: string, rssi: number): Promise<void> {
    try {
      await this.updateRegisteredDevice(deviceId, { rssi });
    } catch (error) {
      console.error("Error updating device RSSI:", error);
    }
  }

  async getPreferredDevice(): Promise<RegisteredDevice | null> {
    try {
      const devices = await this.getRegisteredDevicesLocal();
      const activeDevices = devices.filter((d) => d.isActive);

      if (activeDevices.length === 0) return null;

      // Return device with most recent connection
      return activeDevices.reduce((latest, current) => {
        if (!latest.lastConnected) return current;
        if (!current.lastConnected) return latest;

        return current.lastConnected > latest.lastConnected ? current : latest;
      });
    } catch (error) {
      console.error("Error getting preferred device:", error);
      return null;
    }
  }
}

// Export singleton instance
export const deviceManagementService = DeviceManagementService.getInstance();
export default deviceManagementService;
