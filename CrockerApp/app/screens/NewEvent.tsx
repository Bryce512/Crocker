import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Alert,
} from "react-native";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/AppNavigator";

const EventCreation = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("JAN 7, 2025");
  const [startTime, setStartTime] = useState("9:00 AM");
  const [endDate, setEndDate] = useState("JAN 7, 2025");
  const [endTime, setEndTime] = useState("10:00 AM");
  const [repeat, setRepeat] = useState("Every Day");
  const [alertTime, setAlertTime] = useState("10 min");
  const [sound, setSound] = useState("Waves");
  const [light, setLight] = useState("No Light");
  const [vibration, setVibration] = useState("60Hz (slow)");

  const handleCancel = () => {
    navigation.goBack();
  };

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a title for your event");
      return;
    }

    Alert.alert("Event Saved", `"${title}" has been added to your schedule`, [
      { text: "OK", onPress: () => navigation.navigate("CalendarScreen") },
    ]);
  };

  const repeatOptions = ["Never", "Daily", "Every Day", "Weekly", "Monthly"];
  const soundOptions = ["None", "Waves", "Chimes", "Birds", "Rain"];
  const lightOptions = ["No Light", "Soft White", "Blue", "Green", "Purple"];
  const vibrationOptions = [
    "None",
    "30Hz (fast)",
    "60Hz (slow)",
    "120Hz (medium)",
  ];

  const renderDropdown = (
    value: string,
    options: string[],
    onSelect: (value: string) => void,
    style?: any
  ) => (
    <TouchableOpacity style={[styles.dropdown, style]}>
      <Text style={styles.dropdownText}>{value}</Text>
      <Text style={styles.dropdownArrow}>▼</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#f8fafc" barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Photo Section */}
        <View style={styles.photoSection}>
          <View style={styles.photoPlaceholder}>
            <View style={styles.cameraIcon}>
              <Text style={styles.cameraIconText}>📷</Text>
            </View>
          </View>
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          {/* Title */}
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.textInput}
              placeholder="Title"
              placeholderTextColor="#60a5fa"
              value={title}
              onChangeText={setTitle}
            />
            <View style={styles.inputUnderline} />
          </View>

          {/* Location */}
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.textInput}
              placeholder="Location"
              placeholderTextColor="#60a5fa"
              value={location}
              onChangeText={setLocation}
            />
            <View style={styles.inputUnderline} />
          </View>

          {/* Start Time */}
          <View style={styles.dateTimeRow}>
            <Text style={styles.label}>Starts</Text>
            <View style={styles.dateTimeInputs}>
              <TouchableOpacity style={styles.dateInput}>
                <Text style={styles.dateTimeText}>{startDate}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.timeInput}>
                <Text style={styles.dateTimeText}>{startTime}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.inputUnderline} />

          {/* End Time */}
          <View style={styles.dateTimeRow}>
            <Text style={styles.label}>Ends</Text>
            <View style={styles.dateTimeInputs}>
              <TouchableOpacity style={styles.dateInput}>
                <Text style={styles.dateTimeText}>{endDate}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.timeInput}>
                <Text style={styles.dateTimeText}>{endTime}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.inputUnderline} />

          {/* Repeat */}
          <View style={styles.settingRow}>
            <Text style={styles.label}>Repeat</Text>
            {renderDropdown(
              repeat,
              repeatOptions,
              setRepeat,
              styles.repeatDropdown
            )}
          </View>
          <View style={styles.inputUnderline} />

          {/* Alert */}
          <View style={styles.alertSection}>
            <View style={styles.alertRow}>
              <Text style={styles.alertLabel}>Alert 1</Text>
              <Text style={styles.alertTime}>{alertTime}</Text>
            </View>
          </View>

          {/* Sound */}
          <View style={styles.settingRow}>
            <Text style={styles.label}>Sound</Text>
            {renderDropdown(
              sound,
              soundOptions,
              setSound,
              styles.settingDropdown
            )}
          </View>
          <View style={styles.inputUnderline} />

          {/* Light */}
          <View style={styles.settingRow}>
            <Text style={styles.label}>Light</Text>
            {renderDropdown(
              light,
              lightOptions,
              setLight,
              styles.lightDropdown
            )}
          </View>
          <View style={styles.inputUnderline} />

          {/* Vibration */}
          <View style={styles.settingRow}>
            <Text style={styles.label}>Vibration</Text>
            {renderDropdown(
              vibration,
              vibrationOptions,
              setVibration,
              styles.settingDropdown
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1e293b",
  },
  saveText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1e293b",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  photoSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#cbd5e1",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraIcon: {
    justifyContent: "center",
    alignItems: "center",
  },
  cameraIconText: {
    fontSize: 32,
    color: "#ffffff",
  },
  formSection: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 24,
  },
  textInput: {
    fontSize: 16,
    color: "#1e293b",
    paddingVertical: 12,
  },
  inputUnderline: {
    height: 1,
    backgroundColor: "#60a5fa",
    marginTop: 4,
  },
  dateTimeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1e293b",
  },
  dateTimeInputs: {
    flexDirection: "row",
    gap: 16,
  },
  dateInput: {
    backgroundColor: "#dbeafe",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  timeInput: {
    backgroundColor: "#dbeafe",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  dateTimeText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1e293b",
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#60a5fa",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#ffffff",
  },
  dropdownArrow: {
    fontSize: 10,
    color: "#ffffff",
  },
  repeatDropdown: {
    backgroundColor: "#60a5fa",
  },
  settingDropdown: {
    backgroundColor: "#60a5fa",
  },
  lightDropdown: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#1e293b",
  },
  alertSection: {
    backgroundColor: "#dbeafe",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  alertRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  alertLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1e293b",
  },
  alertTime: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1e293b",
  },
});

export default EventCreation;
