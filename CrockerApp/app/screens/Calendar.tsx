import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import LinearGradient from "react-native-linear-gradient";
import {RootStackParamList}  from "../navigation/AppNavigator";

type CalendarNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "CalendarScreen"
>;

const { width } = Dimensions.get("window");

const Calendar = () => {
  const navigation = useNavigation<CalendarNavigationProp>();
  const [selectedDate, setSelectedDate] = useState(7);

  const timeSlots = [
    "6:00AM",
    "7:00AM",
    "7:30AM",
    "8:00AM",
    "8:30AM",
    "9:00AM",
    "9:30AM",
    "10:00AM",
    "10:30AM",
    "11:00AM",
    "11:30AM",
    "12:00PM",
  ];

  const daysOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const dates = [5, 6, 7, 8, 9, 10, 11];

  const handleAddEvent = () => {
    navigation.navigate("EventCreation");
  };

  const handleMenuPress = () => {
    navigation.navigate("Home");
  };

  return (
    <LinearGradient colors={["#dbeafe", "#f8fafc"]} style={styles.container}>
      <StatusBar backgroundColor="#dbeafe" barStyle="dark-content" />

      {/* Status Bar */}
      <View style={styles.statusBar}>
        <Text style={styles.time}>8:48</Text>
        <View style={styles.notch}>
          <View style={styles.notchInner} />
        </View>
        <View style={styles.indicators}>
          <View style={styles.signalDots}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={[styles.dot, styles.dotActive]} />
            <View style={[styles.dot, styles.dotActive]} />
            <View style={[styles.dot, styles.dotInactive]} />
          </View>
          <View style={styles.battery} />
        </View>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleMenuPress} style={styles.menuButton}>
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
        </TouchableOpacity>

        <Text style={styles.monthTitle}>January</Text>

        <TouchableOpacity onPress={handleAddEvent} style={styles.addButton}>
          <View style={styles.addButtonInner}>
            <Text style={styles.addButtonText}>+</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Calendar Header */}
      <View style={styles.calendarHeader}>
        {daysOfWeek.map((day, index) => (
          <View key={day} style={styles.dayColumn}>
            <Text style={styles.dayLabel}>{day}</Text>
            <TouchableOpacity
              style={[
                styles.dateButton,
                dates[index] === selectedDate && styles.selectedDateButton,
              ]}
              onPress={() => setSelectedDate(dates[index])}
            >
              <Text
                style={[
                  styles.dateText,
                  dates[index] === selectedDate && styles.selectedDateText,
                ]}
              >
                {dates[index]}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Time Slots */}
      <ScrollView style={styles.timeSlots} showsVerticalScrollIndicator={false}>
        {timeSlots.map((time, index) => (
          <View key={time} style={styles.timeSlot}>
            <Text style={styles.timeText}>{time}</Text>
            <View style={styles.timeSlotLine} />
            {index === 1 && (
              <View style={styles.addSchedulePrompt}>
                <Text style={styles.addScheduleText}>Add your</Text>
                <Text style={styles.addScheduleText}>Schedule</Text>
                <View style={styles.addScheduleArrow} />
              </View>
            )}
          </View>
        ))}
      </ScrollView>
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
  calendarHeader: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.3)",
  },
  dayColumn: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    letterSpacing: 0.5,
  },
  dateButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedDateButton: {
    backgroundColor: "#2dd4bf",
  },
  dateText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
  },
  selectedDateText: {
    color: "#ffffff",
  },
  timeSlots: {
    flex: 1,
    paddingHorizontal: 24,
  },
  timeSlot: {
    flexDirection: "row",
    alignItems: "center",
    height: 60,
    position: "relative",
  },
  timeText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    width: 70,
  },
  timeSlotLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#60a5fa",
    marginLeft: 16,
  },
  addSchedulePrompt: {
    position: "absolute",
    right: 20,
    alignItems: "center",
  },
  addScheduleText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#2dd4bf",
    lineHeight: 20,
  },
  addScheduleArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 12,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#2dd4bf",
    marginTop: 4,
  },
});

export default Calendar;
