import React, { useState, useEffect, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { BluetoothDevice, RegisteredDevice } from "../models";
import { useBluetooth } from "../contexts/BluetoothContext";
import deviceManagementService from "../services/deviceManagementService";
import { colors } from "../theme/colors";

// Create semantic colors from the design system
const semanticColors = {
  primary: colors.primary[500],
  success: colors.green[500],
  error: colors.red[500],
  text: colors.gray[900],
  textSecondary: colors.gray[500],
  background: colors.white,
  backgroundSecondary: colors.gray[50],
  surface: colors.white,
  border: colors.gray[200],
};

interface DeviceScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onDeviceRegistered: (device: RegisteredDevice) => void;
  assignedKidId?: string;
}

interface DeviceWithRegistrationStatus extends BluetoothDevice {
  isRegistered: boolean;
  registeredNickname?: string;
}

const DeviceScannerModal: React.FC<DeviceScannerModalProps> = ({
  visible,
  onClose,
  onDeviceRegistered,
  assignedKidId,
}) => {
  const { connectionState, discoveredDevices, startScan, connectToDevice } = useBluetooth();
  const [isScanning, setIsScanning] = useState(false);
  const [devicesWithStatus, setDevicesWithStatus] = useState<
    DeviceWithRegistrationStatus[]
  >([]);
  const [showNamingModal, setShowNamingModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<BluetoothDevice | null>(
    null
  );
  const [deviceNickname, setDeviceNickname] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  // Update devices with registration status when discoveredDevices changes
  useEffect(() => {
    const updateDevicesWithStatus = async () => {
      const registeredDevicesResponse =
        await deviceManagementService.getRegisteredDevices();
      const registeredDevices = registeredDevicesResponse.data || [];

      const devicesWithStatus = discoveredDevices.map((device) => {
        const registered = registeredDevices.find((r) => r.id === device.id);
        return {
          ...device,
          isRegistered: !!registered,
          registeredNickname: registered?.nickname,
        };
      });

      setDevicesWithStatus(devicesWithStatus);
    };

    if (discoveredDevices.length > 0) {
      updateDevicesWithStatus();
    }
  }, [discoveredDevices]);

  const handleStartScan = async () => {
    setIsScanning(true);
    try {
      await startScan();
    } catch (error) {
      console.error("Scan failed:", error);
      Alert.alert(
        "Scan Failed",
        "Unable to scan for devices. Please check Bluetooth permissions."
      );
    }
    setTimeout(() => setIsScanning(false), 3000);
  };

  const handleDevicePress = (device: DeviceWithRegistrationStatus) => {
    console.log("🔷 DeviceScannerModal: Device pressed -", device.name, device.id);
    console.log("🔷 DeviceScannerModal: Device isRegistered?", device.isRegistered);
    
    if (device.isRegistered) {
      console.log("🔷 DeviceScannerModal: Device already registered, showing alert");
      Alert.alert(
        "Device Already Registered",
        `This device is already registered as "${device.registeredNickname}".`,
        [{ text: "OK" }]
      );
      return;
    }

    console.log("🔷 DeviceScannerModal: Setting selected device and showing naming modal");
    setSelectedDevice(device);
    setDeviceNickname(device.name || "My Soristuffy");
    setShowNamingModal(true);
  };

  const handleRegisterDevice = async () => {
    if (!selectedDevice || !deviceNickname.trim()) {
      Alert.alert("Invalid Input", "Please enter a name for your device.");
      return;
    }

    setIsRegistering(true);
    try {
      const result = await deviceManagementService.registerDevice(
        selectedDevice,
        deviceNickname.trim(),
        assignedKidId
      );

      if (result.success && result.data) {
        console.log("Device registered successfully:", result.data);
        onDeviceRegistered(result.data);
        
        // Attempt to connect to the device immediately after registration
        const connectionSuccess = await connectToDevice(selectedDevice);
        
        setShowNamingModal(false);
        onClose();

      } else {
        throw new Error(result.error || "Registration failed");
      }
    } catch (error) {
      console.error("Device registration error:", error);
      Alert.alert(
        "Registration Failed",
        "Unable to register device. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsRegistering(false);
    }
  };

  const handleCancelNaming = () => {
    setShowNamingModal(false);
    setSelectedDevice(null);
    setDeviceNickname("");
  };

  const renderDeviceItem = useCallback(
    ({
      item,
    }: {
      item: DeviceWithRegistrationStatus;
    }) => (
      <TouchableOpacity
        style={[
          styles.deviceItem,
          item.isRegistered && styles.deviceItemRegistered,
        ]}
        onPress={() => handleDevicePress(item)}
        disabled={item.isRegistered}
      >
        <View style={styles.deviceInfo}>
          <View style={styles.deviceHeader}>
            <Text
              style={[
                styles.deviceName,
                item.isRegistered && styles.deviceNameRegistered,
              ]}
            >
              {item.isRegistered
                ? item.registeredNickname
                : item.name || "Unnamed Device"}
            </Text>
            {item.isRegistered && (
              <View style={styles.registeredBadge}>
                <Text style={styles.registeredText}>Registered</Text>
              </View>
            )}
          </View>
          <Text style={styles.deviceId}>ID: {item.id}</Text>
          <View style={styles.deviceMeta}>
            <Text style={styles.rssiText}>Signal: {item.rssi} dBm</Text>
          </View>
        </View>
        <Feather
          name={item.isRegistered ? "check-circle" : "plus-circle"}
          size={24}
          color={
            item.isRegistered ? semanticColors.success : semanticColors.primary
          }
        />
      </TouchableOpacity>
    ),
    []
  );

  return (
    <>
      {/* Main Scanner Modal */}
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={24} color={semanticColors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Find Devices</Text>
            <TouchableOpacity
              onPress={handleStartScan}
              disabled={isScanning}
              style={styles.scanButton}
            >
              {isScanning ? (
                <ActivityIndicator
                  color={semanticColors.primary}
                  size="small"
                />
              ) : (
                <Feather
                  name="refresh-cw"
                  size={24}
                  color={semanticColors.primary}
                />
              )}
            </TouchableOpacity>
          </View>

          {/* Scanning Status */}
          {isScanning && (
            <View style={styles.scanningStatus}>
              <ActivityIndicator color={semanticColors.primary} />
              <Text style={styles.scanningText}>Scanning for devices...</Text>
            </View>
          )}

          {/* Devices List */}
          <FlatList
            data={devicesWithStatus}
            keyExtractor={(item) => item.id}
            renderItem={renderDeviceItem}
            contentContainerStyle={styles.devicesList}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Feather
                  name="bluetooth"
                  size={48}
                  color={semanticColors.textSecondary}
                />
                <Text style={styles.emptyTitle}>No Devices Found</Text>
                <Text style={styles.emptyText}>
                  Make sure your Soristuffy is nearby and in pairing mode, then
                  tap the scan button.
                </Text>
              </View>
            )}
          />

          {/* Instructions */}
          <View style={styles.instructions}>
            <Text style={styles.instructionsText}>
              • Make sure your device is in pairing mode
            </Text>
            <Text style={styles.instructionsText}>
              • Keep devices within 10 feet
            </Text>
            <Text style={styles.instructionsText}>
              • Tap scan to refresh the list
            </Text>
          </View>

          {/* Device Naming Modal - Inside Main Modal to avoid z-index issues */}
          {showNamingModal && (
            <View style={styles.modalOverlay}>
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardAvoidingView}
              >
                <View style={styles.namingModal}>
                  <Text style={styles.namingTitle}>Name Your Device</Text>
                  <Text style={styles.namingSubtitle}>
                    Give your Soristuffy a memorable name
                  </Text>

                  <TextInput
                    style={styles.nameInput}
                    value={deviceNickname}
                    onChangeText={setDeviceNickname}
                    placeholder="Enter device name"
                    maxLength={30}
                    autoFocus
                    selectTextOnFocus
                  />

                  <View style={styles.namingButtons}>
                    <TouchableOpacity
                      style={[styles.namingButton, styles.cancelButton]}
                      onPress={handleCancelNaming}
                      disabled={isRegistering}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.namingButton, styles.registerButton]}
                      onPress={handleRegisterDevice}
                      disabled={isRegistering || !deviceNickname.trim()}
                    >
                      {isRegistering ? (
                        <ActivityIndicator color="white" size="small" />
                      ) : (
                        <Text style={styles.registerButtonText}>Register</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </View>
          )}
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: semanticColors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: semanticColors.border,
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: semanticColors.text,
  },
  scanButton: {
    padding: 4,
  },
  scanningStatus: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    backgroundColor: semanticColors.backgroundSecondary,
  },
  scanningText: {
    marginLeft: 12,
    fontSize: 16,
    color: semanticColors.text,
  },
  devicesList: {
    padding: 20,
  },
  deviceItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: semanticColors.surface,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: semanticColors.border,
  },
  deviceItemRegistered: {
    backgroundColor: semanticColors.backgroundSecondary,
    opacity: 0.7,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: "600",
    color: semanticColors.text,
    flex: 1,
  },
  deviceNameRegistered: {
    color: semanticColors.textSecondary,
  },
  registeredBadge: {
    backgroundColor: semanticColors.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  registeredText: {
    fontSize: 12,
    color: "white",
    fontWeight: "500",
  },
  deviceId: {
    fontSize: 12,
    color: semanticColors.textSecondary,
    marginBottom: 4,
  },
  deviceMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  rssiText: {
    fontSize: 12,
    color: semanticColors.textSecondary,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: semanticColors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 18,
    color: semanticColors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 40,
  },
  instructions: {
    padding: 20,
    backgroundColor: semanticColors.backgroundSecondary,
  },
  instructionsText: {
    fontSize: 16,
    color: semanticColors.textSecondary,
    marginBottom: 4,
  },

  // Naming Modal Styles
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  keyboardAvoidingView: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  namingModal: {
    backgroundColor: semanticColors.surface,
    margin: 20,
    borderRadius: 16,
    padding: 24,
    minWidth: 300,
  },
  namingTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: semanticColors.text,
    textAlign: "center",
    marginBottom: 8,
  },
  namingSubtitle: {
    fontSize: 14,
    color: semanticColors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: semanticColors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 24,
    backgroundColor: semanticColors.background,
  },
  namingButtons: {
    flexDirection: "row",
    gap: 12,
  },
  namingButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: semanticColors.backgroundSecondary,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: semanticColors.text,
  },
  registerButton: {
    backgroundColor: semanticColors.primary,
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "white",
  },
});

export default DeviceScannerModal;
