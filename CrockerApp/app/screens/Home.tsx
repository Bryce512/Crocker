import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Alert,
} from "react-native";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import LinearGradient from "react-native-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useAuth } from "../contexts/AuthContext"; // Assuming you have a custom hook for authentication


const Home = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [username, setUsername] = useState<string>("");
  const { signOut } = useAuth(); // Assuming you have a custom hook for authentication



  return (
    <LinearGradient colors={["#f8fafc", "#eff6ff"]} style={styles.container}>
      <StatusBar backgroundColor="#f8fafc" barStyle="dark-content" />


      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcome}>Welcome back!</Text>
            {username ? (
              <Text style={styles.username}>Hello, {username}</Text>
            ) : null}
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Coming Soon Content */}
        <View style={styles.mainContent}>
          <View style={styles.logoSection}>
            <Text style={styles.logo}>
              <Text style={styles.logoS}>s</Text>
              <Text style={styles.logoO}>o</Text>
              <Text style={styles.logoR}>r</Text>
              <Text style={styles.logoI}>i</Text>
            </Text>
            <Text style={styles.tagline}>soften the switch</Text>
          </View>

          <View style={styles.comingSoonSection}>
            <Text style={styles.comingSoonTitle}>Dashboard Coming Soon</Text>
            <Text style={styles.comingSoonDescription}>
              Your Sori dashboard will include device management, scheduling,
              calendar integration, and more features to help you manage your
              daily routines seamlessly.
            </Text>

            <View style={styles.featuresGrid}>
              <TouchableOpacity
                style={styles.featureCard}
                onPress={() => navigation.navigate("CalendarScreen")}
              >
                <Text style={styles.featureIcon}>📅</Text>
                <Text style={styles.featureTitle}>Calendar & Scheduling</Text>
                <Text style={styles.featureDescription}>
                  Manage your daily routines and events
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.featureCard}
                onPress={() => navigation.navigate("ScanDevices")}
              >
                <Text style={styles.featureIcon}>📱</Text>
                <Text style={styles.featureTitle}>Device Management</Text>
                <Text style={styles.featureDescription}>
                  Connect and control your Soristuffy devices
                </Text>
              </TouchableOpacity>

              <View style={styles.featureCard}>
                <Text style={styles.featureIcon}>🔔</Text>
                <Text style={styles.featureTitle}>Smart Alerts</Text>
                <Text style={styles.featureDescription}>
                  Customizable notifications and reminders
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
    marginTop: 32,
  },
  welcome: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1e293b",
  },
  username: {
    fontSize: 16,
    color: "#475569",
    marginTop: 4,
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  logoutText: {
    color: "#475569",
    fontWeight: "500",
  },
  mainContent: {
    alignItems: "center",
    paddingVertical: 64,
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  logo: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 8,
  },
  logoS: {
    color: "#60a5fa",
  },
  logoO: {
    color: "#2dd4bf",
  },
  logoR: {
    color: "#60a5fa",
  },
  logoI: {
    color: "#60a5fa",
  },
  tagline: {
    color: "#2dd4bf",
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: 0.5,
    marginBottom: 32,
  },
  comingSoonSection: {
    maxWidth: 320,
    alignItems: "center",
  },
  comingSoonTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 16,
  },
  comingSoonDescription: {
    fontSize: 16,
    color: "#475569",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  featuresGrid: {
    width: "100%",
    gap: 16,
  },
  featureCard: {
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  featureIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#334155",
    marginBottom: 8,
    textAlign: "center",
  },
  featureDescription: {
    fontSize: 14,
    color: "#475569",
    textAlign: "center",
    lineHeight: 20,
  },
});

export default Home;
