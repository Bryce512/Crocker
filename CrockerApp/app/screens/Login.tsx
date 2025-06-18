import React, { useState } from "react"
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useNavigation } from "@react-navigation/native"
import { Feather } from "@expo/vector-icons"
import Button from "../components/Button"
import { useAuth } from "../contexts/AuthContext"
import { colors } from "../theme/colors"

export default function LoginScreen() {
  const navigation = useNavigation()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"
  const { signIn } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password")
      return
    }

    setLoading(true)
    setErrorMessage(null)

    try {
      const { error } = await signIn(email, password)
    }
    catch (error) {
      setErrorMessage("An unexpected error occurred")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoidingView}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.logoContainer}>
            <Feather name="tool" size={40} color={colors.primary[500]} />
            <Text style={[styles.logoText, isDark && styles.textLight]}>Mychanic</Text>
          </View>

          <Text style={[styles.title, isDark && styles.textLight]}>Welcome Back</Text>
          <Text style={[styles.subtitle, isDark && styles.textMutedLight]}>Sign in to your account to continue</Text>

          <View style={styles.form}>
            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isDark && styles.textLight]}>Email</Text>
              <View style={styles.inputWrapper}>
                <Feather
                  name="mail"
                  size={18}
                  color={isDark ? colors.gray[400] : colors.gray[500]}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, isDark && styles.inputDark, { paddingLeft: 40 }]}
                  placeholder="Enter your email"
                  placeholderTextColor={isDark ? colors.gray[400] : colors.gray[500]}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isDark && styles.textLight]}>Password</Text>
              <View style={styles.inputWrapper}>
                <Feather
                  name="lock"
                  size={18}
                  color={isDark ? colors.gray[400] : colors.gray[500]}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, isDark && styles.inputDark, { paddingLeft: 40, paddingRight: 40 }]}
                  placeholder="Enter your password"
                  placeholderTextColor={isDark ? colors.gray[400] : colors.gray[500]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity style={styles.passwordToggle} onPress={() => setShowPassword(!showPassword)}>
                  <Feather
                    name={showPassword ? "eye-off" : "eye"}
                    size={18}
                    color={isDark ? colors.gray[400] : colors.gray[500]}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={[styles.forgotPasswordText, isDark && { color: colors.primary[400] }]}>
                Forgot Password?
              </Text>
            </TouchableOpacity>

            <Button title="Sign In" onPress={handleLogin} loading={loading} fullWidth style={styles.loginButton} />

            <View style={styles.divider}>
              <View style={[styles.dividerLine, isDark && styles.dividerLineDark]} />
              <Text style={[styles.dividerText, isDark && styles.textMutedLight]}>OR</Text>
              <View style={[styles.dividerLine, isDark && styles.dividerLineDark]} />
            </View>

            <Button
              title="Sign In as Mechanic"
              onPress={() => {}}
              variant="outline"
              fullWidth
              style={styles.mechanicButton}
            />
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, isDark && styles.textMutedLight]}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Signup" as never)}>
              <Text style={[styles.signupText, isDark && { color: colors.primary[400] }]}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
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
  forgotPassword: {
    alignSelf: "flex-end",
  },
  forgotPasswordText: {
    fontSize: 14,
    color: colors.primary[500],
  },
  loginButton: {
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
    marginBottom: 8,
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
  signupText: {
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
  errorText: {
    color: "red",
    marginBottom: 15,
    textAlign: "center",
  },
})

