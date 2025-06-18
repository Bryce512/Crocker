/* eslint-disable no-bitwise */
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  PermissionsAndroid,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import {
  Text,
  Card,
  Button,
  IconButton,
  Divider,
  List,
  Surface,
  useTheme,
} from "react-native-paper";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { pidCommands } from "../services/pidCommands";
import BluetoothDeviceSelector from "../components/BluetoothDeviceSelector";
import { useBluetooth } from "../contexts/BluetoothContext";
import BleManager from "react-native-ble-manager";

const ScanDevicesScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const {
    voltage,
    isScanning,
    isConnected,
    deviceId,
    deviceName,
    discoveredDevices,
    setDiscoveredDevices,
    showDeviceSelector,
    setShowDeviceSelector,
    startScan,
    sendCommand,
    connectToDevice,
    disconnectDevice,
    robustReconnect,
    showAllDevices,
    verifyConnection, // Add this to your context exports
    rememberedDevice, // Get this from context instead of local state
    connectToRememberedDevice, // Add this to your context exports
    fetchVoltage,
  } = useBluetooth();

  const { getCurrentVoltage, getEngineRPM } = pidCommands();
  const [rpm, setRpm] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Check connection status whenever the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log("ScanDevicesScreen focused");
      console.log(
        "Connection status:",
        isConnected ? "Connected" : "Disconnected"
      );
      console.log("Device name:", deviceName);

      // If we have a remembered device but aren't connected, try connecting
      if (rememberedDevice && !isConnected) {
        console.log("Attempting auto-connection to remembered device");
        connectToRememberedDevice();
      }

      return () => {
        // Optional cleanup when screen loses focus
      };
    }, [isConnected, rememberedDevice])
  );

  // Verify connection when screen is focused
  useFocusEffect(
    useCallback(() => {
      // Verify connection when screen is focused
      const checkConnection = async () => {
        console.log("ScanDevicesScreen focused, verifying connection...");

        if (isConnected && deviceId) {
          const stillConnected = await verifyConnection(deviceId);

          if (!stillConnected) {
            console.log("Connection lost during navigation, reconnecting...");
            if (rememberedDevice) {
              await connectToRememberedDevice();
            }
          } else {
            console.log("Connection verified after navigation");
          }
        }
      };

      checkConnection();

      return () => {
        // Cleanup if needed when screen loses focus
        console.log("ScanDevicesScreen unfocused");
      };
    }, [isConnected, deviceId])
  );

  // Fetch data from OBD-II device
  const fetchData = async () => {
    if (!isConnected) {
      return;
    }

    setRefreshing(true);

    try {
      // await fetchVoltage();
      // await fetchEngineRPM();
    } catch (error) {
      console.error(
        `Error fetching data: ${
          error && typeof error === "object" && "message" in error
            ? (error as { message: string }).message
            : JSON.stringify(error)
        }`
      );
    } finally {
      setRefreshing(false);
    }
  };

  // Check Bluetooth status before scanning
  const checkBluetoothAndStartScan = async () => {
    try {
      // On Android, check Bluetooth status
      if (Platform.OS === "android") {
        try {
          const isEnabled = await BleManager.checkState();
          if (isEnabled !== "on") {
            Alert.alert(
              "Bluetooth Disabled",
              "Please enable Bluetooth to scan for devices.",
              [
                {
                  text: "Cancel",
                  style: "cancel",
                },
                {
                  text: "Settings",
                  onPress: () => {
                    // Open Bluetooth settings
                    BleManager.enableBluetooth()
                      .then(() => {
                        setTimeout(() => startScan(), 1000);
                      })
                      .catch((err) => {
                        console.error(
                          `Failed to enable Bluetooth: ${err.message}`
                        );
                      });
                  },
                },
              ]
            );
            return;
          }
        } catch (error) {
          if (error && typeof error === "object" && "message" in error) {
            console.error(
              `Error checking Bluetooth state: ${(error as { message: string }).message}`
            );
          } else {
            console.error(
              `Error checking Bluetooth state: ${JSON.stringify(error)}`
            );
          }
        }
      }

      // If we get here, Bluetooth should be on
      startScan();
    } catch (error) {
      if (error && typeof error === "object" && "message" in error) {
        console.error(
          `Error checking Bluetooth: ${(error as { message: string }).message}`
        );
      } else {
        console.error(`Error checking Bluetooth: ${JSON.stringify(error)}`);
      }
    }
  };

  // Check permissions on component mount
  useEffect(() => {
    const checkPermissions = async () => {
      if (Platform.OS === "android") {
        const bluetoothScan = await PermissionsAndroid.check(
          "android.permission.BLUETOOTH_SCAN"
        );
        const bluetoothConnect = await PermissionsAndroid.check(
          "android.permission.BLUETOOTH_CONNECT"
        );
        const fineLocation = await PermissionsAndroid.check(
          "android.permission.ACCESS_FINE_LOCATION"
        );

        console.log(`BLUETOOTH_SCAN permission: ${bluetoothScan}`);
        console.log(`BLUETOOTH_CONNECT permission: ${bluetoothConnect}`);
        console.log(`LOCATION permission: ${fineLocation}`);
      }
    };

    checkPermissions();

    // Try to connect to saved device when component mounts
    if (rememberedDevice && !isConnected) {
      console.log(`Found remembered device on mount: ${rememberedDevice.name}`);
      connectToRememberedDevice();
    }
  }, []); // Empty dependency array means this runs once on mount

  // Add this useEffect to auto-fetch voltage on connection
  // useEffect(() => {
  //   if (isConnected && deviceId) {
  //     // Small delay to ensure connection is stable
  //     const timer = setTimeout(() => {
  //       console.log("Auto-fetching voltage after connection");
  //       fetchVoltage();
  //     }, 1500);

  //     return () => clearTimeout(timer);
  //   }
  // }, [isConnected, deviceId]);

  return (
    <SafeAreaView style={styles.container}>
      <Surface style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Text variant="headlineMedium">OBD-II Scanner</Text>
      </Surface>

      <Card style={styles.connectionCard}>
        <Card.Content>
          <View style={styles.connectionStatusRow}>
            <MaterialCommunityIcons
              name={isConnected ? "bluetooth-connect" : "bluetooth"}
              size={32}
              color={isConnected ? theme.colors.primary : "#888"}
            />
            <View style={styles.connectionTextContainer}>
              <Text variant="titleMedium">
                {isConnected ? "Connected" : "Not Connected"}
              </Text>
              {deviceName && (
                <Text variant="bodyMedium" style={styles.deviceName}>
                  {deviceName}
                </Text>
              )}
            </View>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.buttonGrid}>
            {!isConnected ? (
              <Button
                mode="contained"
                onPress={checkBluetoothAndStartScan}
                disabled={isScanning}
                icon={({ size, color }) => (
                  <MaterialCommunityIcons
                    name="bluetooth"
                    size={size}
                    color={color}
                  />
                )}
                style={styles.actionButton}
              >
                {isScanning ? "Scanning..." : "Scan for Devices"}
              </Button>
            ) : (
              <>
                <Button
                  mode="contained"
                  onPress={fetchData}
                  loading={refreshing}
                  icon={({ size, color }) => (
                    <MaterialCommunityIcons
                      name="refresh"
                      size={size}
                      color={color}
                    />
                  )}
                  style={styles.actionButton}
                >
                  {refreshing ? "Reading..." : "Read Data"}
                </Button>
                <Button
                  mode="outlined"
                  onPress={disconnectDevice}
                  icon={({ size, color }) => (
                    <MaterialCommunityIcons
                      name="bluetooth-off"
                      size={size}
                      color={color}
                    />
                  )}
                  style={styles.actionButton}
                >
                  Disconnect
                </Button>
              </>
            )}
          </View>
        </Card.Content>
      </Card>

      {isConnected && (
        <Card style={styles.dataCard}>
          <Card.Title title="Vehicle Data" />
          <Divider />
          <Card.Content>
            <List.Item
              title="Battery Voltage"
              description={voltage || "Not available"}
              left={(props) => <List.Icon {...props} icon="car-battery" />}
            />
            <Divider style={styles.itemDivider} />
            <List.Item
              title="Engine RPM"
              description={rpm || "Not available"}
              left={(props) => <List.Icon {...props} icon="engine" />}
            />
          </Card.Content>
        </Card>
      )}

      {isConnected && (
        <Card style={styles.dataCard}>
          <Card.Title title="Battery Voltage" />
          <Card.Content>
            <View style={styles.dataRow}>
              <MaterialCommunityIcons
                name="battery"
                size={24}
                color={theme.colors.primary}
              />
              <Text style={styles.dataValue}>
                {refreshing ? (
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.primary}
                  />
                ) : (
                  voltage + "V" || "N/A"
                )}
              </Text>
            </View>

            <Button
              mode="contained"
              onPress={fetchVoltage}
              loading={refreshing}
              style={{ marginTop: 10 }}
            >
              Refresh Voltage
            </Button>
          </Card.Content>
        </Card>
      )}

      {/* Import the device selector component */}
      <BluetoothDeviceSelector
        visible={showDeviceSelector}
        onClose={() => setShowDeviceSelector(false)}
        devices={discoveredDevices}
        onSelectDevice={connectToDevice}
        isScanning={isScanning}
        onScanAgain={startScan}
      />

      {/* Connection Status button */}
      <TouchableOpacity
        style={[styles.debugButtonContainer, { bottom: 220 }]}
        onPress={() => {
          console.log(
            "Connection Status:",
            isConnected ? "Connected" : "Disconnected"
          );
          console.log("Device ID:", deviceId);
          console.log("Device Name:", deviceName);

          // Try to connect if not already connected
          if (!isConnected && rememberedDevice) {
            console.log("Attempting reconnection...");
            connectToRememberedDevice();
          }
        }}
      >
        <View style={styles.debugButton}>
          <MaterialCommunityIcons name="information" size={20} color="#fff" />
          <Text style={styles.debugButtonText}>Connection Status</Text>
        </View>
      </TouchableOpacity>

      {/* Test OBD Command button */}
      <TouchableOpacity
        style={[styles.debugButton, { marginTop: 10 }]}
        onPress={async () => {
          if (!isConnected) {
            Alert.alert("Not Connected", "Please connect to a device first");
            return;
          }

          try {
            // Show a prompt to enter an OBD command
            Alert.prompt(
              "Test OBD Command",
              "Enter an OBD command (e.g., AT RV, 0100, etc.)",
              [
                {
                  text: "Cancel",
                  style: "cancel",
                },
                {
                  text: "Send",
                  onPress: async (command) => {
                    if (!command) return;

                    try {
                      const response = await sendCommand(
                        command.trim(),
                        "53fc0537-e506-0bcf-81ec-e757067e9ed3"
                      );
                      Alert.alert(
                        "Response",
                        `Command: ${command}\n\nResponse: ${response}`
                      );
                    } catch (err) {
                      Alert.alert(
                        "Command Error",
                        `Error sending command: ${err instanceof Error ? err.message : String(err)}`
                      );
                    }
                  },
                },
              ],
              "plain-text",
              "AT RV" // Default value
            );
          } catch (error) {
            console.error("Error with test command:", error);
          }
        }}
      >
        <View style={styles.buttonContent}>
          <MaterialCommunityIcons name="console" size={20} color="#fff" />
          <Text style={styles.buttonText}>Test Command</Text>
        </View>
      </TouchableOpacity>

      {/* Add diagnostic button to your UI */}
      <TouchableOpacity
        style={[styles.debugButtonContainer, { bottom: 630 }]}
        onPress={async () => {
          try {
            if (isConnected && deviceId) {
              Alert.alert(
                "Reset Connection",
                "This will disconnect and attempt to reconnect with proper service discovery.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Reset Connection",
                    onPress: async () => {
                      // Disconnect
                      await disconnectDevice();

                      // Wait a moment
                      await new Promise((resolve) => setTimeout(resolve, 1000));

                      // Reconnect with clean state
                      if (rememberedDevice) {
                        const success = await connectToRememberedDevice();
                        if (success) {
                          Alert.alert(
                            "Reconnected",
                            "Connection has been re-established with proper service discovery.",
                            [{ text: "OK" }]
                          );
                        } else {
                          Alert.alert(
                            "Reconnection Failed",
                            "Could not reconnect to the device. Try scanning again.",
                            [{ text: "OK" }]
                          );
                        }
                      }
                    },
                  },
                ]
              );
            } else {
              Alert.alert("Not Connected", "Device is not currently connected");
            }
          } catch (error) {
            console.error("Error during reset:", error);
          }
        }}
      >
        <View style={styles.debugButton}>
          <MaterialCommunityIcons name="restart" size={20} color="#fff" />
          <Text style={styles.debugButtonText}>Reset Connection</Text>
        </View>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
  },
  connectionCard: {
    margin: 16,
    marginBottom: 8,
    elevation: 2,
  },
  connectionStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  connectionTextContainer: {
    marginLeft: 16,
  },
  deviceName: {
    opacity: 0.7,
  },
  divider: {
    marginVertical: 16,
  },
  itemDivider: {
    height: 1,
    opacity: 0.3,
  },
  buttonGrid: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  dataCard: {
    margin: 16,
    marginBottom: 8,
  },
  logCard: {
    margin: 16,
    marginTop: 8,
    flex: 1,
    elevation: 2,
  },
  logScrollView: {
    flex: 1,
    maxHeight: 200,
  },
  logEntry: {
    fontSize: 13,
    fontFamily: "monospace",
    marginBottom: 4,
  },
  emptyLogText: {
    fontStyle: "italic",
    opacity: 0.7,
    textAlign: "center",
    paddingVertical: 20,
  },
  debugButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "#333",
    padding: 8,
    borderRadius: 8,
    opacity: 0.8,
  },
  debugButtonText: {
    color: "white",
    fontSize: 12,
  },
  debugButtonContainer: {
    position: "absolute",
    bottom: 80,
    right: 20,
    alignItems: "center",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    marginLeft: 4,
  },
  dataRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  dataValue: {
    fontSize: 24,
    fontWeight: "bold",
    marginLeft: 12,
  },
});

export default ScanDevicesScreen;
