"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { useBluetooth } from "../contexts/BluetoothContext";
import {
  sendTimerToDevice,
  cancelTimerOnDevice,
} from "../services/bluetoothService";

const { height: screenHeight } = Dimensions.get("window");
const ITEM_HEIGHT = 60;
const VISIBLE_ITEMS = 3;

const STORAGE_KEY = "@timer_presets";
const DEFAULT_PRESETS = [60, 180, 300, 600]; // 1min, 3min, 5min, 10min in seconds

export default function TimerScreen() {
  const navigation = useNavigation();
  const { rememberedDevice, connectionState } = useBluetooth();
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);
  const [presets, setPresets] = useState<number[]>(DEFAULT_PRESETS);
  const minutesScrollRef = useRef<ScrollView>(null);
  const secondsScrollRef = useRef<ScrollView>(null);

  const generateArray = (max: number) =>
    Array.from({ length: max }, (_, i) => i);
  const minuteOptions = generateArray(100);
  const secondsOptions = generateArray(60);

  const scrollToValue = (
    ref: React.RefObject<ScrollView | null>,
    value: number,
    max: number,
  ) => {
    const scrollPadding = ITEM_HEIGHT * 2; // Padding above content
    const visibleHeight = ITEM_HEIGHT * VISIBLE_ITEMS;
    const offset =
      value * ITEM_HEIGHT + scrollPadding + ITEM_HEIGHT / 2 - visibleHeight / 2;
    ref.current?.scrollTo({
      y: Math.max(0, offset),
      animated: true,
    });
  };

  const handleMinutesScroll = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    const scrollPadding = ITEM_HEIGHT * 2;
    const visibleHeight = ITEM_HEIGHT * VISIBLE_ITEMS;
    const centerOffset =
      y + visibleHeight / 2 - ITEM_HEIGHT / 2 - scrollPadding;
    const newValue = Math.round(centerOffset / ITEM_HEIGHT);
    const clampedValue = Math.min(Math.max(newValue, 0), 99);
    setMinutes(clampedValue);
  };

  const handleSecondsScroll = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    const scrollPadding = ITEM_HEIGHT * 2;
    const visibleHeight = ITEM_HEIGHT * VISIBLE_ITEMS;
    const centerOffset =
      y + visibleHeight / 2 - ITEM_HEIGHT / 2 - scrollPadding;
    const newValue = Math.round(centerOffset / ITEM_HEIGHT);
    const clampedValue = Math.min(Math.max(newValue, 0), 59);
    setSeconds(clampedValue);
  };

  const handleMinutesInput = (text: string) => {
    const value = parseInt(text) || 0;
    setMinutes(Math.min(Math.max(value, 0), 99));
    scrollToValue(minutesScrollRef, Math.min(Math.max(value, 0), 99), 100);
  };

  const handleSecondsInput = (text: string) => {
    const value = parseInt(text) || 0;
    setSeconds(Math.min(Math.max(value, 0), 59));
    scrollToValue(secondsScrollRef, Math.min(Math.max(value, 0), 59), 60);
  };

  // Set initial scroll position on mount
  useEffect(() => {
    setTimeout(() => {
      scrollToValue(minutesScrollRef, minutes, 100);
      scrollToValue(secondsScrollRef, seconds, 60);
    }, 100);
  }, []);

  // Load presets from storage
  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setPresets(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to load presets:", error);
    }
  };

  const savePresets = async (newPresets: number[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newPresets));
      setPresets(newPresets);
    } catch (error) {
      console.error("Failed to save presets:", error);
    }
  };

  const handlePresetLongPress = (index: number) => {
    const totalSeconds = minutes * 60 + seconds;
    if (totalSeconds === 0) {
      Alert.alert(
        "Invalid Time",
        "Please select a time greater than 0 seconds.",
      );
      return;
    }

    const displayMinutes = Math.floor(totalSeconds / 60);
    const displaySeconds = totalSeconds % 60;
    const timeString =
      displaySeconds > 0
        ? `${displayMinutes}m ${displaySeconds}s`
        : `${displayMinutes}m`;

    Alert.alert("Update Preset", `Set preset ${index + 1} to ${timeString}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Update",
        onPress: () => {
          const newPresets = [...presets];
          newPresets[index] = totalSeconds;
          savePresets(newPresets);
        },
      },
    ]);
  };

  const applyPreset = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    setMinutes(mins);
    setSeconds(secs);
    scrollToValue(minutesScrollRef, mins, 99);
    scrollToValue(secondsScrollRef, secs, 59);
  };

  const handleStart = async () => {
    const totalSeconds = minutes * 60 + seconds;
    if (totalSeconds === 0) {
      Alert.alert(
        "Invalid Time",
        "Please select a time greater than 0 seconds.",
      );
      return;
    }

    // Check if device is connected
    if (!rememberedDevice || !connectionState.isConnected) {
      Alert.alert(
        "Device Not Connected",
        "Please connect to a device before starting the timer.",
        [
          { text: "OK" },
          {
            text: "Connect Device",
            onPress: () => navigation.navigate("ScanDevices" as never),
          },
        ],
      );
      return;
    }

    console.log(
      `⏱️  Sending timer to device: ${minutes}m ${seconds}s (${totalSeconds}s)`,
    );

    try {
      const result = await sendTimerToDevice(rememberedDevice.id, totalSeconds);

      if (result.success) {
        Alert.alert(
          "Timer Started",
          `Timer set for ${minutes > 0 ? `${minutes}m ` : ""}${seconds}s on your device.`,
          [{ text: "OK", onPress: () => navigation.goBack() }],
        );
      } else {
        Alert.alert(
          "Timer Failed",
          result.error || "Failed to send timer to device. Please try again.",
          [{ text: "OK" }],
        );
      }
    } catch (error) {
      console.error("Error sending timer:", error);
      Alert.alert(
        "Error",
        "An unexpected error occurred while sending the timer.",
        [{ text: "OK" }],
      );
    }
  };

  const handleCancel = async () => {
    // Check if device is connected
    if (!rememberedDevice || !connectionState.isConnected) {
      Alert.alert(
        "Device Not Connected",
        "Please connect to a device to cancel the timer.",
        [{ text: "OK" }],
      );
      return;
    }

    Alert.alert(
      "Cancel Timer",
      "Are you sure you want to cancel the timer on your device?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            console.log("⏹️  Cancelling timer on device");
            try {
              const result = await cancelTimerOnDevice(rememberedDevice.id);

              if (result.success) {
                Alert.alert(
                  "Timer Cancelled",
                  "The timer has been cancelled on your device.",
                  [{ text: "OK" }],
                );
              } else {
                Alert.alert(
                  "Cancellation Failed",
                  result.error || "Failed to cancel timer. Please try again.",
                  [{ text: "OK" }],
                );
              }
            } catch (error) {
              console.error("Error cancelling timer:", error);
              Alert.alert(
                "Error",
                "An unexpected error occurred while cancelling the timer.",
                [{ text: "OK" }],
              );
            }
          },
        },
      ],
    );
  };

  const handleClose = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Close Button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Feather name="x" size={28} color={colors.gray[700]} />
          </TouchableOpacity>
          <Text style={styles.title}>Quick Timer</Text>
          <View style={styles.spacer} />
        </View>

        {/* Time Picker */}
        <View style={styles.pickerContainer}>
          {/* Gradient overlay effect */}
          <View
            style={[styles.pickerOverlay, styles.topOverlay]}
            pointerEvents="none"
          />
          <View
            style={[styles.pickerOverlay, styles.bottomOverlay]}
            pointerEvents="none"
          />

          {/* Minutes Picker */}
          <View style={styles.timeUnitContainer}>
            <ScrollView
              ref={minutesScrollRef}
              scrollEventThrottle={16}
              onScroll={handleMinutesScroll}
              snapToInterval={ITEM_HEIGHT}
              decelerationRate="fast"
              showsVerticalScrollIndicator={false}
              style={styles.scrollPicker}
              contentContainerStyle={styles.scrollContent}
            >
              {minuteOptions.map((value) => (
                <View key={`min-${value}`} style={styles.pickerItem}>
                  <Text
                    style={[
                      styles.pickerItemText,
                      value === minutes && styles.pickerItemTextSelected,
                    ]}
                  >
                    {String(value).padStart(2, "0")}
                  </Text>
                </View>
              ))}
            </ScrollView>
            <Text style={styles.unitLabel}>min</Text>
          </View>

          {/* Separator */}
          <Text style={styles.separator}>:</Text>

          {/* Seconds Picker */}
          <View style={styles.timeUnitContainer}>
            <ScrollView
              ref={secondsScrollRef}
              scrollEventThrottle={16}
              onScroll={handleSecondsScroll}
              snapToInterval={ITEM_HEIGHT}
              decelerationRate="fast"
              showsVerticalScrollIndicator={false}
              style={styles.scrollPicker}
              contentContainerStyle={styles.scrollContent}
            >
              {secondsOptions.map((value) => (
                <View key={`sec-${value}`} style={styles.pickerItem}>
                  <Text
                    style={[
                      styles.pickerItemText,
                      value === seconds && styles.pickerItemTextSelected,
                    ]}
                  >
                    {String(value).padStart(2, "0")}
                  </Text>
                </View>
              ))}
            </ScrollView>
            <Text style={styles.unitLabel}>sec</Text>
          </View>
        </View>

        {/* Quick Preset Buttons */}
        <View style={styles.presetsContainer}>
          <Text style={styles.presetsLabel}>Quick Presets</Text>
          <View style={styles.presetsGrid}>
            {presets.map((totalSeconds, index) => {
              const mins = Math.floor(totalSeconds / 60);
              const secs = totalSeconds % 60;
              const label = secs > 0 ? `${mins}m ${secs}s` : `${mins} min`;

              return (
                <TouchableOpacity
                  key={index}
                  style={styles.presetButton}
                  onPress={() => applyPreset(totalSeconds)}
                  onLongPress={() => handlePresetLongPress(index)}
                  delayLongPress={500}
                >
                  <Text style={styles.presetText}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.presetHint}>Hold to customize</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.startButton} onPress={handleStart}>
            <Feather name="play" size={24} color={colors.white} />
            <Text style={styles.startButtonText}>Start Timer</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Feather name="square" size={20} color={colors.gray[700]} />
            <Text style={styles.cancelButtonText}>Cancel Timer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 40,
  },
  closeButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.gray[800],
    flex: 1,
    textAlign: "center",
  },
  spacer: {
    width: 40,
  },
  pickerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: ITEM_HEIGHT * VISIBLE_ITEMS + 40,
    marginBottom: 40,
    backgroundColor: "rgba(45, 212, 191, 0.02)",
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
  },
  pickerOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * 2,
    pointerEvents: "none",
    zIndex: 10,
  },
  topOverlay: {
    top: 0,
    backgroundColor:
      "linear-gradient(to bottom, rgba(255,255,255,0.8), transparent)",
  },
  bottomOverlay: {
    bottom: 0,
    backgroundColor:
      "linear-gradient(to top, rgba(255,255,255,0.8), transparent)",
  },
  timeUnitContainer: {
    alignItems: "center",
    marginHorizontal: 20,
    position: "relative",
  },
  scrollPicker: {
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    width: 80,
  },
  scrollContent: {
    paddingVertical: ITEM_HEIGHT * 2,
  },
  pickerItem: {
    height: ITEM_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  pickerItemText: {
    fontSize: 36,
    fontWeight: "300",
    color: colors.gray[400],
  },
  pickerItemTextSelected: {
    fontSize: 56,
    fontWeight: "700",
    color: colors.teal[500],
  },
  unitLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.gray[600],
    marginTop: 8,
  },
  separator: {
    fontSize: 48,
    fontWeight: "700",
    color: colors.teal[500],
    marginBottom: 20,
  },
  timeUnit: {
    alignItems: "center",
    marginHorizontal: 20,
  },
  presetsContainer: {
    marginBottom: 40,
  },
  presetsLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.gray[700],
    marginBottom: 12,
  },
  presetsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  presetButton: {
    flex: 1,
    minWidth: "45%",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.gray[100],
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  presetText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.gray[700],
  },
  presetHint: {
    fontSize: 12,
    color: colors.gray[500],
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
  buttonContainer: {
    marginTop: "auto",
    marginBottom: 20,
  },
  startButton: {
    flexDirection: "row",
    height: 56,
    backgroundColor: colors.teal[500],
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    shadowColor: colors.teal[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.white,
  },
  cancelButton: {
    flexDirection: "row",
    height: 48,
    backgroundColor: colors.white,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 2,
    borderColor: colors.gray[300],
    marginTop: 12,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.gray[700],
  },
});
