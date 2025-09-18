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
  Modal,
  FlatList,
} from "react-native";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useCalendar } from "../contexts/CalendarContext";
import { CalendarEvent } from "../services/calendarService";

const EventCreation = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { addEvent, kids } = useCalendar();

  // Basic event details
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 60 * 60 * 1000)); // 1 hour later

  // Alert settings
  const [alertIntervals, setAlertIntervals] = useState<number[]>([15, 10, 5]); // Default alerts
  const [selectedKidId, setSelectedKidId] = useState<string | undefined>(
    undefined
  );

  // Modal states
  const [showKidSelector, setShowKidSelector] = useState(false);
  const [showAlertSelector, setShowAlertSelector] = useState(false);
  const [showDateTimePicker, setShowDateTimePicker] = useState<
    "start" | "end" | null
  >(null);

  const handleCancel = () => {
    navigation.goBack();
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a title for your event");
      return;
    }

    if (startDate >= endDate) {
      Alert.alert("Error", "End time must be after start time");
      return;
    }

    try {
      const newEvent: Omit<CalendarEvent, "id" | "lastModified"> = {
        title: title.trim(),
        startTime: startDate,
        endTime: endDate,
        alertIntervals,
        isActive: true,
        assignedKidId: selectedKidId,
        source: "manual",
      };

      await addEvent(newEvent);

      Alert.alert(
        "Event Created",
        `"${title}" has been added to your schedule${
          selectedKidId ? " and will send alerts to the assigned child" : ""
        }`,
        [{ text: "OK", onPress: () => navigation.navigate("CalendarScreen") }]
      );
    } catch (error) {
      Alert.alert("Error", "Failed to create event. Please try again.");
      console.error("Error creating event:", error);
    }
  };

  const formatDateTime = (date: Date): string => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const selectedKid = kids.find((k) => k.id === selectedKidId);

  const alertOptions = [1, 2, 5, 10, 15, 30, 60]; // minutes

  const toggleAlertInterval = (interval: number) => {
    setAlertIntervals(
      (prev) =>
        prev.includes(interval)
          ? prev.filter((i) => i !== interval)
          : [...prev, interval].sort((a, b) => b - a) // Sort descending
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#f8fafc" barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Event</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Event Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event Details</Text>

          {/* Title */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Title *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter event title"
              placeholderTextColor="#9ca3af"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Location */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Location</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter location (optional)"
              placeholderTextColor="#9ca3af"
              value={location}
              onChangeText={setLocation}
            />
          </View>
        </View>

        {/* Date & Time Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date & Time</Text>

          {/* Start Time */}
          <View style={styles.dateTimeRow}>
            <Text style={styles.label}>Starts</Text>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowDateTimePicker("start")}
            >
              <Text style={styles.dateTimeText}>
                {formatDateTime(startDate)}
              </Text>
            </TouchableOpacity>
          </View>

          {/* End Time */}
          <View style={styles.dateTimeRow}>
            <Text style={styles.label}>Ends</Text>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowDateTimePicker("end")}
            >
              <Text style={styles.dateTimeText}>{formatDateTime(endDate)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Assignment Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assignment</Text>

          <TouchableOpacity
            style={styles.assignmentButton}
            onPress={() => setShowKidSelector(true)}
          >
            <Text style={styles.label}>Assigned to</Text>
            <View style={styles.assignmentValue}>
              <Text style={styles.assignmentText}>
                {selectedKid ? selectedKid.name : "No child assigned"}
              </Text>
              <Text style={styles.dropdownArrow}>›</Text>
            </View>
          </TouchableOpacity>

          {selectedKid && (
            <Text style={styles.assignmentHint}>
              Alerts will be sent to {selectedKid.name}'s device
            </Text>
          )}
        </View>

        {/* Alert Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alert Settings</Text>

          <TouchableOpacity
            style={styles.alertButton}
            onPress={() => setShowAlertSelector(true)}
          >
            <Text style={styles.label}>Alert intervals</Text>
            <View style={styles.alertValue}>
              <Text style={styles.alertText}>
                {alertIntervals.length > 0
                  ? `${alertIntervals.join(", ")} minutes before`
                  : "No alerts"}
              </Text>
              <Text style={styles.dropdownArrow}>›</Text>
            </View>
          </TouchableOpacity>

          {alertIntervals.length > 0 && (
            <Text style={styles.alertHint}>
              {alertIntervals.length} alert
              {alertIntervals.length > 1 ? "s" : ""} will be sent before the
              event
            </Text>
          )}
        </View>

        {/* Preview Section */}
        {title && (
          <View style={styles.previewSection}>
            <Text style={styles.sectionTitle}>Preview</Text>
            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>{title}</Text>
              <Text style={styles.previewTime}>
                {formatDate(startDate)} • {formatTime(startDate)} -{" "}
                {formatTime(endDate)}
              </Text>
              {selectedKid && (
                <Text style={styles.previewAssignment}>
                  → {selectedKid.name}
                </Text>
              )}
              {alertIntervals.length > 0 && (
                <Text style={styles.previewAlerts}>
                  🔔 {alertIntervals.join(", ")} min before
                </Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Kid Selector Modal */}
      <Modal visible={showKidSelector} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign to Child</Text>
              <TouchableOpacity onPress={() => setShowKidSelector(false)}>
                <Text style={styles.modalClose}>×</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={[{ id: undefined, name: "No assignment" }, ...kids]}
              keyExtractor={(item) => item.id || "none"}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    selectedKidId === item.id && styles.selectedModalItem,
                  ]}
                  onPress={() => {
                    setSelectedKidId(item.id);
                    setShowKidSelector(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      selectedKidId === item.id && styles.selectedModalItemText,
                    ]}
                  >
                    {item.name}
                  </Text>
                  {selectedKidId === item.id && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Alert Selector Modal */}
      <Modal visible={showAlertSelector} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Alert Intervals</Text>
              <TouchableOpacity onPress={() => setShowAlertSelector(false)}>
                <Text style={styles.modalClose}>Done</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Select when to send alerts before the event starts:
            </Text>

            <FlatList
              data={alertOptions}
              keyExtractor={(item) => item.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    alertIntervals.includes(item) && styles.selectedModalItem,
                  ]}
                  onPress={() => toggleAlertInterval(item)}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      alertIntervals.includes(item) &&
                        styles.selectedModalItemText,
                    ]}
                  >
                    {item} minute{item > 1 ? "s" : ""} before
                  </Text>
                  {alertIntervals.includes(item) && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "#f8fafc",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
  },
  cancelText: {
    fontSize: 16,
    color: "#6b7280",
  },
  saveText: {
    fontSize: 16,
    color: "#3b82f6",
    fontWeight: "600",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1f2937",
  },
  dateTimeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    color: "#374151",
    fontWeight: "500",
  },
  dateTimeButton: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 180,
  },
  dateTimeText: {
    fontSize: 16,
    color: "#1f2937",
    textAlign: "right",
  },
  assignmentButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  assignmentValue: {
    flexDirection: "row",
    alignItems: "center",
  },
  assignmentText: {
    fontSize: 16,
    color: "#1f2937",
    marginRight: 8,
  },
  assignmentHint: {
    fontSize: 14,
    color: "#6b7280",
    fontStyle: "italic",
  },
  alertButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  alertValue: {
    flexDirection: "row",
    alignItems: "center",
  },
  alertText: {
    fontSize: 16,
    color: "#1f2937",
    marginRight: 8,
  },
  alertHint: {
    fontSize: 14,
    color: "#6b7280",
    fontStyle: "italic",
  },
  dropdownArrow: {
    fontSize: 16,
    color: "#9ca3af",
  },
  previewSection: {
    marginTop: 16,
    marginBottom: 32,
  },
  previewCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 16,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
  },
  previewTime: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 4,
  },
  previewAssignment: {
    fontSize: 14,
    color: "#3b82f6",
    marginBottom: 4,
  },
  previewAlerts: {
    fontSize: 14,
    color: "#059669",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
  },
  modalClose: {
    fontSize: 24,
    color: "#6b7280",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  modalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  selectedModalItem: {
    backgroundColor: "#eff6ff",
  },
  modalItemText: {
    fontSize: 16,
    color: "#1f2937",
  },
  selectedModalItemText: {
    color: "#3b82f6",
    fontWeight: "500",
  },
  checkmark: {
    fontSize: 16,
    color: "#3b82f6",
    fontWeight: "600",
  },
});

export default EventCreation;
