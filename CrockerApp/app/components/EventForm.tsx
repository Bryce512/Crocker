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
  Image,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { launchImageLibrary, launchCamera } from "react-native-image-picker";
import { useCalendar } from "../contexts/CalendarContext";
import { useBluetooth } from "../contexts/BluetoothContext";
import { CalendarEvent } from "../services/calendarService";
import {
  uploadImageToFirebaseStorage,
  processImageForDevice,
  validateImageSize,
  getImageDownloadUrl,
  compressImageForDevice,
} from "../services/imageService";
import {
  sendImageToDevice,
  getConnectedDevices,
} from "../services/bluetoothService";
import firebaseService from "../services/firebaseService";

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
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageTransferProgress, setImageTransferProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [transferCancelToken, setTransferCancelToken] = useState<{
    cancelled: boolean;
  } | null>(null);

  // Alert settings
  const [alertIntervals, setAlertIntervals] = useState<number[]>([15, 10, 5]); // Default alerts
  const [selectedKidId, setSelectedKidId] = useState<string | undefined>(
    undefined,
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
          : new Date(existingEvent.startTime),
      );
      setEndDate(
        existingEvent.endTime instanceof Date
          ? existingEvent.endTime
          : new Date(existingEvent.endTime),
      );
      setAlertIntervals(existingEvent.alertIntervals || []);
      setSelectedKidId(existingEvent.assignedKidId || undefined);
      setSelectedDeviceIds(existingEvent.assignedDeviceIds || []);
      setSelectedImageUri(null);

      // Load existing image if present
      if (existingEvent.imageStoragePath) {
        setIsLoadingImage(true);
        getImageDownloadUrl(existingEvent.imageStoragePath)
          .then((url) => {
            console.log("✅ Loaded existing image URL");
            setExistingImageUrl(url);
          })
          .catch((error) => {
            console.error("❌ Error loading existing image:", error);
            setExistingImageUrl(null);
          })
          .finally(() => setIsLoadingImage(false));
      } else {
        setExistingImageUrl(null);
      }
    } else {
      // Reset form for create mode
      setTitle("");
      const now = new Date();
      setStartDate(now);
      setEndDate(new Date(now.getTime() + 60 * 60 * 1000));
      setAlertIntervals([15, 10, 5]);
      setSelectedKidId(undefined);
      setSelectedDeviceIds([]);
      setSelectedImageUri(null);
      setExistingImageUrl(null);
    }
  }, [mode, existingEvent, visible]);

  // Request camera permissions (iOS doesn't need explicit request, but Android does)
  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS === "android") {
      try {
        const permission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: "Camera Permission",
            message: "This app needs camera access to take photos",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK",
          },
        );
        return permission === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.error("❌ Camera permission error:", err);
        return false;
      }
    }
    // iOS uses Info.plist configuration and will prompt automatically
    return true;
  };

  const handlePickImage = () => {
    Alert.alert("Add Image", "Choose an option", [
      {
        text: "Take Photo",
        onPress: async () => {
          try {
            console.log("🎥 Take Photo pressed");
            const hasPermission = await requestCameraPermission();
            console.log("🎥 Permission result:", hasPermission);

            if (!hasPermission) {
              Alert.alert("Permission Denied", "Camera permission is required");
              return;
            }

            console.log("🎥 About to call launchCamera...");
            launchCamera({ mediaType: "photo", quality: 0.9 }, (response) => {
              console.log("🎥 Camera callback fired");
              if (response.errorCode) {
                console.error("Camera error:", response.errorCode);
                return;
              }
              if (response.didCancel) {
                console.log("Camera cancelled");
                return;
              }
              if (response.assets && response.assets[0]) {
                console.log("Photo selected:", response.assets[0].uri);
                setSelectedImageUri(response.assets[0].uri || null);
              }
            });
          } catch (error) {
            console.error("❌ Camera JS error caught:", error);
            console.error("   Error message:", (error as any)?.message);
            console.error("   Error code:", (error as any)?.code);
            Alert.alert(
              "Error",
              `Camera failed: ${(error as any)?.message || "Unknown error"}`,
            );
          }
        },
      },
      {
        text: "Choose from Gallery",
        onPress: async () => {
          try {
            launchImageLibrary(
              { mediaType: "photo", quality: 0.8 },
              (response) => {
                if (response.errorCode) {
                  console.error("Gallery error:", response.errorCode);
                  return;
                }
                if (response.didCancel) {
                  console.log("Gallery cancelled");
                  return;
                }
                if (response.assets && response.assets[0]) {
                  console.log("Photo selected:", response.assets[0].uri);
                  setSelectedImageUri(response.assets[0].uri || null);
                }
              },
            );
          } catch (error) {
            console.error("Gallery error:", error);
            Alert.alert("Error", "Failed to access gallery");
          }
        },
      },
      {
        text: "Remove Image",
        onPress: () => setSelectedImageUri(null),
        style: "destructive",
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ]);
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
      let imageStoragePath: string | undefined = undefined;

      // Upload image if selected
      if (selectedImageUri) {
        setIsUploadingImage(true);
        console.log("📤 Uploading image to Firebase Storage...");

        try {
          const user = firebaseService.getCurrentUser();
          if (!user) {
            throw new Error("User not authenticated");
          }

          // For new events, we'll upload with the real ID after creating the event
          // For edit mode, use the existing event ID
          const storageEventId = existingEvent?.id || null;

          if (storageEventId) {
            // Editing - upload with the existing event ID
            imageStoragePath = await uploadImageToFirebaseStorage(
              selectedImageUri,
              user.uid,
              storageEventId,
            );
          } else {
            // Creating - we'll upload after getting the real event ID
            // For now, just mark that we have an image to upload
            imageStoragePath = undefined; // Will be set after event creation
          }

          console.log("✅ Image upload initiated");
        } catch (uploadError) {
          console.error("Error uploading image:", uploadError);
          Alert.alert(
            "Upload Error",
            "Failed to upload image. Please try again.",
          );
          setIsUploadingImage(false);
          return;
        }
      }

      // Process image for device transmission if NEW image was selected
      // Only compress LOCAL images (from image picker), not existing Firebase URLs
      let compressedImageData: number[] | undefined;
      if (selectedImageUri) {
        try {
          console.log(
            "📸 Converting image to RGB565 for device transmission...",
          );
          console.log(`   Original URI: ${selectedImageUri}`);
          // Convert to RGB565 binary format for device - 480x480
          compressedImageData = await compressImageForDevice(selectedImageUri);
          console.log(
            `✅ Image conversion succeeded (${compressedImageData.length} bytes)`,
          );
        } catch (processError) {
          console.error(
            "❌ Error converting image for device transmission:",
            processError,
          );
          Alert.alert(
            "Image Conversion Error",
            "Could not convert image to RGB565 for device transmission, but event was saved to Firebase.",
          );
          compressedImageData = undefined;
          // Don't fail the save, just log the warning
        }
      } else {
        console.log("ℹ️ No image to convert for device transmission");
      }

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
        imageStoragePath, // Store Firebase Storage path
      };

      // Warn if no kid is assigned but still allow saving
      if (!selectedKidId) {
        console.warn(
          `⚠️ Event ${
            mode === "edit" ? "updated" : "created"
          } without assigned kid:`,
          title,
        );
      }

      if (mode === "edit" && existingEvent) {
        await updateEvent(existingEvent.id, eventData);

        // Handle device assignment changes
        const previousDeviceIds = existingEvent.assignedDeviceIds || [];
        const removedDevices = previousDeviceIds.filter(
          (id) => !selectedDeviceIds.includes(id),
        );
        const addedDevices = selectedDeviceIds.filter(
          (id) => !previousDeviceIds.includes(id),
        );

        if (removedDevices.length > 0) {
          await unassignEventFromDevices(existingEvent.id, removedDevices);
        }
        if (addedDevices.length > 0) {
          await assignEventToDevices(existingEvent.id, addedDevices);
        }

        // Send image to devices if image was changed (upload to Firebase or from existing)
        // Send to ALL assigned devices, not just newly added ones
        const imageChanged =
          selectedImageUri !== null ||
          (existingImageUrl && !existingEvent.imageStoragePath);
        if (
          compressedImageData &&
          imageChanged &&
          selectedDeviceIds.length > 0
        ) {
          console.log(`📤 Image changed - sending to assigned device(s)...`);
          console.log(`   RGB565 Data: ${compressedImageData.length} bytes`);
          console.log(`   Device IDs: ${selectedDeviceIds.join(", ")}`);

          // Check which devices are actually connected
          const connectedResponse = await getConnectedDevices();
          const connectedDeviceIds = connectedResponse.success
            ? connectedResponse.data.map((d) => d.id)
            : [];
          console.log(`   Connected devices: ${connectedDeviceIds.join(", ")}`);

          const deviceIdsToSendTo = selectedDeviceIds.filter((id) =>
            connectedDeviceIds.includes(id),
          );

          if (deviceIdsToSendTo.length === 0) {
            console.warn(
              `⚠️ None of the assigned devices are currently connected. Skipping image transmission.`,
            );
            Alert.alert(
              "Devices Offline",
              "None of the assigned devices are connected. Tap a device to connect and retry.",
            );
          } else {
            const skippedCount =
              selectedDeviceIds.length - deviceIdsToSendTo.length;
            if (skippedCount > 0) {
              console.log(`   Skipping ${skippedCount} offline device(s)`);
            }

            // Create cancel token for this transfer
            const cancelToken = { cancelled: false };
            setTransferCancelToken(cancelToken);

            for (const deviceId of deviceIdsToSendTo) {
              try {
                setImageTransferProgress({ current: 0, total: 1 }); // Start progress
                const result = await sendImageToDevice(
                  deviceId,
                  compressedImageData,
                  `/${title.toLowerCase().replace(/\s+/g, "-")}.rgb565`,
                  title,
                  (current, total) => {
                    setImageTransferProgress({ current, total });
                  },
                  cancelToken,
                );
                if (result.success) {
                  console.log(`✅ Image sent to device ${deviceId}`);
                } else {
                  console.warn(
                    `⚠️ Failed to send image to device ${deviceId}: ${result.error}`,
                  );
                }
              } catch (sendError) {
                console.error(
                  `❌ Error sending image to device ${deviceId}:`,
                  sendError,
                );
              } finally {
                setImageTransferProgress(null); // Clear progress
                setTransferCancelToken(null); // Clear cancel token
              }
            }
          }
        } else {
          if (!compressedImageData) {
            console.log(
              "ℹ️ No RGB565 image data available - skipping device transmission",
            );
          }
          if (!imageChanged) {
            console.log("ℹ️ Image not changed - skipping device transmission");
          }
          if (selectedDeviceIds.length === 0) {
            console.log("ℹ️ No devices assigned - skipping image transmission");
          }
        }
      } else {
        const newEvent = await addEvent(eventData);

        // Now upload image with the real event ID (if we have an image to upload)
        if (selectedImageUri && !imageStoragePath) {
          const user = firebaseService.getCurrentUser();
          if (user) {
            try {
              console.log(
                `📤 Uploading image with real event ID ${newEvent.id}...`,
              );
              imageStoragePath = await uploadImageToFirebaseStorage(
                selectedImageUri,
                user.uid,
                newEvent.id,
              );
              console.log(`✅ Image uploaded successfully`);
              // Update event with the image path
              await updateEvent(newEvent.id, {
                ...eventData,
                imageStoragePath,
              });
            } catch (uploadError) {
              console.warn(
                "Could not upload image after event creation:",
                uploadError,
              );
              // Event was created successfully, just image upload failed
            }
          }
        }

        // Assign to selected devices if any
        if (selectedDeviceIds.length > 0) {
          await assignEventToDevices(newEvent.id, selectedDeviceIds);
        }

        // Send image to devices if image was changed
        // Send to ALL assigned devices if image exists
        const imageChanged =
          selectedImageUri !== null ||
          (existingImageUrl && !existingEvent.imageStoragePath);
        if (
          compressedImageData &&
          imageChanged &&
          selectedDeviceIds.length > 0
        ) {
          console.log(
            `📤 Image changed - sending RGB565 image to assigned device(s)...`,
          );
          console.log(`   RGB565 Data: ${compressedImageData.length} bytes`);
          console.log(`   Device IDs: ${selectedDeviceIds.join(", ")}`);

          // Check which devices are actually connected
          const connectedResponse = await getConnectedDevices();
          const connectedDeviceIds = connectedResponse.success
            ? connectedResponse.data.map((d) => d.id)
            : [];
          console.log(`   Connected devices: ${connectedDeviceIds.join(", ")}`);

          const deviceIdsToSendTo = selectedDeviceIds.filter((id) =>
            connectedDeviceIds.includes(id),
          );

          if (deviceIdsToSendTo.length === 0) {
            console.warn(
              `⚠️ None of the assigned devices are currently connected. Skipping image transmission.`,
            );
            Alert.alert(
              "Devices Offline",
              "None of the assigned devices are connected. Tap a device to connect and retry.",
            );
          } else {
            const skippedCount =
              selectedDeviceIds.length - deviceIdsToSendTo.length;
            if (skippedCount > 0) {
              console.log(`   Skipping ${skippedCount} offline device(s)`);
            }

            // Create cancel token for this transfer
            const cancelToken = { cancelled: false };
            setTransferCancelToken(cancelToken);

            for (const deviceId of deviceIdsToSendTo) {
              try {
                setImageTransferProgress({ current: 0, total: 1 }); // Start progress
                const result = await sendImageToDevice(
                  deviceId,
                  compressedImageData,
                  `${title.toLowerCase().replace(/\s+/g, "-")}.rgb565`,
                  title,
                  (current, total) => {
                    setImageTransferProgress({ current, total });
                  },
                  cancelToken,
                );
                if (result.success) {
                  console.log(`✅ Image sent to device ${deviceId}`);
                } else {
                  console.warn(
                    `⚠️ Failed to send image to device ${deviceId}: ${result.error}`,
                  );
                }
              } catch (sendError) {
                console.error(
                  `❌ Error sending image to device ${deviceId}:`,
                  sendError,
                );
              } finally {
                setImageTransferProgress(null); // Clear progress
                setTransferCancelToken(null); // Clear cancel token
              }
            }
          }
        } else {
          if (!compressedImageData) {
            console.log(
              "ℹ️ No RGB565 image data available - skipping device transmission",
            );
          }
          if (!imageChanged) {
            console.log("ℹ️ Image not changed - skipping device transmission");
          }
          if (selectedDeviceIds.length === 0) {
            console.log("ℹ️ No devices assigned - skipping image transmission");
          }
        }
      }

      // Close modal on successful save
      setIsUploadingImage(false);
      onSave();
    } catch (error) {
      setIsUploadingImage(false);
      Alert.alert(
        "Error",
        `Failed to ${
          mode === "edit" ? "update" : "create"
        } event. Please try again.`,
      );
      console.error(
        `Error ${mode === "edit" ? "updating" : "creating"} event:`,
        error,
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
      ],
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
        : [...prev, deviceId],
    );
  };

  const alertOptions = [1, 2, 5, 10, 15, 30, 60]; // minutes

  const toggleAlertInterval = (interval: number) => {
    setAlertIntervals(
      (prev) =>
        prev.includes(interval)
          ? prev.filter((i) => i !== interval)
          : [...prev, interval].sort((a, b) => b - a), // Sort descending
    );
  };

  const handleDateTimeChange = (event: any, selectedDate?: Date) => {
    // Always update the temporary picker value when user scrolls
    if (selectedDate && pickerSessionRef.current) {
      console.log(
        "Picker value changing to:",
        selectedDate.toLocaleTimeString(),
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

            {/* Image Section */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Event Image (Optional)</Text>
              <TouchableOpacity
                style={styles.imagePickerButton}
                onPress={handlePickImage}
                disabled={isLoadingImage || isUploadingImage}
              >
                {isLoadingImage ? (
                  <>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={styles.imagePickerText}>Loading image...</Text>
                  </>
                ) : selectedImageUri ? (
                  <Image
                    source={{ uri: selectedImageUri }}
                    style={styles.selectedImagePreview}
                  />
                ) : existingImageUrl ? (
                  <Image
                    source={{ uri: existingImageUrl }}
                    style={styles.selectedImagePreview}
                  />
                ) : (
                  <>
                    <Text style={styles.imagePickerIcon}>📸</Text>
                    <Text style={styles.imagePickerText}>
                      Tap to add a photo
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              {(selectedImageUri || existingImageUrl) && !isLoadingImage && (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedImageUri(null);
                    setExistingImageUrl(null);
                  }}
                  style={styles.removeImageButton}
                >
                  <Text style={styles.removeImageText}>Remove Image</Text>
                </TouchableOpacity>
              )}
              {(selectedImageUri || existingImageUrl) && (
                <Text style={styles.imageHint}>
                  Image will be uploaded to Firebase and sent to devices
                </Text>
              )}
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
                    initialValue.toLocaleTimeString(),
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
                    initialValue.toLocaleTimeString(),
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

        {/* Loading Overlay for Image Upload */}
        {isUploadingImage && !imageTransferProgress && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.loadingText}>Uploading image...</Text>
            </View>
          </View>
        )}

        {/* Toast-style Progress for Image Transfer */}
        {imageTransferProgress && (
          <View style={styles.toastContainer}>
            <View style={styles.toastContent}>
              <View style={styles.toastLeft}>
                <Text style={styles.toastTitle}>Sending to device...</Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${(imageTransferProgress.current / imageTransferProgress.total) * 100}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {imageTransferProgress.current} /{" "}
                  {imageTransferProgress.total}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.toastCloseButton}
                onPress={() => {
                  if (transferCancelToken) {
                    transferCancelToken.cancelled = true;
                  }
                }}
              >
                <Text style={styles.toastCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
  imagePickerButton: {
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedImagePreview: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    resizeMode: "cover",
  },
  imagePickerIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  imagePickerText: {
    fontSize: 14,
    color: "#6b7280",
  },
  imageHint: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 8,
    fontStyle: "italic",
  },
  removeImageButton: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "#fee2e2",
    borderRadius: 6,
    alignItems: "center",
  },
  removeImageText: {
    fontSize: 14,
    color: "#dc2626",
    fontWeight: "500",
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  loadingContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 32,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 14,
    color: "#1f2937",
    marginTop: 12,
    fontWeight: "500",
  },
  progressBar: {
    width: 240,
    height: 8,
    backgroundColor: "#e5e7eb",
    borderRadius: 4,
    marginTop: 16,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#3b82f6",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 8,
  },
  toastContainer: {
    position: "absolute",
    bottom: 40,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  toastContent: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  toastLeft: {
    flex: 1,
    marginRight: 12,
  },
  toastTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
  },
  toastCloseButton: {
    padding: 8,
  },
  toastCloseText: {
    fontSize: 18,
    color: "#9ca3af",
    fontWeight: "600",
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
