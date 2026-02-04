import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  FlatList,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useCalendar } from "../contexts/CalendarContext";
import { useBluetooth } from "../contexts/BluetoothContext";
import { CalendarEvent } from "../services/calendarService";

interface EventFormProps {
  mode: "create" | "edit";
  existingEvent?: CalendarEvent;
  onSave: () => void;
  onCancel: () => void;
  visible: boolean;
}

const EventForm: React.FC<EventFormProps> = ({
  mode,
  existingEvent,
  onSave,
  onCancel,
  visible,
}) => {
  const {
    addEvent,
    updateEvent,
    deleteEvent,
    kids,
    assignEventToDevices,
    unassignEventFromDevices,
  } = useCalendar();
  const { registeredDevices } = useBluetooth();

  // Basic event details
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 60 * 60 * 1000)); // 1 hour later

  // Alert settings
  const [alertIntervals, setAlertIntervals] = useState<number[]>([15, 10, 5]); // Default alerts
  const [selectedKidId, setSelectedKidId] = useState<string | undefined>(
    undefined
  );
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);

  // Modal states
  const [showKidSelector, setShowKidSelector] = useState(false);
  const [showAlertSelector, setShowAlertSelector] = useState(false);
  const [showDateTimePicker, setShowDateTimePicker] = useState<
    "start" | "end" | null
  >(null);

  // Temporary state for date/time picker to prevent reverting
  const [tempPickerValue, setTempPickerValue] = useState<Date>(() => {
    // Initialize with current time, will be updated when picker opens
    return new Date();
  });

  // Ref to track if we're currently in a picker session
  const pickerSessionRef = useRef<boolean>(false);

  // Auto-populate form when editing an existing event
  useEffect(() => {
    if (mode === "edit" && existingEvent) {
      setTitle(existingEvent.title);
      setStartDate(
        existingEvent.startTime instanceof Date
          ? existingEvent.startTime
          : new Date(existingEvent.startTime)
      );
      setEndDate(
        existingEvent.endTime instanceof Date
          ? existingEvent.endTime
          : new Date(existingEvent.endTime)
      );
      setAlertIntervals(existingEvent.alertIntervals || []);
      setSelectedKidId(existingEvent.assignedKidId || undefined);
      setSelectedDeviceIds(existingEvent.assignedDeviceIds || []);
    } else {
      // Reset form for create mode
      setTitle("");
      const now = new Date();
      setStartDate(now);
      setEndDate(new Date(now.getTime() + 60 * 60 * 1000));
      setAlertIntervals([15, 10, 5]);
      setSelectedKidId(undefined);
      setSelectedDeviceIds([]);
    }
  }, [mode, existingEvent, visible]);

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
      const eventData: Omit<CalendarEvent, "id" | "lastModified"> = {
        title: title.trim(),
        startTime: startDate,
        endTime: endDate,
        alertIntervals,
        isActive: true,
        assignedKidId: selectedKidId,
        assignedDeviceIds:
          selectedDeviceIds.length > 0 ? selectedDeviceIds : undefined,
        source: "manual",
      };

      // Warn if no kid is assigned but still allow saving
      if (!selectedKidId) {
        console.warn(
          `⚠️ Event ${
            mode === "edit" ? "updated" : "created"
          } without assigned kid:`,
          title
        );
      }

      if (mode === "edit" && existingEvent) {
        await updateEvent(existingEvent.id, eventData);

        // Handle device assignment changes
        const previousDeviceIds = existingEvent.assignedDeviceIds || [];
        const removedDevices = previousDeviceIds.filter(
          (id) => !selectedDeviceIds.includes(id)
        );
        const addedDevices = selectedDeviceIds.filter(
          (id) => !previousDeviceIds.includes(id)
        );

        if (removedDevices.length > 0) {
          await unassignEventFromDevices(existingEvent.id, removedDevices);
        }
        if (addedDevices.length > 0) {
          await assignEventToDevices(existingEvent.id, addedDevices);
        }
      } else {
        const newEvent = await addEvent(eventData);

        // Assign to selected devices if any
        if (selectedDeviceIds.length > 0) {
          await assignEventToDevices(newEvent.id, selectedDeviceIds);
        }
      }

      // Close modal on successful save
      onSave();
    } catch (error) {
      Alert.alert(
        "Error",
        `Failed to ${
          mode === "edit" ? "update" : "create"
        } event. Please try again.`
      );
      console.error(
        `Error ${mode === "edit" ? "updating" : "creating"} event:`,
        error
      );
    }
  };

  const handleDelete = async () => {
    if (mode !== "edit" || !existingEvent) return;

    Alert.alert(
      "Delete Event",
      `Are you sure you want to delete "${existingEvent.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Delete the event from Firebase and update devices
              await deleteEvent(existingEvent.id);
              // Close modal on successful delete
              onSave();
            } catch (error) {
              Alert.alert("Error", "Failed to delete event. Please try again.");
              console.error("Error deleting event:", error);
            }
          },
        },
      ]
    );
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

  // Get available devices from registeredDevices
  const availableDevices = registeredDevices.map((device) => ({
    id: device.id,
    name: device.nickname || "Unknown Device",
  }));

  const toggleDeviceSelection = (deviceId: string) => {
    setSelectedDeviceIds((prev) =>
      prev.includes(deviceId)
        ? prev.filter((id) => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  const alertOptions = [1, 2, 5, 10, 15, 30, 60]; // minutes

  const toggleAlertInterval = (interval: number) => {
    setAlertIntervals(
      (prev) =>
        prev.includes(interval)
          ? prev.filter((i) => i !== interval)
          : [...prev, interval].sort((a, b) => b - a) // Sort descending
    );
  };

  const handleDateTimeChange = (event: any, selectedDate?: Date) => {
    // Always update the temporary picker value when user scrolls
    if (selectedDate && pickerSessionRef.current) {
      console.log(
        "Picker value changing to:",
        selectedDate.toLocaleTimeString()
      );
      setTempPickerValue(selectedDate);
    } else if (!pickerSessionRef.current) {
      console.log("Picker session not active, ignoring change");
    }
  };

  const closeDateTimePicker = () => {
    // Apply the temporary value to the actual state when closing
    if (showDateTimePicker === "start") {
      setStartDate(tempPickerValue);
      // Auto-adjust end time if it's before the new start time
      if (tempPickerValue >= endDate) {
        const newEndTime = new Date(tempPickerValue.getTime() + 60 * 60 * 1000); // Add 1 hour
        setEndDate(newEndTime);
      }
    } else if (showDateTimePicker === "end") {
      setEndDate(tempPickerValue);
    }

    pickerSessionRef.current = false;
    setShowDateTimePicker(null);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {mode === "edit" ? "Edit Event" : "New Event"}
          </Text>
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
          </View>

          {/* Date & Time Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Date & Time</Text>

            {/* Start Time */}
            <View style={styles.dateTimeRow}>
              <Text style={styles.label}>Starts</Text>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => {
                  const initialValue = startDate || new Date();
                  console.log(
                    "Opening start time picker with value:",
                    initialValue.toLocaleTimeString()
                  );
                  setTempPickerValue(initialValue);
                  pickerSessionRef.current = true;
                  setShowDateTimePicker("start");
                }}
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
                onPress={() => {
                  const initialValue = endDate || new Date();
                  console.log(
                    "Opening end time picker with value:",
                    initialValue.toLocaleTimeString()
                  );
                  setTempPickerValue(initialValue);
                  pickerSessionRef.current = true;
                  setShowDateTimePicker("end");
                }}
              >
                <Text style={styles.dateTimeText}>
                  {formatDateTime(endDate)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Assignment Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Assignment</Text>

            {/* <TouchableOpacity
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
            )} */}

            {/* Device Assignment */}
            {availableDevices.length > 0 && (
              <View style={styles.deviceAssignmentContainer}>
                <Text style={styles.label}>Send schedule to:</Text>
                <View style={styles.checkboxContainer}>
                  {availableDevices.map((device) => (
                    <TouchableOpacity
                      key={device.id}
                      style={styles.checkboxRow}
                      onPress={() => toggleDeviceSelection(device.id)}
                    >
                      <View style={styles.checkbox}>
                        {selectedDeviceIds.includes(device.id) && (
                          <Text style={styles.checkboxCheck}>✓</Text>
                        )}
                      </View>
                      <Text style={styles.checkboxLabel}>{device.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {selectedDeviceIds.length > 0 && (
                  <Text style={styles.assignmentHint}>
                    Schedule will sync to {selectedDeviceIds.length} device
                    {selectedDeviceIds.length > 1 ? "s" : ""}
                  </Text>
                )}
              </View>
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

          {/* Delete Button (only in edit mode) */}
          {mode === "edit" && (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDelete}
              >
                <Text style={styles.deleteButtonText}>Delete Event</Text>
              </TouchableOpacity>
            </View>
          )}

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

              {kids && kids.length > 0 ? (
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
                          selectedKidId === item.id &&
                            styles.selectedModalItemText,
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
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    No children added yet. Add a child in your profile settings.
                  </Text>
                </View>
              )}
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

        {/* Date/Time Picker Modal */}
        <Modal
          visible={showDateTimePicker !== null}
          transparent={true}
          animationType="fade"
        >
          <TouchableOpacity
            style={styles.dateTimeModalOverlay}
            activeOpacity={1}
            onPress={closeDateTimePicker}
          >
            <View style={styles.dateTimeModalContainer}>
              <TouchableOpacity
                activeOpacity={1}
                onPress={(e) => e.stopPropagation()}
              >
                <View style={styles.dateTimePickerHeader}>
                  <Text style={styles.dateTimePickerTitle}>
                    Select {showDateTimePicker === "start" ? "Start" : "End"}{" "}
                    Time
                  </Text>
                  <TouchableOpacity onPress={closeDateTimePicker}>
                    <Text style={styles.dateTimePickerDone}>Done</Text>
                  </TouchableOpacity>
                </View>

                {showDateTimePicker && (
                  <DateTimePicker
                    value={
                      tempPickerValue ||
                      (showDateTimePicker === "start" ? startDate : endDate) ||
                      new Date()
                    }
                    mode="datetime"
                    display="spinner"
                    onChange={handleDateTimeChange}
                    maximumDate={new Date(2030, 11, 31)}
                    style={styles.dateTimePicker}
                  />
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </Modal>
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
  deviceAssignmentContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
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
  deleteButton: {
    backgroundColor: "#ef4444",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  deleteButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
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
  previewLocation: {
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
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 24,
  },
  dateTimeModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  dateTimeModalContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    margin: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 300,
  },
  dateTimePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  dateTimePickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
  },
  dateTimePickerDone: {
    fontSize: 16,
    color: "#3b82f6",
    fontWeight: "600",
  },
  dateTimePicker: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  checkboxContainer: {
    marginTop: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    overflow: "hidden",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: "#3b82f6",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    backgroundColor: "#ffffff",
  },
  checkboxCheck: {
    fontSize: 16,
    color: "#3b82f6",
    fontWeight: "600",
  },
  checkboxLabel: {
    fontSize: 16,
    color: "#1f2937",
    flex: 1,
  },
});

export default EventForm;
