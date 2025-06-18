"use client";

import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import Button from "../components/Button";
import Card, { CardContent, CardHeader, CardFooter } from "../components/Card";
import { colors } from "../theme/colors";

type BookAppointmentScreenRouteParams = {
  id?: number;
};

export default function BookAppointmentScreen() {
  const navigation = useNavigation();
  const route = useRoute() as { params?: BookAppointmentScreenRouteParams };
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [step, setStep] = useState(1);
  const [vehicle, setVehicle] = useState<number | "new" | null>(null);
  const [service, setService] = useState<number | "other" | null>(null);
  const [date, setDate] = useState(new Date());
  const [timeSlot, setTimeSlot] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  const mechanicId = route.params?.id || 1;

  // Mock mechanic data
  const mechanic = {
    id: mechanicId,
    name: "Precision Auto Care",
    address: "1234 Auto Lane, Austin, TX 78701",
  };

  // Mock user vehicles
  const userVehicles = [
    { id: 1, name: "2018 Toyota Camry", obd: true },
    { id: 2, name: "2015 Honda Civic", obd: false },
  ];

  // Mock services
  const services = [
    { id: 1, name: "Oil Change", price: "$49 - $89", duration: "30-45 min" },
    {
      id: 2,
      name: "Brake Service",
      price: "$249 - $499",
      duration: "2-3 hours",
    },
    { id: 3, name: "Engine Diagnostics", price: "$89", duration: "1 hour" },
    {
      id: 4,
      name: "Transmission Service",
      price: "$149 - $299",
      duration: "1-2 hours",
    },
  ];

  // Mock time slots
  const timeSlots = [
    { id: 1, time: "9:00 AM", available: true },
    { id: 2, time: "10:00 AM", available: true },
    { id: 3, time: "11:00 AM", available: false },
    { id: 4, time: "12:00 PM", available: false },
    { id: 5, time: "1:00 PM", available: true },
    { id: 6, time: "2:00 PM", available: true },
    { id: 7, time: "3:00 PM", available: true },
    { id: 8, time: "4:00 PM", available: false },
  ];

  const handleNextStep = () => {
    setStep(step + 1);
  };

  const handlePrevStep = () => {
    setStep(step - 1);
  };

  const handleSubmit = () => {
    // In a real application, you would submit the appointment data to your backend
    console.log("Booking appointment with:", {
      mechanic,
      vehicle,
      service,
      date,
      timeSlot,
      notes,
    });
    // Navigate to confirmation step
    setStep(4);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, isDark && styles.textLight]}>
            Book an Appointment
          </Text>
          <Text style={[styles.subtitle, isDark && styles.textMutedLight]}>
            Schedule service with {mechanic.name}
          </Text>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressBar, { width: `${(step / 4) * 100}%` }]}
            />
          </View>

          <View style={styles.stepsContainer}>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={styles.stepItem}>
                <View
                  style={[
                    styles.stepCircle,
                    step >= i ? styles.activeStepCircle : {},
                    isDark && styles.stepCircleDark,
                    step >= i && isDark && styles.activeStepCircleDark,
                  ]}
                >
                  {step > i ? (
                    <Feather name="check" size={14} color={colors.white} />
                  ) : (
                    <Text
                      style={[
                        styles.stepNumber,
                        step >= i ? styles.activeStepNumber : {},
                        isDark && styles.textLight,
                      ]}
                    >
                      {i}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    step >= i ? styles.activeStepLabel : {},
                    isDark && styles.textMutedLight,
                    step >= i && isDark && styles.textLight,
                  ]}
                >
                  {i === 1
                    ? "Vehicle"
                    : i === 2
                      ? "Service"
                      : i === 3
                        ? "Date & Time"
                        : "Confirmation"}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.content}>
          {/* Step 1: Select Vehicle */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <Text style={[styles.cardTitle, isDark && styles.textLight]}>
                  Select Your Vehicle
                </Text>
                <Text
                  style={[styles.cardSubtitle, isDark && styles.textMutedLight]}
                >
                  Choose a vehicle or add a new one
                </Text>
              </CardHeader>
              <CardContent>
                <View style={styles.vehicleOptions}>
                  {userVehicles.map((v) => (
                    <TouchableOpacity
                      key={v.id}
                      style={[
                        styles.vehicleOption,
                        vehicle === v.id && styles.selectedVehicleOption,
                        isDark && styles.vehicleOptionDark,
                        vehicle === v.id &&
                          isDark &&
                          styles.selectedVehicleOptionDark,
                      ]}
                      onPress={() => setVehicle(v.id)}
                    >
                      <View style={styles.radioContainer}>
                        <View
                          style={[
                            styles.radioOuter,
                            isDark && styles.radioOuterDark,
                            vehicle === v.id && styles.radioOuterSelected,
                            vehicle === v.id &&
                              isDark &&
                              styles.radioOuterSelectedDark,
                          ]}
                        >
                          {vehicle === v.id && (
                            <View
                              style={[
                                styles.radioInner,
                                isDark && styles.radioInnerDark,
                              ]}
                            />
                          )}
                        </View>
                      </View>

                      <View style={styles.vehicleDetails}>
                        <Text
                          style={[
                            styles.vehicleName,
                            isDark && styles.textLight,
                          ]}
                        >
                          {v.name}
                        </Text>
                        {v.obd && (
                          <View style={styles.obdBadge}>
                            <Feather
                              name="check-circle"
                              size={12}
                              color={colors.green[500]}
                            />
                            <Text style={styles.obdText}>OBD-II Connected</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}

                  <TouchableOpacity
                    style={[
                      styles.vehicleOption,
                      styles.newVehicleOption,
                      vehicle === "new" && styles.selectedVehicleOption,
                      isDark && styles.vehicleOptionDark,
                      isDark && styles.newVehicleOptionDark,
                      vehicle === "new" &&
                        isDark &&
                        styles.selectedVehicleOptionDark,
                    ]}
                    onPress={() => setVehicle("new")}
                  >
                    <View style={styles.radioContainer}>
                      <View
                        style={[
                          styles.radioOuter,
                          isDark && styles.radioOuterDark,
                          vehicle === "new" && styles.radioOuterSelected,
                          vehicle === "new" &&
                            isDark &&
                            styles.radioOuterSelectedDark,
                        ]}
                      >
                        {vehicle === "new" && (
                          <View
                            style={[
                              styles.radioInner,
                              isDark && styles.radioInnerDark,
                            ]}
                          />
                        )}
                      </View>
                    </View>

                    <View style={styles.vehicleDetails}>
                      <Text
                        style={[styles.vehicleName, isDark && styles.textLight]}
                      >
                        Add a new vehicle
                      </Text>
                      <Text
                        style={[
                          styles.vehicleSubtext,
                          isDark && styles.textMutedLight,
                        ]}
                      >
                        Enter information about your vehicle
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </CardContent>
              <CardFooter style={styles.cardFooter}>
                <Button
                  title="Cancel"
                  onPress={() => navigation.goBack()}
                  variant="outline"
                />
                <Button
                  title="Continue"
                  onPress={handleNextStep}
                  disabled={!vehicle}
                />
              </CardFooter>
            </Card>
          )}

          {/* Step 2: Select Service */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <Text style={[styles.cardTitle, isDark && styles.textLight]}>
                  Select Service
                </Text>
                <Text
                  style={[styles.cardSubtitle, isDark && styles.textMutedLight]}
                >
                  Choose the service you need
                </Text>
              </CardHeader>
              <CardContent>
                <View style={styles.tabsContainer}>
                  <View style={styles.tabsHeader}>
                    <TouchableOpacity
                      style={[
                        styles.tabButton,
                        styles.activeTabButton,
                        isDark && styles.tabButtonDark,
                        isDark && styles.activeTabButtonDark,
                      ]}
                    >
                      <Text
                        style={[
                          styles.tabButtonText,
                          styles.activeTabButtonText,
                          isDark && styles.textLight,
                        ]}
                      >
                        All Services
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.tabButton, isDark && styles.tabButtonDark]}
                    >
                      <Text
                        style={[
                          styles.tabButtonText,
                          isDark && styles.textMutedLight,
                        ]}
                      >
                        AI Recommended
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.serviceOptions}>
                    {services.map((s) => (
                      <TouchableOpacity
                        key={s.id}
                        style={[
                          styles.serviceOption,
                          service === s.id && styles.selectedServiceOption,
                          isDark && styles.serviceOptionDark,
                          service === s.id &&
                            isDark &&
                            styles.selectedServiceOptionDark,
                        ]}
                        onPress={() => setService(s.id)}
                      >
                        <View style={styles.radioContainer}>
                          <View
                            style={[
                              styles.radioOuter,
                              isDark && styles.radioOuterDark,
                              service === s.id && styles.radioOuterSelected,
                              service === s.id &&
                                isDark &&
                                styles.radioOuterSelectedDark,
                            ]}
                          >
                            {service === s.id && (
                              <View
                                style={[
                                  styles.radioInner,
                                  isDark && styles.radioInnerDark,
                                ]}
                              />
                            )}
                          </View>
                        </View>

                        <View style={styles.serviceDetails}>
                          <View style={styles.serviceHeader}>
                            <Text
                              style={[
                                styles.serviceName,
                                isDark && styles.textLight,
                              ]}
                            >
                              {s.name}
                            </Text>
                            <Text
                              style={[
                                styles.servicePrice,
                                isDark && styles.textLight,
                              ]}
                            >
                              {s.price}
                            </Text>
                          </View>
                          <View style={styles.serviceDuration}>
                            <Feather
                              name="clock"
                              size={12}
                              color={
                                isDark ? colors.gray[400] : colors.gray[500]
                              }
                            />
                            <Text
                              style={[
                                styles.durationText,
                                isDark && styles.textMutedLight,
                              ]}
                            >
                              {s.duration}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}

                    <TouchableOpacity
                      style={[
                        styles.serviceOption,
                        styles.otherServiceOption,
                        service === "other" && styles.selectedServiceOption,
                        isDark && styles.serviceOptionDark,
                        isDark && styles.otherServiceOptionDark,
                        service === "other" &&
                          isDark &&
                          styles.selectedServiceOptionDark,
                      ]}
                      onPress={() => setService("other")}
                    >
                      <View style={styles.radioContainer}>
                        <View
                          style={[
                            styles.radioOuter,
                            isDark && styles.radioOuterDark,
                            service === "other" && styles.radioOuterSelected,
                            service === "other" &&
                              isDark &&
                              styles.radioOuterSelectedDark,
                          ]}
                        >
                          {service === "other" && (
                            <View
                              style={[
                                styles.radioInner,
                                isDark && styles.radioInnerDark,
                              ]}
                            />
                          )}
                        </View>
                      </View>

                      <View style={styles.serviceDetails}>
                        <Text
                          style={[
                            styles.serviceName,
                            isDark && styles.textLight,
                          ]}
                        >
                          Other Service
                        </Text>
                        <Text
                          style={[
                            styles.serviceSubtext,
                            isDark && styles.textMutedLight,
                          ]}
                        >
                          Describe the service you need
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  {service === "other" && (
                    <View style={styles.notesContainer}>
                      <Text
                        style={[styles.notesLabel, isDark && styles.textLight]}
                      >
                        Describe the service you need
                      </Text>
                      <TextInput
                        style={[
                          styles.notesInput,
                          isDark && styles.notesInputDark,
                        ]}
                        placeholder="Please describe the service or issue with your vehicle"
                        placeholderTextColor={
                          isDark ? colors.gray[400] : colors.gray[500]
                        }
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        value={notes}
                        onChangeText={setNotes}
                      />
                    </View>
                  )}
                </View>
              </CardContent>
              <CardFooter style={styles.cardFooter}>
                <Button
                  title="Back"
                  onPress={handlePrevStep}
                  variant="outline"
                />
                <Button
                  title="Continue"
                  onPress={handleNextStep}
                  disabled={!service}
                />
              </CardFooter>
            </Card>
          )}

          {/* Step 3: Select Date and Time */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <Text style={[styles.cardTitle, isDark && styles.textLight]}>
                  Select Date & Time
                </Text>
                <Text
                  style={[styles.cardSubtitle, isDark && styles.textMutedLight]}
                >
                  Choose your preferred appointment slot
                </Text>
              </CardHeader>
              <CardContent>
                <View style={styles.dateTimeContainer}>
                  <View style={styles.dateSection}>
                    <Text
                      style={[styles.sectionLabel, isDark && styles.textLight]}
                    >
                      Select Date
                    </Text>
                    <View
                      style={[
                        styles.calendarPlaceholder,
                        isDark && styles.calendarPlaceholderDark,
                      ]}
                    >
                      <Text
                        style={[
                          styles.calendarPlaceholderText,
                          isDark && styles.textMutedLight,
                        ]}
                      >
                        Calendar would be displayed here
                      </Text>
                    </View>
                  </View>

                  <View style={styles.timeSection}>
                    <Text
                      style={[styles.sectionLabel, isDark && styles.textLight]}
                    >
                      Available Time Slots
                    </Text>
                    <View style={styles.timeSlotsGrid}>
                      {timeSlots.map((slot) => (
                        <TouchableOpacity
                          key={slot.id}
                          style={[
                            styles.timeSlot,
                            !slot.available && styles.unavailableTimeSlot,
                            timeSlot === slot.id && styles.selectedTimeSlot,
                            isDark && styles.timeSlotDark,
                            !slot.available &&
                              isDark &&
                              styles.unavailableTimeSlotDark,
                            timeSlot === slot.id &&
                              isDark &&
                              styles.selectedTimeSlotDark,
                          ]}
                          onPress={() => slot.available && setTimeSlot(slot.id)}
                          disabled={!slot.available}
                        >
                          <Feather
                            name="clock"
                            size={14}
                            color={
                              !slot.available
                                ? isDark
                                  ? colors.gray[600]
                                  : colors.gray[400]
                                : timeSlot === slot.id
                                  ? colors.white
                                  : isDark
                                    ? colors.white
                                    : colors.gray[900]
                            }
                          />
                          <Text
                            style={[
                              styles.timeSlotText,
                              !slot.available && styles.unavailableTimeSlotText,
                              timeSlot === slot.id &&
                                styles.selectedTimeSlotText,
                              isDark && styles.textLight,
                              !slot.available &&
                                isDark &&
                                styles.unavailableTimeSlotTextDark,
                              timeSlot === slot.id &&
                                styles.selectedTimeSlotText,
                            ]}
                          >
                            {slot.time}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <View style={styles.notesContainer}>
                      <Text
                        style={[styles.notesLabel, isDark && styles.textLight]}
                      >
                        Additional Notes (Optional)
                      </Text>
                      <TextInput
                        style={[
                          styles.notesInput,
                          isDark && styles.notesInputDark,
                        ]}
                        placeholder="Any special instructions or information the mechanic should know"
                        placeholderTextColor={
                          isDark ? colors.gray[400] : colors.gray[500]
                        }
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        value={notes}
                        onChangeText={setNotes}
                      />
                    </View>
                  </View>
                </View>
              </CardContent>
              <CardFooter style={styles.cardFooter}>
                <Button
                  title="Back"
                  onPress={handlePrevStep}
                  variant="outline"
                />
                <Button
                  title="Book Appointment"
                  onPress={handleSubmit}
                  disabled={!timeSlot}
                />
              </CardFooter>
            </Card>
          )}

          {/* Step 4: Confirmation */}
          {step === 4 && (
            <Card>
              <CardHeader style={styles.confirmationHeader}>
                <View style={styles.confirmationIcon}>
                  <Feather
                    name="check-circle"
                    size={32}
                    color={colors.green[500]}
                  />
                </View>
                <Text
                  style={[styles.confirmationTitle, isDark && styles.textLight]}
                >
                  Appointment Confirmed!
                </Text>
                <Text
                  style={[
                    styles.confirmationSubtitle,
                    isDark && styles.textMutedLight,
                  ]}
                >
                  Your appointment has been successfully scheduled
                </Text>
              </CardHeader>
              <CardContent>
                <View style={styles.confirmationDetails}>
                  <View
                    style={[
                      styles.detailsCard,
                      isDark && styles.detailsCardDark,
                    ]}
                  >
                    <View style={styles.detailRow}>
                      <Text
                        style={[
                          styles.detailLabel,
                          isDark && styles.textMutedLight,
                        ]}
                      >
                        Mechanic
                      </Text>
                      <Text
                        style={[styles.detailValue, isDark && styles.textLight]}
                      >
                        {mechanic.name}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text
                        style={[
                          styles.detailLabel,
                          isDark && styles.textMutedLight,
                        ]}
                      >
                        Service
                      </Text>
                      <Text
                        style={[styles.detailValue, isDark && styles.textLight]}
                      >
                        {service === "other"
                          ? "Other Service"
                          : services.find((s) => s.id === service)?.name ||
                            "Selected Service"}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text
                        style={[
                          styles.detailLabel,
                          isDark && styles.textMutedLight,
                        ]}
                      >
                        Date
                      </Text>
                      <Text
                        style={[styles.detailValue, isDark && styles.textLight]}
                      >
                        {date.toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                        })}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text
                        style={[
                          styles.detailLabel,
                          isDark && styles.textMutedLight,
                        ]}
                      >
                        Time
                      </Text>
                      <Text
                        style={[styles.detailValue, isDark && styles.textLight]}
                      >
                        {timeSlots.find((s) => s.id === timeSlot)?.time ||
                          "Selected Time"}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text
                        style={[
                          styles.detailLabel,
                          isDark && styles.textMutedLight,
                        ]}
                      >
                        Vehicle
                      </Text>
                      <Text
                        style={[styles.detailValue, isDark && styles.textLight]}
                      >
                        {vehicle === "new"
                          ? "New Vehicle"
                          : userVehicles.find((v) => v.id === vehicle)?.name ||
                            "Selected Vehicle"}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.obdCard, isDark && styles.obdCardDark]}>
                    <View style={styles.obdCardHeader}>
                      <Feather
                        name="tool"
                        size={20}
                        color={colors.primary[500]}
                      />
                      <Text
                        style={[
                          styles.obdCardTitle,
                          isDark && styles.textLight,
                        ]}
                      >
                        Pre-Visit Vehicle Analysis
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.obdCardText,
                        isDark && styles.textMutedLight,
                      ]}
                    >
                      We've sent your vehicle's OBD-II data to the mechanic for
                      pre-visit analysis. This helps them prepare for your
                      service and potentially identify additional issues.
                    </Text>

                    <View style={styles.obdStatus}>
                      <Text
                        style={[
                          styles.obdStatusLabel,
                          isDark && styles.textLight,
                        ]}
                      >
                        Status:
                      </Text>
                      <Text style={styles.obdStatusValue}>
                        Transmitted successfully
                      </Text>
                    </View>
                  </View>
                </View>
              </CardContent>
              <CardFooter style={styles.confirmationFooter}>
                <Text
                  style={[
                    styles.confirmationFooterText,
                    isDark && styles.textMutedLight,
                  ]}
                >
                  You'll receive an email confirmation with these details. You
                  can also manage your appointment from your account dashboard.
                </Text>

                <View style={styles.confirmationButtons}>
                  <Button
                    title="View All Appointments"
                    onPress={() => navigation.navigate("Appointments" as never)}
                    variant="secondary"
                    style={styles.confirmationButton}
                  />

                  <Button
                    title="Return to Home"
                    onPress={() => navigation.navigate("Home" as never)}
                    style={styles.confirmationButton}
                  />
                </View>
              </CardFooter>
            </Card>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.gray[900],
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: colors.gray[600],
    textAlign: "center",
  },
  progressContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  progressTrack: {
    height: 4,
    backgroundColor: colors.gray[200],
    borderRadius: 2,
    marginBottom: 8,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: colors.primary[500],
    borderRadius: 2,
  },
  stepsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stepItem: {
    alignItems: "center",
    width: 70,
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray[300],
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  stepCircleDark: {
    backgroundColor: colors.gray[800],
    borderColor: colors.gray[600],
  },
  activeStepCircle: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  activeStepCircleDark: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.gray[600],
  },
  activeStepNumber: {
    color: colors.white,
  },
  stepLabel: {
    fontSize: 12,
    color: colors.gray[500],
    textAlign: "center",
  },
  activeStepLabel: {
    color: colors.gray[900],
    fontWeight: "500",
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.gray[900],
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.gray[600],
  },
  vehicleOptions: {
    gap: 12,
  },
  vehicleOption: {
    flexDirection: "row",
    padding: 16,
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  vehicleOptionDark: {
    borderColor: colors.gray[700],
    backgroundColor: colors.gray[800],
  },
  newVehicleOption: {
    borderStyle: "dashed",
  },
  newVehicleOptionDark: {
    borderStyle: "dashed",
  },
  selectedVehicleOption: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  selectedVehicleOptionDark: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[900] + "30", // 30% opacity
  },
  radioContainer: {
    marginRight: 12,
    paddingTop: 2,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.gray[300],
    justifyContent: "center",
    alignItems: "center",
  },
  radioOuterDark: {
    borderColor: colors.gray[600],
  },
  radioOuterSelected: {
    borderColor: colors.primary[500],
  },
  radioOuterSelectedDark: {
    borderColor: colors.primary[500],
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary[500],
  },
  radioInnerDark: {
    backgroundColor: colors.primary[500],
  },
  vehicleDetails: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.gray[900],
    marginBottom: 4,
  },
  vehicleSubtext: {
    fontSize: 14,
    color: colors.gray[600],
  },
  obdBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  obdText: {
    fontSize: 12,
    color: colors.green[500],
  },
  cardFooter: {
    justifyContent: "space-between",
  },
  tabsContainer: {
    gap: 16,
  },
  tabsHeader: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: 8,
    overflow: "hidden",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: colors.white,
  },
  tabButtonDark: {
    borderColor: colors.gray[700],
    backgroundColor: colors.gray[800],
  },
  activeTabButton: {
    backgroundColor: colors.primary[500],
  },
  activeTabButtonDark: {
    backgroundColor: colors.primary[500],
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.gray[900],
  },
  activeTabButtonText: {
    color: colors.white,
  },
  serviceOptions: {
    gap: 12,
  },
  serviceOption: {
    flexDirection: "row",
    padding: 16,
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  serviceOptionDark: {
    borderColor: colors.gray[700],
    backgroundColor: colors.gray[800],
  },
  otherServiceOption: {
    borderStyle: "dashed",
  },
  otherServiceOptionDark: {
    borderStyle: "dashed",
  },
  selectedServiceOption: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  selectedServiceOptionDark: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[900] + "30", // 30% opacity
  },
  serviceDetails: {
    flex: 1,
  },
  serviceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.gray[900],
  },
  servicePrice: {
    fontSize: 16,
    color: colors.gray[900],
  },
  serviceDuration: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  durationText: {
    fontSize: 12,
    color: colors.gray[600],
  },
  serviceSubtext: {
    fontSize: 14,
    color: colors.gray[600],
  },
  notesContainer: {
    marginTop: 8,
    gap: 8,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.gray[900],
  },
  notesInput: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 8,
    padding: 12,
    height: 100,
    backgroundColor: colors.white,
  },
  notesInputDark: {
    borderColor: colors.gray[700],
    backgroundColor: colors.gray[800],
    color: colors.white,
  },
  dateTimeContainer: {
    gap: 24,
  },
  dateSection: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.gray[900],
  },
  calendarPlaceholder: {
    height: 300,
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: 8,
    backgroundColor: colors.gray[100],
    justifyContent: "center",
    alignItems: "center",
  },
  calendarPlaceholderDark: {
    borderColor: colors.gray[700],
    backgroundColor: colors.gray[800],
  },
  calendarPlaceholderText: {
    color: colors.gray[500],
  },
  timeSection: {
    gap: 16,
  },
  timeSlotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  timeSlot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 8,
    backgroundColor: colors.white,
    minWidth: "48%",
  },
  timeSlotDark: {
    borderColor: colors.gray[700],
    backgroundColor: colors.gray[800],
  },
  unavailableTimeSlot: {
    borderColor: colors.gray[200],
    backgroundColor: colors.gray[100],
    opacity: 0.6,
  },
  unavailableTimeSlotDark: {
    borderColor: colors.gray[800],
    backgroundColor: colors.gray[900],
    opacity: 0.6,
  },
  selectedTimeSlot: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[500],
  },
  selectedTimeSlotDark: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[500],
  },
  timeSlotText: {
    fontSize: 14,
    color: colors.gray[900],
  },
  unavailableTimeSlotText: {
    color: colors.gray[400],
  },
  unavailableTimeSlotTextDark: {
    color: colors.gray[600],
  },
  selectedTimeSlotText: {
    color: colors.white,
  },
  confirmationHeader: {
    alignItems: "center",
  },
  confirmationIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.green[500] + "20", // 20% opacity
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  confirmationTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.gray[900],
    marginBottom: 8,
  },
  confirmationSubtitle: {
    fontSize: 16,
    color: colors.gray[600],
    textAlign: "center",
  },
  confirmationDetails: {
    gap: 16,
  },
  detailsCard: {
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: 8,
    padding: 16,
    backgroundColor: colors.white,
  },
  detailsCardDark: {
    borderColor: colors.gray[700],
    backgroundColor: colors.gray[800],
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.gray[600],
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.gray[900],
  },
  obdCard: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.gray[300],
    borderRadius: 8,
    padding: 16,
    backgroundColor: colors.white,
  },
  obdCardDark: {
    borderColor: colors.gray[700],
    backgroundColor: colors.gray[800],
  },
  obdCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  obdCardTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.gray[900],
  },
  obdCardText: {
    fontSize: 14,
    color: colors.gray[600],
    marginBottom: 12,
  },
  obdStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  obdStatusLabel: {
    fontSize: 14,
    color: colors.gray[900],
  },
  obdStatusValue: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.green[500],
  },
  confirmationFooter: {
    flexDirection: "column",
    alignItems: "center",
  },
  confirmationFooterText: {
    fontSize: 14,
    color: colors.gray[600],
    textAlign: "center",
    marginBottom: 16,
  },
  confirmationButtons: {
    flexDirection: "row",
    gap: 12,
  },
  confirmationButton: {
    flex: 1,
  },
  textLight: {
    color: colors.white,
  },
  textMutedLight: {
    color: colors.gray[400],
  },
});