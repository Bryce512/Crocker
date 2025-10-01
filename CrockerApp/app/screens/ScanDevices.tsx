import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import LinearGradient from "react-native-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { RootStackParamList } from "../navigation/AppNavigator";
import { RegisteredDevice } from "../models";
import { useBluetooth } from "../contexts/BluetoothContext";
import deviceManagementService from "../services/deviceManagementService";
import DeviceScannerModal from "../components/DeviceScannerModal";
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

const DeviceConnection = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const {
    connectionState,
    registeredDevices,
    connectToRegisteredDevice,
    disconnectDevice,
    loadRegisteredDevices,
  } = useBluetooth();

  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [showScannerModal, setShowScannerModal] = useState(false);

  // Load registered devices on mount and manage loading state
  useEffect(() => {
    const initializeDevices = async () => {
      setIsLoading(true);
      try {
        await loadRegisteredDevices();
      } catch (error) {
        console.error("Error loading registered devices:", error);
        Alert.alert("Error", "Failed to load registered devices");
      } finally {
        setIsLoading(false);
      }
    };

    initializeDevices();
  }, []);

  const handleDeviceConnect = async (device: RegisteredDevice) => {
    if (connectionState.isConnected && connectionState.deviceId === device.id) {
      // Device is connected, disconnect it
      try {
        await disconnectDevice();
        await deviceManagementService.updateRegisteredDevice(device.id, {
          lastConnected: new Date(),
        });
      } catch (error) {
        console.error("Disconnect error:", error);
        Alert.alert("Error", "Failed to disconnect device");
      }
    } else {
      // Device is not connected, connect to it
      setIsConnecting(device.id);
      try {
        const success = await connectToRegisteredDevice(device);
        if (success) {
          Alert.alert(
            "Connected!",
            `Successfully connected to ${device.nickname}`
          );
        } else {
          Alert.alert("Connection Failed", "Unable to connect to device");
        }
      } catch (error) {
        console.error("Connection error:", error);
        Alert.alert("Error", "Failed to connect to device");
      } finally {
        setIsConnecting(null);
      }
    }
  };

  const handleAddDevice = () => {
    setShowScannerModal(true);
  };

  const handleDeviceRegistered = async (device: RegisteredDevice) => {
    // Refresh the registered devices list from the context
    await loadRegisteredDevices();
  };

  const handleSkip = () => {
    navigation.navigate("CalendarScreen");
  };

  const isDeviceConnected = (deviceId: string) => {
    return connectionState.isConnected && connectionState.deviceId === deviceId;
  };

  return (
    <>
      <LinearGradient colors={["#f8fafc", "#eff6ff"]} style={styles.container}>
        <StatusBar backgroundColor="#f8fafc" barStyle="dark-content" />

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Connect to your</Text>
            <Text style={styles.titleBrand}>Soristuffy</Text>
          </View>

          {/* My Devices Section */}
          <View style={styles.devicesSection}>
            <View style={styles.devicesSectionHeader}>
              <Text style={styles.devicesTitle}>My Devices</Text>
              <TouchableOpacity onPress={handleAddDevice}>
                <Feather name="plus" size={24} color={semanticColors.primary} />
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator
                  color={semanticColors.primary}
                  size="small"
                />
                <Text style={styles.loadingText}>Loading devices...</Text>
              </View>
            ) : (
              <View style={styles.devicesList}>
                {registeredDevices.length === 0 ? (
                  <View style={styles.emptyDevicesContainer}>
                    <Feather
                      name="bluetooth"
                      size={48}
                      color={semanticColors.textSecondary}
                    />
                    <Text style={styles.emptyDevicesTitle}>
                      No Devices Found
                    </Text>
                    <Text style={styles.emptyDevicesText}>
                      Add your first Soristuffy by tapping the + button above
                    </Text>
                  </View>
                ) : (
                  registeredDevices.map((device) => (
                    <TouchableOpacity
                      key={device.id}
                      style={[
                        styles.deviceCard,
                        isDeviceConnected(device.id) &&
                          styles.deviceCardConnected,
                      ]}
                      onPress={() => handleDeviceConnect(device)}
                      disabled={isConnecting === device.id}
                    >
                      <View style={styles.deviceInfo}>
                        <View style={styles.deviceHeader}>
                          <Text
                            style={[
                              styles.deviceName,
                              isDeviceConnected(device.id) &&
                                styles.deviceNameConnected,
                            ]}
                          >
                            {device.nickname}
                          </Text>
                          {isDeviceConnected(device.id) && (
                            <View style={styles.connectedIndicator}>
                              <Text style={styles.connectedText}>
                                Connected
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.deviceType}>
                          {device.deviceType.toUpperCase()}
                        </Text>
                        {device.lastConnected && (
                          <Text style={styles.lastConnected}>
                            Last connected:{" "}
                            {device.lastConnected.toLocaleDateString()}
                          </Text>
                        )}
                      </View>

                      {isConnecting === device.id ? (
                        <ActivityIndicator
                          color={semanticColors.primary}
                          size="small"
                        />
                      ) : (
                        <Feather
                          name={
                            isDeviceConnected(device.id)
                              ? "check-circle"
                              : "bluetooth"
                          }
                          size={24}
                          color={
                            isDeviceConnected(device.id)
                              ? semanticColors.success
                              : semanticColors.primary
                          }
                        />
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </View>

          {/* Connection Status */}
          {connectionState.isConnected && (
            <View style={styles.connectionStatus}>
              <Feather
                name="check-circle"
                size={20}
                color={semanticColors.success}
              />
              <Text style={styles.connectionStatusText}>
                Connected to {connectionState.deviceName || "device"}
              </Text>
            </View>
          )}

          {/* Empty Space for Visual Balance */}
          <View style={styles.spacer} />
        </ScrollView>

        {/* Skip Button */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Device Scanner Modal */}
      <DeviceScannerModal
        visible={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        onDeviceRegistered={handleDeviceRegistered}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  time: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1e293b",
  },
  notch: {
    backgroundColor: "#1e293b",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  notchInner: {
    width: 32,
    height: 4,
    backgroundColor: "#1e293b",
    borderRadius: 2,
  },
  indicators: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  signalDots: {
    flexDirection: "row",
    gap: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  dotActive: {
    backgroundColor: "#1e293b",
  },
  dotInactive: {
    backgroundColor: "#94a3b8",
  },
  battery: {
    width: 24,
    height: 12,
    backgroundColor: "#1e293b",
    borderRadius: 2,
    marginLeft: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
  },
  header: {
    alignItems: "center",
    marginTop: 60,
    marginBottom: 60,
  },
  title: {
    fontSize: 36,
    fontWeight: "400",
    color: "#2dd4bf",
    textAlign: "center",
    lineHeight: 42,
  },
  titleBrand: {
    fontSize: 36,
    fontWeight: "400",
    color: "#2dd4bf",
    textAlign: "center",
    lineHeight: 42,
  },
  devicesSection: {
    marginBottom: 40,
  },
  devicesSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  devicesTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
  },
  scanIcon: {
    fontSize: 20,
    color: "#475569",
  },
  devicesList: {
    gap: 16,
  },
  deviceCard: {
    backgroundColor: "rgba(219, 234, 254, 0.6)",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(219, 234, 254, 0.8)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deviceCardConnected: {
    backgroundColor: "rgba(167, 243, 208, 0.6)",
    borderColor: "rgba(167, 243, 208, 0.8)",
  },
  deviceName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
  },
  deviceNameConnected: {
    color: "#059669",
  },
  connectedIndicator: {
    backgroundColor: "#10b981",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  connectedText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "500",
  },
  spacer: {
    height: 100,
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 40,
    alignItems: "center",
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  skipText: {
    fontSize: 18,
    fontWeight: "500",
    color: "#374151",
    textDecorationLine: "underline",
  },

  // New styles for enhanced device management
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 12,
    fontSize: 16,
    color: "#6b7280",
  },
  emptyDevicesContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyDevicesTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDevicesText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  deviceType: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
    marginBottom: 2,
  },
  lastConnected: {
    fontSize: 12,
    color: "#9ca3af",
  },
  connectionStatus: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 32,
    borderRadius: 8,
    marginBottom: 20,
  },
  connectionStatusText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#059669",
    fontWeight: "500",
  },
});

export default DeviceConnection;
