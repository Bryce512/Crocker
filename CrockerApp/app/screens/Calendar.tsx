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
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useCalendar } from "../contexts/CalendarContext";
import { useBluetooth } from "../contexts/BluetoothContext";
import { calendarService, CalendarEvent } from "../services/calendarService";
import firebaseService from "../services/firebaseService";
import EventForm from "../components/EventForm";
import SlidingMenu from "../components/SlidingMenu";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FontAwesome from "react-native-vector-icons/FontAwesome";

const Calendar = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
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
  const { connectionState } = useBluetooth();
  const isConnected = connectionState.isConnected;

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"day" | "3day" | "week" | "month">(
    "day"
  );
  const [showViewModeDropdown, setShowViewModeDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | undefined>(
    undefined
  );

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Animation values
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scrollViewRef = useRef<ScrollView>(null);

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

    // Scroll to current time if viewing today
    if (isToday()) {
      scrollToCurrentTime();
    }
  }, []);

  useEffect(() => {
    // Scroll to current time when date changes to today
    if (isToday()) {
      setTimeout(() => scrollToCurrentTime(), 100); // Small delay to ensure layout is complete
    }
  }, [selectedDate]);

  const scrollToCurrentTime = () => {
    const timeLinePosition = getCurrentTimeLinePosition();
    if (timeLinePosition && scrollViewRef.current) {
      // Calculate scroll position to center the current time line on screen
      const { height: screenHeight } = Dimensions.get("window");
      const scrollY = Math.max(0, timeLinePosition.top - screenHeight * 0.4); // Position line at 40% from top of screen

      scrollViewRef.current.scrollTo({
        y: scrollY,
        animated: true,
      });
    }
  };

  const handleAddEvent = () => {
    navigation.navigate("EventCreation");
  };

  const handleMenuPress = () => {
    setIsMenuOpen(true);
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

  const handleDateSelect = (event: any, date?: Date) => {
    if (date) {
      setSelectedDate(date);
    }
    // Close the modal after selection or cancellation
    setShowDatePicker(false);
  };

  // Handle event editing
  const handleEventPress = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEditModal(true);
  };

  const handleEditModalSave = () => {
    setShowEditModal(false);
    setSelectedEvent(undefined);
    // Refresh data to show updated event
    refreshData();
  };

  const handleEditModalCancel = () => {
    setShowEditModal(false);
    setSelectedEvent(undefined);
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
    console.log("🔍 DEBUG Calendar: Raw events from context:", events);
    console.log("🔍 DEBUG Calendar: Events length:", events.length);
    console.log("🔍 DEBUG Calendar: Selected date:", selectedDate);

    // Get date strings for comparison (YYYY-MM-DD format)
    const selectedDateString = selectedDate.toISOString().split("T")[0];
    console.log("🔍 DEBUG Calendar: Selected date string:", selectedDateString);

    const filteredEvents = events
      .filter((event) => {
        console.log("🔍 DEBUG Calendar: Checking event:", event.title);

        // Convert event.startTime to Date if it's not already
        const eventStartTime =
          event.startTime instanceof Date
            ? event.startTime
            : new Date(event.startTime);

        // Get event date string for comparison
        const eventDateString = eventStartTime.toISOString().split("T")[0];

        console.log(
          "🔍 DEBUG Calendar: Event date string:",
          eventDateString,
          "Selected:",
          selectedDateString
        );

        const isActive = event.isActive;
        const isInRange = eventDateString === selectedDateString;

        console.log(
          "🔍 DEBUG Calendar: isActive:",
          isActive,
          "isInRange:",
          isInRange
        );

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
  const calculateEventPosition = (event: any, currentHour?: number) => {
    const startTime =
      event.startTime instanceof Date
        ? event.startTime
        : new Date(event.startTime);
    const endTime =
      event.endTime instanceof Date ? event.endTime : new Date(event.endTime);

    const startHour = startTime.getHours();
    const startMinute = startTime.getMinutes();
    const endHour = endTime.getHours();
    const endMinute = endTime.getMinutes();

    // For rendering: calculate full event dimensions from start hour
    const hour = currentHour !== undefined ? currentHour : startHour;

    let topOffset = 0;
    let height = 1;

    if (currentHour !== undefined) {
      // This is for overlap detection in a specific hour
      if (currentHour === startHour && currentHour === endHour) {
        // Event starts and ends in this hour
        topOffset = startMinute / 60;
        height = (endMinute - startMinute) / 60;
      } else if (currentHour === startHour) {
        // Event starts in this hour but continues
        topOffset = startMinute / 60;
        height = (60 - startMinute) / 60;
      } else if (currentHour === endHour) {
        // Event ends in this hour but started earlier
        topOffset = 0;
        height = endMinute / 60;
      } else {
        // Event spans through this hour completely
        topOffset = 0;
        height = 1;
      }
    } else {
      // For rendering: show full event from start time
      topOffset = startMinute / 60;

      if (startHour === endHour) {
        // Single hour event
        height = (endMinute - startMinute) / 60;
      } else {
        // Multi-hour event: calculate total height across hours
        const hoursSpanned = endHour - startHour;
        const minutesInFirstHour = 60 - startMinute;
        const minutesInLastHour = endMinute;
        const totalMinutes =
          minutesInFirstHour + (hoursSpanned - 1) * 60 + minutesInLastHour;
        height = totalMinutes / 60;
      }
    }

    // Ensure minimum height for visibility
    height = Math.max(height, 0.25);

    return {
      hour,
      topOffset,
      height,
      startTime,
      endTime,
      // Use dynamic height calculations
      pixelTop: topOffset * hourBlockHeight,
      pixelHeight: Math.max(height * hourBlockHeight, eventBlockMinHeight),
    };
  };

  // Check if two events' visual blocks overlap (not just time overlap)
  const eventsOverlap = (event1: any, event2: any, currentHour: number) => {
    const pos1 = calculateEventPosition(event1, currentHour);
    const pos2 = calculateEventPosition(event2, currentHour);

    // Calculate the visual boundaries of each event block
    const event1Top = pos1.pixelTop;
    const event1Bottom = pos1.pixelTop + pos1.pixelHeight;
    const event2Top = pos2.pixelTop;
    const event2Bottom = pos2.pixelTop + pos2.pixelHeight;

    // Check if the visual blocks overlap
    return event1Top < event2Bottom && event2Top < event1Bottom;
  };

  // Calculate layout for overlapping events within an hour
  const calculateEventLayout = (
    hourEvents: any[],
    allDayEvents: any[],
    currentHour: number
  ) => {
    const eventsWithLayout = hourEvents.map((event, index) => {
      const position = calculateEventPosition(event); // Don't pass currentHour for rendering
      return { event, position, index, column: 0, totalColumns: 1 };
    });

    // Group overlapping events - check if any events visually overlap across the entire day
    const groups: any[][] = [];

    eventsWithLayout.forEach((eventItem) => {
      let addedToGroup = false;

      for (let group of groups) {
        // Check if this event overlaps with any event already in the group
        // Use global overlap detection to check across all possible hours
        const hasOverlap = group.some((groupItem) => {
          return doEventsVisuallyOverlap(
            eventItem.event,
            groupItem.event,
            allDayEvents
          );
        });

        if (hasOverlap) {
          group.push(eventItem);
          addedToGroup = true;
          break;
        }
      }

      if (!addedToGroup) {
        groups.push([eventItem]);
      }
    });

    // Assign columns within each group
    groups.forEach((group) => {
      const totalColumns = group.length;
      group.forEach((eventItem, columnIndex) => {
        eventItem.column = columnIndex;
        eventItem.totalColumns = totalColumns;
      });
    });

    return eventsWithLayout;
  };

  // Check if two events visually overlap anywhere in their rendered blocks
  const doEventsVisuallyOverlap = (
    event1: any,
    event2: any,
    allDayEvents: any[]
  ) => {
    const start1 =
      event1.startTime instanceof Date
        ? event1.startTime
        : new Date(event1.startTime);
    const end1 =
      event1.endTime instanceof Date
        ? event1.endTime
        : new Date(event1.endTime);
    const start2 =
      event2.startTime instanceof Date
        ? event2.startTime
        : new Date(event2.startTime);
    const end2 =
      event2.endTime instanceof Date
        ? event2.endTime
        : new Date(event2.endTime);

    // First check if they overlap in time at all
    if (start1 >= end2 || start2 >= end1) {
      return false;
    }

    // Get the range of hours both events span
    const start1Hour = start1.getHours();
    const end1Hour = end1.getHours() + (end1.getMinutes() > 0 ? 1 : 0);
    const start2Hour = start2.getHours();
    const end2Hour = end2.getHours() + (end2.getMinutes() > 0 ? 1 : 0);

    // Find the overlapping hour range
    const overlapStartHour = Math.max(start1Hour, start2Hour);
    const overlapEndHour = Math.min(end1Hour, end2Hour);

    // Check each overlapping hour for visual overlap
    for (let hour = overlapStartHour; hour < overlapEndHour; hour++) {
      if (eventsOverlap(event1, event2, hour)) {
        return true;
      }
    }

    return false;
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

  // Check if selected date is today
  const isToday = () => {
    const today = new Date();
    return (
      selectedDate.getDate() === today.getDate() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getFullYear() === today.getFullYear()
    );
  };

  // Calculate current time line position based on actual time
  const getCurrentTimeLinePosition = () => {
    if (!isToday()) return null;

    const hour = currentTime.getHours();
    const minute = currentTime.getMinutes();

    // Only show if current time is within our hour range (6 AM to 11 PM)
    if (hour < 6 || hour > 23) return null;

    // Calculate exact position within the hour blocks
    const hourIndex = hour - 6; // 6 AM is index 0
    const minuteProgress = minute / 60; // Progress within the current hour (0-1)

    // Position = (hour blocks passed * height) + (progress within current hour * height)
    const linePosition =
      hourIndex * hourBlockHeight + minuteProgress * hourBlockHeight;

    return {
      top: linePosition,
      hour: hour,
      minute: minute,
    };
  };

  const todaysEvents = getEventsForSelectedDate();
  const hourBlocks = generateHourBlocks();

  // Calculate responsive dimensions
  const hourBlockHeight = Math.max(screenHeight * 0.08, 60); // 8% of screen height, minimum 60px
  const eventBlockMinHeight = Math.max(hourBlockHeight * 0.25, 15); // 25% of hour block, minimum 15px

  const currentMonthName = selectedDate.toLocaleDateString("en-US", {
    month: "long",
  });

  // Generate week days for the week view
  const generateWeekDays = () => {
    const startOfWeek = new Date(selectedDate);
    const day = startOfWeek.getDay(); // 0 = Sunday, 1 = Monday, etc.
    startOfWeek.setDate(startOfWeek.getDate() - day); // Go to Sunday

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      weekDays.push(day);
    }
    return weekDays;
  };

  const weekDays = generateWeekDays();
  const dayAbbreviations = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.toDateString() === date2.toDateString();
  };

  const handleDatePress = (date: Date) => {
    setSelectedDate(date);
  };

  const handleMonthPress = () => {
    setShowDatePicker(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />

      {/* Header */}
      <View
        style={[styles.header, { paddingTop: Math.max(insets.top + 10, 60) }]}
      >
        <TouchableOpacity onPress={handleMenuPress} style={styles.menuButton}>
          <View style={styles.menuLines}>
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleMonthPress}>
          <Text style={styles.monthTitle}>{currentMonthName}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleAddEvent} style={styles.addButton}>
          <View style={styles.addButtonInner}>
            <FontAwesome name="plus" size={18} color="#000" />
          </View>
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
        {/* Week days */}
        <View style={styles.weekContainer}>
          {weekDays.map((day, index) => {
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());

            return (
              <TouchableOpacity
                key={index}
                onPress={() => handleDatePress(day)}
                style={styles.dayContainer}
              >
                <Text style={styles.dayAbbreviation}>
                  {dayAbbreviations[index]}
                </Text>
                <View
                  style={[
                    styles.dateCircle,
                    isSelected && styles.selectedDateCircle,
                  ]}
                >
                  <Text
                    style={[
                      styles.dateNumber,
                      isSelected && styles.selectedDateNumber,
                    ]}
                  >
                    {day.getDate()}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
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
            ref={scrollViewRef}
            style={styles.scheduleContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
            scrollEnabled={true}
          >
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
                {/* Current Time Indicator */}
                {(() => {
                  const timeLinePosition = getCurrentTimeLinePosition();
                  return timeLinePosition ? (
                    <View
                      style={[
                        styles.currentTimeLine,
                        { top: timeLinePosition.top },
                      ]}
                    >
                      <View style={styles.currentTimeLabel}>
                        <Text style={styles.currentTimeText}>
                          {formatTime(currentTime)}
                        </Text>
                      </View>
                      <View style={styles.currentTimeLineBar} />
                    </View>
                  ) : null;
                })()}

                {hourBlocks.map((hour) => {
                  // Get events that should be rendered in this hour (only events that START in this hour)
                  const hourEvents = todaysEvents.filter((event) => {
                    const eventStartTime =
                      event.startTime instanceof Date
                        ? event.startTime
                        : new Date(event.startTime);
                    return eventStartTime.getHours() === hour;
                  });

                  // Get all events that span through this hour (for overlap detection)
                  const allHourEvents = todaysEvents.filter((event) => {
                    const eventStartTime =
                      event.startTime instanceof Date
                        ? event.startTime
                        : new Date(event.startTime);
                    const eventEndTime =
                      event.endTime instanceof Date
                        ? event.endTime
                        : new Date(event.endTime);

                    const startHour = eventStartTime.getHours();
                    const endHour = eventEndTime.getHours();

                    // Include event if this hour is within the event's time span
                    return hour >= startHour && hour <= endHour;
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
                        {calculateEventLayout(
                          hourEvents,
                          todaysEvents,
                          hour
                        ).map((eventItem) => {
                          const { event, position, column, totalColumns } =
                            eventItem;
                          const assignedKid = kids.find(
                            (k) => k.id === event.assignedKidId
                          );

                          // Calculate side-by-side positioning
                          const eventWidthPercent =
                            totalColumns > 1 ? 95 / totalColumns - 1 : 95; // Subtract 1% for margin
                          const eventLeftPercent =
                            totalColumns > 1
                              ? (column * 95) / totalColumns + 0.5
                              : 2.5; // Add 0.5% margin

                          // Vary colors for overlapping events
                          const eventColors = [
                            "rgba(45, 212, 191, 0.9)", // Teal
                            "rgba(168, 85, 247, 0.9)", // Purple
                            "rgba(251, 146, 60, 0.9)", // Orange
                            "rgba(34, 197, 94, 0.9)", // Green
                            "rgba(239, 68, 68, 0.9)", // Red
                          ];
                          const borderColors = [
                            "#0d9488", // Teal
                            "#7c3aed", // Purple
                            "#ea580c", // Orange
                            "#16a34a", // Green
                            "#dc2626", // Red
                          ];
                          const backgroundColor =
                            totalColumns > 1
                              ? eventColors[column % eventColors.length]
                              : eventColors[0];
                          const borderColor =
                            totalColumns > 1
                              ? borderColors[column % borderColors.length]
                              : borderColors[0];

                          return (
                            <TouchableOpacity
                              key={`${event.id}-${eventItem.index}`}
                              style={[
                                styles.eventBlock,
                                {
                                  top: position.pixelTop,
                                  height: position.pixelHeight,
                                  width: `${eventWidthPercent}%`,
                                  left: `${eventLeftPercent}%`,
                                  position: "absolute",
                                  backgroundColor: backgroundColor,
                                  borderLeftColor: borderColor,
                                },
                              ]}
                              onPress={() => handleEventPress(event)}
                              activeOpacity={0.7}
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
                              {assignedKid ? (
                                <Text
                                  style={styles.eventBlockKid}
                                  numberOfLines={1}
                                >
                                  → {assignedKid.name}
                                </Text>
                              ) : (
                                <Text
                                  style={[
                                    styles.eventBlockKid,
                                    { color: "#888" },
                                  ]}
                                  numberOfLines={1}
                                >
                                  ⚠️ No kid assigned
                                </Text>
                              )}
                            </TouchableOpacity>
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

      {/* Native Calendar Modal - Centered */}
      {showDatePicker && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={showDatePicker}
          onRequestClose={() => setShowDatePicker(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowDatePicker(false)}
          >
            <View style={styles.calendarModalContainer}>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "calendar"}
                onChange={handleDateSelect}
                maximumDate={new Date(2030, 11, 31)}
                minimumDate={new Date(2020, 0, 1)}
                themeVariant="light"
              />
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Event Edit Modal */}
      <EventForm
        mode="edit"
        existingEvent={selectedEvent}
        visible={showEditModal}
        onSave={handleEditModalSave}
        onCancel={handleEditModalCancel}
      />

      {/* Sliding Menu */}
      <SlidingMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 20,
    backgroundColor: "#ffffff",
  },
  menuButton: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  menuLines: {
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
    justifyContent: "center",
  },
  addButton: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    borderWidth: 3,
    alignItems: "center",
    borderColor: "#2dd4bf",
    color: "1e293b",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
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
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 5,
    zIndex: 10,
  },
  monthDisplayButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    marginBottom: 16,
  },
  monthText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    marginRight: 8,
  },
  weekContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  dayContainer: {
    alignItems: "center",
    flex: 1,
  },
  dayAbbreviation: {
    fontSize: 16,
    fontWeight: "500",
    color: "#6b7280",
    marginBottom: 8,
  },
  dateCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedDateCircle: {
    backgroundColor: "#61C9A8",
  },
  dateNumber: {
    fontSize: 20,
    fontWeight: "500",
    color: "#1e293b",
  },
  selectedDateNumber: {
    color: "#ffffff",
    fontWeight: "600",
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
    fontSize: 16,
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
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 1,
  },
  eventBlockTime: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 1,
  },
  eventBlockKid: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 1,
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
  calendarModalContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    margin: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    alignSelf: "center",
    justifyContent: "center",
  },
  currentTimeLine: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  currentTimeLabel: {
    backgroundColor: "#ef4444",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
    minWidth: 60,
    alignItems: "center",
  },
  currentTimeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#ffffff",
  },
  currentTimeLineBar: {
    flex: 1,
    height: 2,
    backgroundColor: "#ef4444",
    borderRadius: 1,
  },
});

export default Calendar;
