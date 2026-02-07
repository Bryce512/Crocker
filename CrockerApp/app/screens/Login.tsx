import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import LinearGradient from "react-native-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useAuth } from "../contexts/AuthContext"; // Assuming you have a custom hook for authentication
import firebaseService from "../services/firebaseService";

const Login = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { signIn, signInWithApple } = useAuth(); // Assuming useAuth is a custom hook for authentication

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      console.log("🔍 DEBUG: Attempting login with email:", email);
      const result = await signIn(email, password);
      console.log("🔍 DEBUG: Login result:", result);

      if (result.error) {
        console.error("❌ DEBUG: Login error:", result.error);
        let errorMessage = "Login failed";

        // Handle specific Firebase error codes
        if (typeof result.error === "object" && result.error.code) {
          switch (result.error.code) {
            case "auth/user-not-found":
              errorMessage =
                "No account found with this email. Try creating a new account.";
              break;
            case "auth/wrong-password":
              errorMessage = "Incorrect password";
              break;
            case "auth/invalid-email":
              errorMessage = "Invalid email format";
              break;
            case "auth/too-many-requests":
              errorMessage =
                "Too many failed attempts. Please try again later.";
              break;
            default:
              errorMessage = result.error.message || "Login failed";
          }
        } else if (typeof result.error === "string") {
          errorMessage = result.error;
        }

        setErrorMessage(errorMessage);
        Alert.alert("Login Error", errorMessage);
      }
    } catch (error) {
      console.error("❌ DEBUG: Unexpected login error:", error);
      setErrorMessage("An unexpected error occurred");
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Generate a random nonce for security
      const randomBytes = await Crypto.getRandomBytes(16);
      const nonce = Array.from(randomBytes)
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");

      // Request Apple authentication
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error("Missing identityToken");
      }

      console.log("🍎 Apple credential received:", credential);

      // Extract the user's name from Apple credential
      let firstName = "";
      let lastName = "";
      if (credential.fullName) {
        const { givenName, familyName } = credential.fullName;
        firstName = givenName || "";
        lastName = familyName || "";
      }
      console.log("🍎 First name:", firstName || "Not provided");
      console.log("🍎 Last name:", lastName || "Not provided");

      // Sign in with Firebase using Apple credential
      const result = await signInWithApple({
        identityToken: credential.identityToken,
        nonce: nonce,
        displayName: firstName, // Set displayName to just firstName
        firstName: firstName,
        lastName: lastName,
      });

      if (result.error) {
        console.error("❌ Apple sign-in error:", result.error);
        let errorMessage = "Apple sign-in failed";

        if (typeof result.error === "object" && result.error.code) {
          switch (result.error.code) {
            case "auth/account-exists-with-different-credential":
              errorMessage =
                "An account already exists with a different sign-in method";
              break;
            case "auth/invalid-credential":
              errorMessage = "Invalid Apple credentials";
              break;
            case "auth/operation-not-allowed":
              errorMessage = "Apple sign-in is not enabled";
              break;
            default:
              errorMessage = result.error.message || "Apple sign-in failed";
          }
        }

        setErrorMessage(errorMessage);
        Alert.alert("Sign-In Error", errorMessage);
      }
    } catch (error: any) {
      // Handle user cancellation - do nothing, just exit silently
      if (
        error.code === "ERR_CANCELED" ||
        error.code === 1001 ||
        error.message?.includes("canceled the authorization attempt")
      ) {
        setIsLoading(false);
        return;
      }

      console.error("❌ Apple sign-in exception:", error);

      let errorMessage = "Failed to sign in with Apple";
      if (error.message) {
        errorMessage = error.message;
      }

      setErrorMessage(errorMessage);
      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccount = () => {
    navigation.navigate("Signup");
  };

  const handleForgotPassword = () => {
    // Use setTimeout to ensure the prompt appears after any current focus is cleared
    setTimeout(() => {
      Alert.prompt(
        "Reset Password",
        "Enter your email address to receive a password reset link:",
        [
          {
            text: "Cancel",
            onPress: () => {},
            style: "cancel",
          },
          {
            text: "Send",
            onPress: async (emailInput) => {
              if (!emailInput || !emailInput.trim()) {
                Alert.alert("Error", "Please enter your email address", [
                  {
                    text: "Try Again",
                    onPress: () => handleForgotPassword(),
                  },
                ]);
                return;
              }

              const trimmedEmail = emailInput.trim();
              console.log(
                "🔑 DEBUG: Password reset started for email:",
                trimmedEmail,
              );
              setIsLoading(true);
              try {
                const result =
                  await firebaseService.sendPasswordResetEmail(trimmedEmail);

                if (result.success) {
                  Alert.alert(
                    "Success",
                    "Password reset email has been sent. Please check your email.",
                  );
                } else {
                  // Show alert with options to try Apple or check email again
                  Alert.alert(
                    "Account Not Found",
                    "Oops! We don't see an account with that email. Did you sign up with Apple?",
                    [
                      {
                        text: "Try Apple Sign In",
                        onPress: () => {},
                      },
                      {
                        text: "Check Email",
                        onPress: () => {
                          // Reopen prompt with the email they tried
                          Alert.prompt(
                            "Reset Password",
                            "Enter your email address to receive a password reset link:",
                            [
                              {
                                text: "Cancel",
                                onPress: () => {},
                                style: "cancel",
                              },
                              {
                                text: "Send",
                                onPress: async (newEmailInput) => {
                                  if (!newEmailInput || !newEmailInput.trim()) {
                                    Alert.alert(
                                      "Error",
                                      "Please enter your email address",
                                      [
                                        {
                                          text: "Try Again",
                                          onPress: () => handleForgotPassword(),
                                        },
                                      ],
                                    );
                                    return;
                                  }

                                  setIsLoading(true);
                                  try {
                                    const newResult =
                                      await firebaseService.sendPasswordResetEmail(
                                        newEmailInput.trim(),
                                      );

                                    if (newResult.success) {
                                      Alert.alert(
                                        "Success",
                                        "Password reset email has been sent. Please check your email.",
                                      );
                                    } else {
                                      Alert.alert(
                                        "Account Not Found",
                                        "Oops! We don't see an account with that email. Did you sign up with Apple?",
                                        [
                                          {
                                            text: "Try Apple Sign In",
                                            onPress: () => {},
                                          },
                                          {
                                            text: "Try Again",
                                            onPress: () =>
                                              handleForgotPassword(),
                                          },
                                        ],
                                      );
                                    }
                                  } catch (error) {
                                    console.error(
                                      "Error sending password reset:",
                                      error,
                                    );
                                    Alert.alert(
                                      "Error",
                                      "Failed to send password reset email",
                                      [
                                        {
                                          text: "Try Again",
                                          onPress: () => handleForgotPassword(),
                                        },
                                      ],
                                    );
                                  } finally {
                                    setIsLoading(false);
                                  }
                                },
                              },
                            ],
                            "plain-text",
                            emailInput.trim(),
                            "email-address",
                          );
                        },
                      },
                    ],
                  );
                }
              } catch (error) {
                console.error("Error sending password reset:", error);
                Alert.alert("Error", "Failed to send password reset email", [
                  {
                    text: "Try Again",
                    onPress: () => handleForgotPassword(),
                  },
                ]);
              } finally {
                setIsLoading(false);
              }
            },
          },
        ],
        "plain-text",
        email || "",
        "email-address",
      );
    }, 100);
  };

  return (
    <LinearGradient colors={["#f8fafc", "#eff6ff"]} style={styles.container}>
      <StatusBar backgroundColor="#f8fafc" barStyle="dark-content" />

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
            <Text style={styles.tagline}>Soften the Switch</Text>
          </View>
        </View>

        {/* Login Form */}
        <View style={styles.formContainer}>
          <Text style={styles.title}>Sign into your account</Text>

          {errorMessage && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#94a3b8"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
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
              <Text style={styles.loginButtonText}>Log In</Text>
            )}
          </TouchableOpacity>

          {/* Apple Sign-In Button */}
          <TouchableOpacity
            style={styles.appleButton}
            onPress={handleAppleSignIn}
            disabled={isLoading}
          >
            <Text style={styles.appleButtonText}>Log in with Apple</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleForgotPassword}
            style={styles.forgotPassword}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>

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
    marginTop: 60,
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
  errorContainer: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 14,
    textAlign: "center",
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
  clearDataButton: {
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "#f59e0b",
    borderRadius: 20,
    backgroundColor: "rgba(251, 191, 36, 0.1)",
  },
  clearDataButtonText: {
    color: "#f59e0b",
    fontSize: 14,
    fontWeight: "500",
  },
  forceResetButton: {
    alignItems: "center",
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "#ef4444",
    borderRadius: 20,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  forceResetButtonText: {
    color: "#ef4444",
    fontSize: 14,
    fontWeight: "500",
  },
  testDatabaseButton: {
    alignItems: "center",
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "#3b82f6",
    borderRadius: 20,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
  },
  testDatabaseButtonText: {
    color: "#3b82f6",
    fontSize: 14,
    fontWeight: "500",
  },
  getTokenButton: {
    alignItems: "center",
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "#10b981",
    borderRadius: 20,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
  },
  getTokenButtonText: {
    color: "#10b981",
    fontSize: 14,
    fontWeight: "500",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 28,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#cbd5e1",
  },
  dividerText: {
    marginHorizontal: 12,
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "500",
  },
  appleButton: {
    height: 56,
    backgroundColor: "#1f2937",
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 28,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  appleButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
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
