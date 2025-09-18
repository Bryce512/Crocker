import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Platform,
  PanResponder,
  Dimensions,
  GestureResponderEvent,
  PanResponderGestureState,
  Animated,
} from "react-native";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import LinearGradient from "react-native-linear-gradient";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useCalendar } from "../contexts/CalendarContext";
import { useBluetooth } from "../contexts/BluetoothContext";
import { calendarService } from "../services/calendarService";
import firebaseService from "../services/firebaseService";

const Calendar = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const {
    events,
    kids,
    isImporting,
    isSyncing,
    lastSyncTime,
    importCalendarEvents,
    sendAlertBatch,
    getUpcomingEvents,
    refreshData,
  } = useCalendar();
  const { isConnected } = useBluetooth();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"day" | "3day" | "week" | "month">(
    "day"
  );
  const [showViewModeDropdown, setShowViewModeDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Animation values
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Get screen dimensions for responsive calculations
  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

  // PanResponder for swipe gestures between dates
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (
      evt: GestureResponderEvent,
      gestureState: PanResponderGestureState
    ) => {
      // Only respond to horizontal swipes that are more horizontal than vertical
      const isHorizontal =
        Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      const hasMinimumDistance = Math.abs(gestureState.dx) > 15;
      const isNotVerticalScroll = Math.abs(gestureState.dy) < 30;
      return isHorizontal && hasMinimumDistance && isNotVerticalScroll;
    },
    onMoveShouldSetPanResponderCapture: (
      evt: GestureResponderEvent,
      gestureState: PanResponderGestureState
    ) => {
      // Capture horizontal swipes early but allow vertical scrolling
      const isHorizontal =
        Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      const hasMinimumDistance = Math.abs(gestureState.dx) > 15;
      const isNotVerticalScroll = Math.abs(gestureState.dy) < 30;
      return isHorizontal && hasMinimumDistance && isNotVerticalScroll;
    },
    onPanResponderGrant: (
      evt: GestureResponderEvent,
      gestureState: PanResponderGestureState
    ) => {
      // Reset animation values when gesture starts
      slideAnim.setValue(0);
    },
    onPanResponderMove: (
      evt: GestureResponderEvent,
      gestureState: PanResponderGestureState
    ) => {
      // Update slide animation based on gesture
      const progress = Math.max(
        -1,
        Math.min(1, gestureState.dx / (screenWidth * 0.3))
      );
      slideAnim.setValue(progress);

      // Enhanced fade effect during swipe - more dramatic
      const fadeValue = Math.max(0.4, 1 - Math.abs(progress) * 0.6);
      fadeAnim.setValue(fadeValue);
    },
    onPanResponderRelease: (
      evt: GestureResponderEvent,
      gestureState: PanResponderGestureState
    ) => {
      // Swipe threshold (20% of screen width)
      const swipeThreshold = screenWidth * 0.2;

      if (gestureState.dx > swipeThreshold) {
        // Swipe right - go to previous day with animation
        animateTransition(() => goToPreviousDay(), "right");
      } else if (gestureState.dx < -swipeThreshold) {
        // Swipe left - go to next day with animation
        animateTransition(() => goToNextDay(), "left");
      } else {
        // Reset animation if swipe wasn't far enough
        resetAnimation();
      }
    },
    onPanResponderTerminationRequest: () => false, // Don't allow termination during horizontal swipes
  });

  // Animation functions
  const animateTransition = (
    dateChangeCallback: () => void,
    direction: "left" | "right"
  ) => {
    const slideValue = direction === "left" ? -1 : 1;

    // Animate out with more pronounced fade
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: slideValue,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0.3, // More dramatic fade out
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Change the date
      dateChangeCallback();

      // Reset position and prepare for fade in
      slideAnim.setValue(-slideValue);
      fadeAnim.setValue(0.2); // Start very faded

      // Animate in with smooth fade
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300, // Slightly longer fade in for smoothness
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const resetAnimation = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    // Auto-refresh when component mounts
    refreshData();
  }, []);

  const handleAddEvent = () => {
    navigation.navigate("EventCreation");
  };

  const handleMenuPress = () => {
    navigation.navigate("Home");
  };

  const handleImportCalendar = async () => {
    try {
      // First check permissions
      const permissionStatus = await calendarService.checkPermissions();
      console.log("Current permission status:", permissionStatus);

      if (permissionStatus === "denied") {
        Alert.alert(
          "Calendar Access Denied",
          "Calendar access has been denied. Please go to Settings > Privacy & Security > Calendars and enable access for this app, then restart the app.",
          [{ text: "OK", style: "default" }]
        );
        return;
      }

      Alert.alert(
        "Import Calendar",
        "Import events from your device calendar? This will add them to your event list.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Import",
            onPress: async () => {
              try {
                const importedEvents = await importCalendarEvents();
                Alert.alert(
                  "Success",
                  `Imported ${importedEvents.length} events from your calendar`
                );
              } catch (error) {
                console.error("Import error:", error);
                let errorMessage = "Failed to import calendar events.";

                if (error instanceof Error) {
                  if (
                    error.message.includes("permission") ||
                    error.message.includes("denied")
                  ) {
                    errorMessage =
                      "Calendar access denied. Please enable calendar permissions in your device settings and restart the app.";
                  } else if (error.message.includes("not found")) {
                    errorMessage =
                      "No calendars found on your device. Please add a calendar first.";
                  } else {
                    errorMessage = error.message;
                  }
                }

                Alert.alert("Import Failed", errorMessage);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error("Permission check error:", error);
      Alert.alert("Error", "Failed to check calendar permissions");
    }
  };

  const handleSyncAlerts = async () => {
    if (!isConnected) {
      Alert.alert(
        "Not Connected",
        "Please connect to a Bluetooth device first"
      );
      return;
    }

    if (kids.length === 0) {
      Alert.alert("No Kids", "Please add a kid profile first");
      return;
    }

    try {
      // Sync alerts for all kids
      for (const kid of kids) {
        await sendAlertBatch(kid.id);
      }
      Alert.alert("Success", "Alert schedules synced to all devices");
    } catch (error) {
      Alert.alert("Error", "Failed to sync alert schedules");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  // Date navigation functions
  const goToPreviousDay = () => {
    const previousDay = new Date(selectedDate);
    previousDay.setDate(previousDay.getDate() - 1);
    setSelectedDate(previousDay);
  };

  const goToNextDay = () => {
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);
    setSelectedDate(nextDay);
  };

  // Enhanced navigation with animation
  const goToPreviousDayWithAnimation = () => {
    animateTransition(() => goToPreviousDay(), "right");
  };

  const goToNextDayWithAnimation = () => {
    animateTransition(() => goToNextDay(), "left");
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const handleViewModeSelect = (mode: "day" | "3day" | "week" | "month") => {
    setViewMode(mode);
    setShowViewModeDropdown(false);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setShowDatePicker(false);
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getEventsForSelectedDate = () => {
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const filteredEvents = events
      .filter((event) => {
        // Convert event.startTime to Date if it's not already
        const eventStartTime =
          event.startTime instanceof Date
            ? event.startTime
            : new Date(event.startTime);
        console.log(
          "🔍 DEBUG Calendar: eventStartTime converted:",
          eventStartTime
        );

        const isActive = event.isActive;
        const isInRange =
          eventStartTime >= startOfDay && eventStartTime <= endOfDay;

        return isActive && isInRange;
      })
      .sort((a, b) => {
        const aTime =
          a.startTime instanceof Date ? a.startTime : new Date(a.startTime);
        const bTime =
          b.startTime instanceof Date ? b.startTime : new Date(b.startTime);
        return aTime.getTime() - bTime.getTime();
      });

    console.log("🔍 DEBUG Calendar: filtered events:", filteredEvents);
    return filteredEvents;
  };

  // Calculate event positioning within hour blocks
  const calculateEventPosition = (event: any) => {
    const startTime =
      event.startTime instanceof Date
        ? event.startTime
        : new Date(event.startTime);
    const endTime =
      event.endTime instanceof Date ? event.endTime : new Date(event.endTime);

    const hour = startTime.getHours();
    const minute = startTime.getMinutes();
    const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60); // duration in minutes

    // Position within the hour (0-1)
    const topOffset = minute / 60;

    // Height based on duration (minimum 15 minutes = 0.25 of an hour block)
    const height = Math.max(duration / 60, 0.25);

    return {
      hour,
      topOffset,
      height,
      duration,
      // Use dynamic height calculations
      pixelTop: topOffset * hourBlockHeight,
      pixelHeight: Math.max(height * hourBlockHeight, eventBlockMinHeight),
    };
  };

  // Generate hour blocks (6 AM to 11 PM)
  const generateHourBlocks = () => {
    const hours = [];
    for (let i = 6; i <= 23; i++) {
      hours.push(i);
    }
    return hours;
  };

  const formatHour = (hour: number): string => {
    if (hour === 0) return "12 AM";
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return "12 PM";
    return `${hour - 12} PM`;
  };

  const todaysEvents = getEventsForSelectedDate();
  const hourBlocks = generateHourBlocks();

  // Calculate responsive dimensions
  const hourBlockHeight = Math.max(screenHeight * 0.08, 60); // 8% of screen height, minimum 60px
  const eventBlockMinHeight = Math.max(hourBlockHeight * 0.25, 15); // 25% of hour block, minimum 15px

  return (
    <LinearGradient colors={["#dbeafe", "#f8fafc"]} style={styles.container}>
      <StatusBar backgroundColor="#dbeafe" barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleMenuPress} style={styles.menuButton}>
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
        </TouchableOpacity>

        <Text style={styles.monthTitle}>Calendar</Text>

        <TouchableOpacity onPress={handleAddEvent} style={styles.addButton}>
          <View style={styles.addButtonInner}>
            <Text style={styles.addButtonText}>+</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.importButton]}
          onPress={handleImportCalendar}
          disabled={isImporting}
        >
          {isImporting ? (
            <ActivityIndicator color="#2563eb" size="small" />
          ) : (
            <Text style={styles.importButtonText}>Import Calendar</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.syncButton,
            !isConnected && styles.disabledButton,
          ]}
          onPress={handleSyncAlerts}
          disabled={isSyncing || !isConnected}
        >
          {isSyncing ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.syncButtonText}>
              {isConnected ? "Sync Alerts" : "Not Connected"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Sync Status */}
      {lastSyncTime && (
        <View style={styles.syncStatus}>
          <Text style={styles.syncStatusText}>
            Last sync: {lastSyncTime.toLocaleTimeString()}
          </Text>
        </View>
      )}

      {/* Date Selector */}
      <View style={styles.dateSelector}>
        {/* Previous day arrow */}
        <TouchableOpacity
          onPress={goToPreviousDayWithAnimation}
          style={styles.navArrow}
        >
          <Text style={styles.navArrowText}>‹</Text>
        </TouchableOpacity>

        {/* Date display - tappable for date picker */}
        <TouchableOpacity
          onPress={() => setShowDatePicker(true)}
          style={styles.dateDisplayButton}
        >
          <Text style={styles.selectedDateText}>
            {formatDate(selectedDate)}
          </Text>
          <Text style={styles.viewModeText}>{viewMode.toUpperCase()} VIEW</Text>
        </TouchableOpacity>

        {/* Next day arrow */}
        <TouchableOpacity
          onPress={goToNextDayWithAnimation}
          style={styles.navArrow}
        >
          <Text style={styles.navArrowText}>›</Text>
        </TouchableOpacity>

        {/* Today button with dropdown */}
        <TouchableOpacity
          onPress={() => setShowViewModeDropdown(true)}
          style={styles.todayButton}
        >
          <Text style={styles.todayButtonText}>Today ▼</Text>
        </TouchableOpacity>
      </View>

      {/* Schedule View */}
      <View style={{ flex: 1 }} {...panResponder.panHandlers}>
        <Animated.View
          style={{
            flex: 1,
            transform: [
              {
                translateX: slideAnim.interpolate({
                  inputRange: [-1, 0, 1],
                  outputRange: [-screenWidth * 0.1, 0, screenWidth * 0.1],
                }),
              },
            ],
            opacity: fadeAnim,
          }}
        >
          <ScrollView
            style={styles.scheduleContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
            scrollEnabled={true}
          >
            {/* Debug info */}
            <View style={styles.debugContainer}>
              <Text style={styles.debugText}>
                Debug: {events.length} total events loaded
              </Text>
              <Text style={styles.debugText}>
                Events for {selectedDate.toDateString()}: {todaysEvents.length}
              </Text>
              <Text style={styles.debugText}>
                First event: {events[0]?.title || "None"}
                {events[0]
                  ? ` (startTime: ${events[0].startTime ? "Yes" : "Missing"})`
                  : ""}
              </Text>
            </View>

            {todaysEvents.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  {events.length > 0
                    ? `${events.length} events found but none for this date`
                    : "No events for this date"}
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  {events.length > 0 && events.some((e) => !e.startTime)
                    ? "Some events are missing date information and need to be re-imported"
                    : "Tap + to add an event or import from your calendar"}
                </Text>
                <Text style={styles.swipeHint}>
                  Swipe left/right to navigate between days
                </Text>
              </View>
            ) : (
              <View style={styles.scheduleGrid}>
                {hourBlocks.map((hour) => {
                  const hourEvents = todaysEvents.filter((event) => {
                    const eventStartTime =
                      event.startTime instanceof Date
                        ? event.startTime
                        : new Date(event.startTime);
                    return eventStartTime.getHours() === hour;
                  });

                  return (
                    <View
                      key={hour}
                      style={[styles.hourBlock, { height: hourBlockHeight }]}
                    >
                      <View style={styles.hourLabel}>
                        <Text style={styles.hourText}>{formatHour(hour)}</Text>
                      </View>
                      <View style={styles.hourContent}>
                        <View style={styles.hourLine} />
                        {hourEvents.map((event, index) => {
                          const position = calculateEventPosition(event);
                          const assignedKid = kids.find(
                            (k) => k.id === event.assignedKidId
                          );

                          return (
                            <View
                              key={`${event.id}-${index}`}
                              style={[
                                styles.eventBlock,
                                {
                                  top: position.pixelTop,
                                  height: position.pixelHeight,
                                },
                              ]}
                            >
                              <Text
                                style={styles.eventBlockTitle}
                                numberOfLines={1}
                              >
                                {event.title}
                              </Text>
                              <Text
                                style={styles.eventBlockTime}
                                numberOfLines={1}
                              >
                                {formatTime(event.startTime)} -{" "}
                                {formatTime(event.endTime)}
                              </Text>
                              {assignedKid && (
                                <Text
                                  style={styles.eventBlockKid}
                                  numberOfLines={1}
                                >
                                  → {assignedKid.name}
                                </Text>
                              )}
                              {event.alertIntervals.length > 0 && (
                                <Text
                                  style={styles.eventBlockAlerts}
                                  numberOfLines={1}
                                >
                                  🔔 {event.alertIntervals.join(", ")}min
                                </Text>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </View>

      {/* View Mode Dropdown Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showViewModeDropdown}
        onRequestClose={() => setShowViewModeDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowViewModeDropdown(false)}
        >
          <View style={styles.dropdownContainer}>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => handleViewModeSelect("day")}
            >
              <Text style={styles.dropdownText}>Day View</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => handleViewModeSelect("3day")}
            >
              <Text style={styles.dropdownText}>3 Day View</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => handleViewModeSelect("week")}
            >
              <Text style={styles.dropdownText}>Week View</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => handleViewModeSelect("month")}
            >
              <Text style={styles.dropdownText}>Month View</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Date Picker Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showDatePicker}
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerContainer}>
            <View style={styles.datePickerHeader}>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.datePickerTitle}>Select Date</Text>
              <TouchableOpacity onPress={() => handleDateSelect(selectedDate)}>
                <Text style={styles.doneText}>Done</Text>
              </TouchableOpacity>
            </View>
            {Platform.OS === "ios" ? (
              <View style={styles.androidDatePicker}>
                <Text style={styles.androidDateText}>
                  {selectedDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </Text>
                <TouchableOpacity
                  style={styles.androidDateButton}
                  onPress={() => {
                    setShowDatePicker(false);
                  }}
                >
                  <Text style={styles.androidDateButtonText}>Select Date</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.androidDatePicker}>
                <Text style={styles.androidDateText}>
                  {selectedDate.toLocaleDateString()}
                </Text>
                <TouchableOpacity
                  style={styles.androidDateButton}
                  onPress={() => {
                    setShowDatePicker(false);
                  }}
                >
                  <Text style={styles.androidDateButtonText}>Change Date</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  menuButton: {
    width: 24,
    height: 24,
    justifyContent: "space-between",
  },
  menuLine: {
    width: 20,
    height: 3,
    backgroundColor: "#1e293b",
    borderRadius: 2,
  },
  monthTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#1e293b",
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#2dd4bf",
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1e293b",
  },
  actionButtons: {
    flexDirection: "row",
    paddingHorizontal: 24,
    marginBottom: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  importButton: {
    backgroundColor: "rgba(37, 99, 235, 0.1)",
    borderWidth: 1,
    borderColor: "#2563eb",
  },
  importButtonText: {
    color: "#2563eb",
    fontWeight: "600",
  },
  syncButton: {
    backgroundColor: "#2563eb",
  },
  syncButtonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  disabledButton: {
    backgroundColor: "#6b7280",
  },
  syncStatus: {
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  syncStatusText: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
  },
  dateSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.3)",
  },
  dateDisplayButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  selectedDateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
  },
  todayButton: {
    backgroundColor: "#2dd4bf",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  todayButtonText: {
    color: "#ffffff",
    fontWeight: "500",
    fontSize: 14,
  },
  navArrow: {
    padding: 8,
    minWidth: 40,
    alignItems: "center",
  },
  navArrowText: {
    fontSize: 24,
    color: "#3b82f6",
    fontWeight: "bold",
  },
  viewModeText: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
    textAlign: "center",
  },
  swipeHint: {
    fontSize: 10,
    color: "#9ca3af",
    marginTop: 1,
    textAlign: "center",
    fontStyle: "italic",
  },
  eventsContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  scheduleContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  scheduleGrid: {
    flex: 1,
  },
  hourBlock: {
    flexDirection: "row",
    height: 60, // 60px per hour
    position: "relative",
  },
  hourLabel: {
    width: 60,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 4,
  },
  hourText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6b7280",
  },
  hourContent: {
    flex: 1,
    position: "relative",
    marginLeft: 12,
  },
  hourLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(148, 163, 184, 0.3)",
  },
  eventBlock: {
    position: "absolute",
    left: 0,
    right: 8,
    backgroundColor: "rgba(45, 212, 191, 0.9)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderLeftWidth: 3,
    borderLeftColor: "#0d9488",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  eventBlockTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 1,
  },
  eventBlockTime: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 1,
  },
  eventBlockKid: {
    fontSize: 9,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 1,
  },
  eventBlockAlerts: {
    fontSize: 8,
    color: "rgba(255, 255, 255, 0.7)",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "500",
    color: "#6b7280",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 20,
  },
  eventCard: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: "#2dd4bf",
  },
  eventTime: {
    width: 80,
    marginRight: 16,
  },
  eventTimeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
  },
  alertsText: {
    fontSize: 10,
    color: "#f59e0b",
    marginTop: 2,
  },
  eventDetails: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 4,
  },
  assignedKid: {
    fontSize: 12,
    color: "#2563eb",
    marginBottom: 2,
  },
  eventDuration: {
    fontSize: 12,
    color: "#6b7280",
  },
  eventStatus: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  eventStatusText: {
    fontSize: 10,
    color: "#ffffff",
    fontWeight: "500",
  },
  upcomingSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.3)",
  },
  upcomingSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 12,
  },
  upcomingEvent: {
    backgroundColor: "rgba(45, 212, 191, 0.1)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  upcomingEventTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1e293b",
  },
  upcomingEventTime: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  moreEventsText: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    fontStyle: "italic",
    paddingVertical: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownContainer: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 8,
    minWidth: 150,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  dropdownText: {
    fontSize: 16,
    color: "#1e293b",
    textAlign: "center",
  },
  datePickerContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    margin: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  datePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  cancelText: {
    fontSize: 16,
    color: "#ef4444",
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
  },
  doneText: {
    fontSize: 16,
    color: "#3b82f6",
    fontWeight: "600",
  },
  androidDatePicker: {
    alignItems: "center",
    paddingVertical: 20,
  },
  androidDateText: {
    fontSize: 18,
    color: "#1e293b",
    marginBottom: 20,
  },
  androidDateButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  androidDateButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  debugContainer: {
    backgroundColor: "rgba(255, 255, 0, 0.2)",
    padding: 12,
    marginBottom: 16,
    borderRadius: 8,
  },
  debugText: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
});

export default Calendar;
