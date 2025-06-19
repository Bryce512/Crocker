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
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import LinearGradient from "react-native-linear-gradient";
import { RootStackParamList } from "../navigation/AppNavigator";

type DeviceConnectionNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "ScanDevices"
>;

interface Device {
  id: string;
  name: string;
  type: string;
  connected: boolean;
}

const DeviceConnection = () => {
  const navigation = useNavigation<DeviceConnectionNavigationProp>();
  const [devices, setDevices] = useState<Device[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    // Simulate device discovery
    const mockDevices: Device[] = [
      { id: "1", name: "Drew's Otter", type: "Soristuffy", connected: false },
      {
        id: "2",
        name: "Sara's Teddy Bear",
        type: "Soristuffy",
        connected: false,
      },
      { id: "3", name: "Mayci's Owl", type: "Soristuffy", connected: false },
    ];
    setDevices(mockDevices);
  }, []);

  const handleDeviceConnect = (deviceId: string) => {
    setDevices((prev) =>
      prev.map((device) =>
        device.id === deviceId
          ? { ...device, connected: !device.connected }
          : device
      )
    );
  };

  const handleScanDevices = () => {
    setIsScanning(true);
    // Simulate scanning
    setTimeout(() => {
      setIsScanning(false);
      Alert.alert("Scan Complete", "Found nearby Soristuffy devices");
    }, 2000);
  };

  const handleSkip = () => {
    navigation.navigate("CalendarScreen");
  };

  return (
    <LinearGradient colors={["#f8fafc", "#eff6ff"]} style={styles.container}>
      <StatusBar backgroundColor="#f8fafc" barStyle="dark-content" />

      {/* Status Bar */}
      <View style={styles.statusBar}>
        <Text style={styles.time}>8:48</Text>
        <View style={styles.notch}>
          <View style={styles.notchInner} />
        </View>
        <View style={styles.indicators}>
          <View style={styles.signalDots}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={[styles.dot, styles.dotActive]} />
            <View style={[styles.dot, styles.dotActive]} />
            <View style={[styles.dot, styles.dotInactive]} />
          </View>
          <View style={styles.battery} />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Connect to your</Text>
          <Text style={styles.titleBrand}>Soristuffy</Text>
        </View>

        {/* Nearby Devices Section */}
        <View style={styles.devicesSection}>
          <View style={styles.devicesSectionHeader}>
            <Text style={styles.devicesTitle}>Nearby Devices</Text>
            <TouchableOpacity onPress={handleScanDevices} disabled={isScanning}>
              {isScanning ? (
                <ActivityIndicator color="#475569" size="small" />
              ) : (
                <Text style={styles.scanIcon}>❄</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.devicesList}>
            {devices.map((device) => (
              <TouchableOpacity
                key={device.id}
                style={[
                  styles.deviceCard,
                  device.connected && styles.deviceCardConnected,
                ]}
                onPress={() => handleDeviceConnect(device.id)}
              >
                <Text
                  style={[
                    styles.deviceName,
                    device.connected && styles.deviceNameConnected,
                  ]}
                >
                  {device.name}
                </Text>
                {device.connected && (
                  <View style={styles.connectedIndicator}>
                    <Text style={styles.connectedText}>Connected</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Empty Space for Visual Balance */}
        <View style={styles.spacer} />
      </ScrollView>

      {/* Skip Button */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
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
});

export default DeviceConnection;
