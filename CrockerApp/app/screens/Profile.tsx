"use client";

import React, { useState, useEffect } from "react";
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
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import firebaseService from "../services/firebaseService";
import { colors } from "../theme/colors";

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load user profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      if (user?.uid) {
        try {
          console.log("📋 Loading user profile for UID:", user.uid);
          const profile = await firebaseService.getUserProfile(user.uid);
          if (profile) {
            setFirstName(profile.firstName || "");
            setLastName(profile.lastName || "");
            setEmail(profile.email || user.email || "");
            setPhone(profile.phone || "");
            console.log("✅ Profile loaded successfully");
          }
        } catch (error) {
          console.error("❌ Error loading profile:", error);
          Alert.alert("Error", "Failed to load profile");
        } finally {
          setLoading(false);
        }
      }
    };

    loadProfile();
  }, [user?.uid]);

  // Track changes
  useEffect(() => {
    const checkChanges = async () => {
      if (user?.uid) {
        try {
          const profile = await firebaseService.getUserProfile(user.uid);
          if (profile) {
            const changed =
              firstName !== (profile.firstName || "") ||
              lastName !== (profile.lastName || "") ||
              phone !== (profile.phone || "");
            setHasChanges(changed);
          }
        } catch (error) {
          console.error("Error checking changes:", error);
        }
      }
    };

    // Debounce the check
    const timer = setTimeout(checkChanges, 500);
    return () => clearTimeout(timer);
  }, [firstName, lastName, phone, user?.uid]);

  const handleSaveProfile = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert("Error", "Please enter both first and last name");
      return;
    }

    setSaving(true);
    try {
      console.log("💾 Saving profile changes...");
      if (!user?.uid) {
        return;
      }
      await firebaseService.updateUserProfile(user.uid, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
      });
      setHasChanges(false);
    } catch (error) {
      console.error("❌ Error saving profile:", error);
      Alert.alert("Error", "Failed to save profile changes");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.",
      [
        {
          text: "Cancel",
          onPress: () => {},
          style: "cancel",
        },
        {
          text: "Delete",
          onPress: async () => {
            if (!user?.uid) {
              return;
            }

            setSaving(true);
            try {
              console.log("🗑️ Deleting account for UID:", user.uid);
              await firebaseService.deleteAccount(user.uid);
              console.log("✅ Account deleted successfully");
            } catch (error) {
              console.error("❌ Error deleting account:", error);
              Alert.alert(
                "Error",
                "Failed to delete account. Please try again.",
              );
            } finally {
              setSaving(false);
            }
          },
          style: "destructive",
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.teal[500]} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
              <Feather name="arrow-left" size={24} color={colors.gray[700]} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Profile</Text>
            <View style={styles.spacer} />
          </View>

          {/* Profile Form */}
          <View style={styles.formContainer}>
            {/* First Name */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter first name"
                value={firstName}
                onChangeText={setFirstName}
                placeholderTextColor={colors.gray[400]}
              />
            </View>

            {/* Last Name */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter last name"
                value={lastName}
                onChangeText={setLastName}
                placeholderTextColor={colors.gray[400]}
              />
            </View>

            {/* Phone */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter phone number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholderTextColor={colors.gray[400]}
              />
            </View>

            {/* Email (Read-only) */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Email (Read-only)</Text>
              <TextInput
                style={[styles.input, styles.disabledInput]}
                placeholder="Email"
                value={email}
                editable={false}
                placeholderTextColor={colors.gray[400]}
              />
              <Text style={styles.helperText}>
                Your email cannot be changed. Contact support if you need to
                update it.
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, !hasChanges && styles.buttonDisabled]}
              onPress={handleSaveProfile}
              disabled={!hasChanges || saving}
            >
              {saving ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.buttonText}>Save Changes</Text>
              )}
            </TouchableOpacity>

            {/* Delete Account Button */}
            <TouchableOpacity onPress={handleDeleteAccount}>
              <Text style={styles.deleteButtonText}>Delete Account</Text>
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
    backgroundColor: colors.white,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 32,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.gray[800],
    flex: 1,
    textAlign: "center",
  },
  spacer: {
    width: 40,
  },
  formContainer: {
    marginBottom: 32,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.gray[700],
    marginBottom: 8,
  },
  input: {
    height: 56,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 28,
    paddingHorizontal: 20,
    fontSize: 16,
    color: colors.gray[800],
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  disabledInput: {
    backgroundColor: colors.gray[100],
    color: colors.gray[500],
  },
  helperText: {
    fontSize: 12,
    color: colors.gray[500],
    marginTop: 8,
  },
  buttonContainer: {
    marginBottom: 40,
  },
  button: {
    height: 56,
    backgroundColor: colors.teal[500],
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: colors.teal[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: colors.gray[300],
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.white,
  },
  deleteButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.red[500],
    paddingVertical: 8,
  },
  cancelButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.teal[500],
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.teal[500],
  },
});
