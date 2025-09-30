"use client";

import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import Button from "../components/Button";
import { useAuth } from "../contexts/AuthContext";
import { colors } from "../theme/colors";
import firebaseService from "../services/firebaseService";

export default function SignupScreen() {
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { signUp } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      console.log("🔍 DEBUG: Attempting signup with email:", email);
      const { error, user } = await signUp(email, password);
      console.log("🔍 DEBUG: Signup result - user:", !!user, "error:", error);

      if (error) {
        console.error("❌ DEBUG: Signup error:", error);
        let errorMessage = "Failed to create account";

        // Handle specific Firebase error codes
        if (typeof error === "object" && error.code) {
          switch (error.code) {
            case "auth/email-already-in-use":
              errorMessage = "An account with this email already exists";
              break;
            case "auth/invalid-email":
              errorMessage = "Invalid email format";
              break;
            case "auth/weak-password":
              errorMessage = "Password is too weak";
              break;
            case "auth/network-request-failed":
              errorMessage = "Network error. Please check your connection.";
              break;
            default:
              errorMessage = error.message || "Failed to create account";
          }
        } else if (typeof error === "string") {
          errorMessage = error;
        }

        Alert.alert("Signup Error", errorMessage);
      } else if (user) {
        console.log(
          "✅ DEBUG: Account created successfully for user:",
          user.uid
        );
        Alert.alert("Success", "Account created successfully!", [
          {
            text: "OK",
            onPress: () => {
              // Navigation will happen automatically via AuthContext
              console.log(
                "🔍 DEBUG: Account creation completed, user should be logged in"
              );
            },
          },
        ]);
      } else {
        console.log("⚠️ DEBUG: Signup completed but no user or error returned");
        Alert.alert("Success", "Please check your email for verification!");
        navigation.navigate("Login" as never);
      }
    } catch (error) {
      console.error("❌ DEBUG: Unexpected signup error:", error);
      Alert.alert("Error", "An unexpected error occurred during signup");
    } finally {
      setLoading(false);
    }
  };

  const handleSignupAuthOnly = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      console.log("🔍 DEBUG: Testing auth-only signup...");
      const result = await firebaseService.signUpAuthOnly(email, password);

      if (result.error) {
        console.error("❌ DEBUG: Auth-only signup failed:", result.error);
        Alert.alert(
          "Auth Test Failed",
          result.error.message || "Authentication failed"
        );
      } else if (result.user) {
        console.log("✅ DEBUG: Auth-only signup succeeded:", result.user.uid);
        Alert.alert(
          "Auth Test Success",
          "Authentication works! Database issue confirmed."
        );
      }
    } catch (error) {
      console.error("❌ DEBUG: Auth-only signup error:", error);
      Alert.alert("Error", "Auth test failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.logoContainer}>
            <Feather name="tool" size={40} color={colors.primary[500]} />
            <Text style={[styles.logoText, isDark && styles.textLight]}>
              sori
            </Text>
          </View>

          <Text style={[styles.title, isDark && styles.textLight]}>
            Create Account
          </Text>
          <Text style={[styles.subtitle, isDark && styles.textMutedLight]}>
            Sign up to get started with sori
          </Text>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isDark && styles.textLight]}>
                Email
              </Text>
              <View style={styles.inputWrapper}>
                <Feather
                  name="mail"
                  size={18}
                  color={isDark ? colors.gray[400] : colors.gray[500]}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[
                    styles.input,
                    isDark && styles.inputDark,
                    { paddingLeft: 40 },
                  ]}
                  placeholder="Enter your email"
                  placeholderTextColor={
                    isDark ? colors.gray[400] : colors.gray[500]
                  }
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isDark && styles.textLight]}>
                Password
              </Text>
              <View style={styles.inputWrapper}>
                <Feather
                  name="lock"
                  size={18}
                  color={isDark ? colors.gray[400] : colors.gray[500]}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[
                    styles.input,
                    isDark && styles.inputDark,
                    { paddingLeft: 40, paddingRight: 40 },
                  ]}
                  placeholder="Create a password"
                  placeholderTextColor={
                    isDark ? colors.gray[400] : colors.gray[500]
                  }
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Feather
                    name={showPassword ? "eye-off" : "eye"}
                    size={18}
                    color={isDark ? colors.gray[400] : colors.gray[500]}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isDark && styles.textLight]}>
                Confirm Password
              </Text>
              <View style={styles.inputWrapper}>
                <Feather
                  name="lock"
                  size={18}
                  color={isDark ? colors.gray[400] : colors.gray[500]}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[
                    styles.input,
                    isDark && styles.inputDark,
                    { paddingLeft: 40 },
                  ]}
                  placeholder="Confirm your password"
                  placeholderTextColor={
                    isDark ? colors.gray[400] : colors.gray[500]
                  }
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                />
              </View>
            </View>

            <Button
              title="Sign Up"
              onPress={handleSignup}
              loading={loading}
              fullWidth
              style={styles.signupButton}
            />

            <Button
              title="🔍 Test Auth Only"
              onPress={handleSignupAuthOnly}
              loading={loading}
              fullWidth
              variant="outline"
              style={styles.testButton}
            />

            <View style={styles.divider}>
              <View
                style={[styles.dividerLine, isDark && styles.dividerLineDark]}
              />
              <Text
                style={[styles.dividerText, isDark && styles.textMutedLight]}
              >
                OR
              </Text>
              <View
                style={[styles.dividerLine, isDark && styles.dividerLineDark]}
              />
            </View>

            <Button
              title="Sign Up as Mechanic"
              onPress={() => navigation.navigate("MechanicSignup" as never)}
              variant="outline"
              fullWidth
              style={styles.mechanicButton}
            />

            <Button
              title="Complete Driver Onboarding"
              onPress={() => navigation.navigate("DriverOnboarding" as never)}
              variant="secondary"
              fullWidth
            />
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, isDark && styles.textMutedLight]}>
              Already have an account?
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("Login" as never)}
            >
              <Text
                style={[
                  styles.loginText,
                  isDark && { color: colors.primary[400] },
                ]}
              >
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    justifyContent: "center",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
    gap: 12,
  },
  logoText: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.gray[900],
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
    color: colors.gray[900],
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
    color: colors.gray[600],
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.gray[900],
  },
  inputWrapper: {
    position: "relative",
  },
  inputIcon: {
    position: "absolute",
    left: 12,
    top: 12,
    zIndex: 1,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.white,
  },
  inputDark: {
    borderColor: colors.gray[700],
    backgroundColor: colors.gray[800],
    color: colors.white,
  },
  passwordToggle: {
    position: "absolute",
    right: 12,
    top: 12,
    zIndex: 1,
  },
  signupButton: {
    marginTop: 8,
  },
  testButton: {
    marginTop: 8,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray[300],
  },
  dividerLineDark: {
    backgroundColor: colors.gray[700],
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.gray[500],
  },
  mechanicButton: {
    marginBottom: 16,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 32,
    gap: 4,
  },
  footerText: {
    fontSize: 14,
    color: colors.gray[600],
  },
  loginText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.primary[500],
  },
  textLight: {
    color: colors.white,
  },
  textMutedLight: {
    color: colors.gray[400],
  },
});
