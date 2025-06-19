import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import LinearGradient from "react-native-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RootStackParamList } from "../navigation/AppNavigator";


const Login = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter both username and password");
      return;
    }

    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Store auth state
      await AsyncStorage.setItem("isAuthenticated", "true");
      await AsyncStorage.setItem("username", username);

      navigation.navigate("Home");
    } catch (error) {
      Alert.alert("Error", "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      "Coming Soon",
      "Forgot password functionality will be implemented later"
    );
  };

  const handleCreateAccount = () => {
    Alert.alert("Coming Soon", "Account creation will be implemented later");
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

      <View style={styles.content}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <Text style={styles.logo}>
              <Text style={styles.logoS}>s</Text>
              <Text style={styles.logoO}>o</Text>
              <Text style={styles.logoR}>r</Text>
              <Text style={styles.logoI}>i</Text>
            </Text>
            <Text style={styles.tagline}>soften the switch</Text>
          </View>
        </View>

        {/* Login Form */}
        <View style={styles.formContainer}>
          <Text style={styles.title}>Sign into your account</Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#94a3b8"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#94a3b8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>Button</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleForgotPassword}
            style={styles.forgotPassword}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <View style={styles.createAccountSection}>
            <Text style={styles.createAccountLabel}>
              Don't have an account?
            </Text>
            <TouchableOpacity
              style={styles.createAccountButton}
              onPress={handleCreateAccount}
            >
              <Text style={styles.createAccountButtonText}>
                Create an Account
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 64,
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 64,
  },
  logoContainer: {
    alignItems: "center",
  },
  logo: {
    fontSize: 60,
    fontWeight: "700",
    letterSpacing: 3,
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
    fontSize: 18,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  formContainer: {
    width: "100%",
    maxWidth: 384,
    alignSelf: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    color: "#334155",
    textAlign: "center",
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    height: 56,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 28,
    paddingHorizontal: 24,
    fontSize: 16,
    color: "#475569",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  loginButton: {
    height: 56,
    backgroundColor: "#2dd4bf",
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  loginButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "500",
  },
  forgotPassword: {
    alignItems: "center",
    marginTop: 24,
  },
  forgotPasswordText: {
    color: "#475569",
    fontSize: 16,
    fontWeight: "500",
    textDecorationLine: "underline",
  },
  createAccountSection: {
    alignItems: "center",
    marginTop: 32,
  },
  createAccountLabel: {
    color: "#475569",
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 16,
  },
  createAccountButton: {
    width: "100%",
    height: 56,
    borderWidth: 2,
    borderColor: "#475569",
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  createAccountButtonText: {
    color: "#475569",
    fontSize: 16,
    fontWeight: "500",
  },
});

export default Login;
