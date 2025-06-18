"use client";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute, NavigationProp, RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/AppNavigator";
import { Feather } from "@expo/vector-icons";
import Card, { CardHeader, CardContent, CardFooter } from "../components/Card";
import { useTheme } from "../components/theme-provider";
import { colors } from "../theme/colors";
import { User, Car, DiagnosticData, Diagnostic } from "../../types";
import { useState } from "react";


type DiagnosticsDetailScreenRouteProp = RouteProp<
  RootStackParamList,
  "DiagnosticsDetail"
>;
// This would typically come from your API or context
// Using mock data based on the provided information
const MOCK_DATA = {
  user: {
    id: 101,
    name: "Bryce Whitworth",
    email: "bryce.whitworth@gmail.com",
    phone: "8053049713",
    location: "Santa Barbara, CA", // Added mock location
    cars: [10, 11],
  },
  car: {
    id: 123,
    make: "Ford",
    model: "Bronco",
    year: 2024,
    color: "Blue", // Added mock color
    vin: "1FMCU0F7XMUA12345", // Added mock VIN
  },
  diagnostic: {
    code: "PO420",
    description: "Catalytic Converter Failure",
    severity: "Moderate", // Added mock severity
    details:
      "The catalytic converter is not functioning efficiently, which can lead to increased emissions and potential engine performance issues. This should be addressed within the next 500 miles.", // Added more detailed description
    dateDetected: "2023-03-15", // Added mock date
  },
};

export default function DiagnosticsDetailScreen() {
  const { isDark } = useTheme();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<DiagnosticsDetailScreenRouteProp>();

  // In a real app, you would get the data from the route params or fetch it
  const { userId, carId, diagnosticCode } = route.params;
  const { user, car, diagnostic } = MOCK_DATA;

  // // Set up state for data, loading, and error
  // const [data, setData] = useState<DiagnosticData>({
  //   user: null,
  //   car: null,
  //   diagnostic: null,
  // });
  // const [loading, setLoading] = useState(true);
  // const [error, setError] = useState<string | null>(null);

  // // Fetch data when component mounts or params change
  // useEffect(() => {
  //   async function fetchData() {
  //     setLoading(true);
  //     setError(null);

  //     try {
  //       // Get a reference to the database
  //       const database = getDatabase();

  //       // Fetch user data
  //       const userRef = ref(database, `users/${userId}`);
  //       const userSnapshot = await get(userRef);

  //       if (!userSnapshot.exists()) {
  //         throw new Error("User not found");
  //       }

  //       const userData = userSnapshot.val();

  //       // Fetch car data
  //       const carRef = ref(database, `cars/${carId}`);
  //       const carSnapshot = await get(carRef);

  //       if (!carSnapshot.exists()) {
  //         throw new Error("Car not found");
  //       }

  //       const carData = carSnapshot.val();

  //       // Fetch diagnostic data
  //       const diagnosticRef = ref(database, `diagnostics/${diagnosticCode}`);
  //       const diagnosticSnapshot = await get(diagnosticRef);

  //       if (!diagnosticSnapshot.exists()) {
  //         throw new Error("Diagnostic information not found");
  //       }

  //       const diagnosticData = diagnosticSnapshot.val();

  //       // Update state with fetched data
  //       setData({
  //         user: userData,
  //         car: carData,
  //         diagnostic: diagnosticData,
  //       });
  //     } catch (err) {
  //       console.error("Error fetching data:", err);
  //       setError("Failed to load diagnostic details. Please try again later.");

  //       // Fall back to mock data in development
  //       if (process.env.NODE_ENV === "development") {
  //         setData(MOCK_DATA as any);
  //       }
  //     } finally {
  //       setLoading(false);
  //     }
  //   }

  //   fetchData();
  // }, [userId, carId, diagnosticCode]);

  // // Show loading state
  // if (loading) {
  //   return (
  //     <View
  //       style={[
  //         styles.loadingContainer,
  //         { backgroundColor: isDark ? colors.gray[900] : colors.gray[50] },
  //       ]}
  //     >
  //       <ActivityIndicator size="large" color={colors.primary[500]} />
  //       <Text
  //         style={{
  //           color: isDark ? colors.white : colors.gray[900],
  //           marginTop: 16,
  //         }}
  //       >
  //         Loading diagnostic information...
  //       </Text>
  //     </View>
  //   );
  // }

  // // Show error state
  // if (error || !data.user || !data.car || !data.diagnostic) {
  //   return (
  //     <View
  //       style={[
  //         styles.errorContainer,
  //         { backgroundColor: isDark ? colors.gray[900] : colors.gray[50] },
  //       ]}
  //     >
  //       <Feather name="alert-circle" size={48} color={colors.red[500]} />
  //       <Text
  //         style={{
  //           color: isDark ? colors.white : colors.gray[900],
  //           marginTop: 16,
  //           textAlign: "center",
  //         }}
  //       >
  //         {error || "Could not load diagnostic information"}
  //       </Text>
  //       <TouchableOpacity
  //         style={[
  //           styles.actionButton,
  //           { backgroundColor: colors.primary[500], marginTop: 24 },
  //         ]}
  //         onPress={() => navigation.goBack()}
  //       >
  //         <Text style={styles.actionButtonText}>Go Back</Text>
  //       </TouchableOpacity>
  //     </View>
  //   );
  // }

  // Destructure data for the UI
  // const { user, car, diagnostic } = data;
  

  const handleCall = () => {
    Linking.openURL(`tel:${user.phone}`);
  };

  const handleEmail = () => {
    Linking.openURL(`mailto:${user.email}`);
  };

  const handleFindMechanic = () => {
    // Navigate to find mechanics screen with the diagnostic code as a parameter
    navigation.navigate("FindMechanics", { diagnosticCode: diagnostic.code });
  };

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: isDark ? colors.gray[900] : colors.gray[50] },
      ]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text
          style={[
            styles.headerTitle,
            { color: isDark ? colors.white : colors.gray[900] },
          ]}
        >
          Diagnostic Details
        </Text>
        <Text
          style={[
            styles.headerSubtitle,
            { color: isDark ? colors.gray[400] : colors.gray[600] },
          ]}
        >
          OBD-II Code: {diagnostic.code}
        </Text>
      </View>

      {/* User Information Card */}
      <Card>
        <CardHeader>
          <Text
            style={[
              styles.cardTitle,
              { color: isDark ? colors.white : colors.gray[900] },
            ]}
          >
            Customer Information
          </Text>
        </CardHeader>
        <CardContent>
          <View style={styles.infoRow}>
            <Feather
              name="user"
              size={20}
              color={isDark ? colors.gray[400] : colors.gray[500]}
            />
            <Text
              style={[
                styles.infoText,
                { color: isDark ? colors.white : colors.gray[900] },
              ]}
            >
              {user.name}
            </Text>
          </View>

          <TouchableOpacity style={styles.infoRow} onPress={handleEmail}>
            <Feather
              name="mail"
              size={20}
              color={isDark ? colors.gray[400] : colors.gray[500]}
            />
            <Text style={[styles.infoText, { color: colors.primary[500] }]}>
              {user.email}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.infoRow} onPress={handleCall}>
            <Feather
              name="phone"
              size={20}
              color={isDark ? colors.gray[400] : colors.gray[500]}
            />
            <Text style={[styles.infoText, { color: colors.primary[500] }]}>
              {user.phone}
            </Text>
          </TouchableOpacity>

          <View style={styles.infoRow}>
            <Feather
              name="map-pin"
              size={20}
              color={isDark ? colors.gray[400] : colors.gray[500]}
            />
            <Text
              style={[
                styles.infoText,
                { color: isDark ? colors.white : colors.gray[900] },
              ]}
            >
              {user.location}
            </Text>
          </View>
        </CardContent>
      </Card>

      {/* Vehicle Information Card */}
      <Card>
        <CardHeader>
          <Text
            style={[
              styles.cardTitle,
              { color: isDark ? colors.white : colors.gray[900] },
            ]}
          >
            Vehicle Information
          </Text>
        </CardHeader>
        <CardContent>
          <View style={styles.vehicleHeader}>
            <Text
              style={[
                styles.vehicleName,
                { color: isDark ? colors.white : colors.gray[900] },
              ]}
            >
              {car.year} {car.make} {car.model}
            </Text>
            <View
              style={[
                styles.vehicleBadge,
                {
                  backgroundColor: isDark ? colors.gray[700] : colors.gray[200],
                },
              ]}
            >
              <Text
                style={[
                  styles.vehicleBadgeText,
                  { color: isDark ? colors.white : colors.gray[900] },
                ]}
              >
                ID: {car.id}
              </Text>
            </View>
          </View>

          <View style={styles.vehicleDetails}>
            <View style={styles.vehicleDetailItem}>
              <Text
                style={[
                  styles.vehicleDetailLabel,
                  { color: isDark ? colors.gray[400] : colors.gray[600] },
                ]}
              >
                Color
              </Text>
              <Text
                style={[
                  styles.vehicleDetailValue,
                  { color: isDark ? colors.white : colors.gray[900] },
                ]}
              >
                {car.color}
              </Text>
            </View>

            <View style={styles.vehicleDetailItem}>
              <Text
                style={[
                  styles.vehicleDetailLabel,
                  { color: isDark ? colors.gray[400] : colors.gray[600] },
                ]}
              >
                VIN
              </Text>
              <Text
                style={[
                  styles.vehicleDetailValue,
                  { color: isDark ? colors.white : colors.gray[900] },
                ]}
              >
                {car.vin}
              </Text>
            </View>
          </View>
        </CardContent>
      </Card>

      {/* Diagnostic Information Card */}
      <Card>
        <CardHeader>
          <View style={styles.diagnosticHeader}>
            <Text
              style={[
                styles.cardTitle,
                { color: isDark ? colors.white : colors.gray[900] },
              ]}
            >
              Diagnostic Code: {diagnostic.code}
            </Text>
            <View
              style={[
                styles.severityBadge,
                {
                  backgroundColor:
                    diagnostic.severity === "High"
                      ? colors.red[500]
                      : diagnostic.severity === "Moderate"
                        ? colors.yellow[500]
                        : colors.green[500],
                },
              ]}
            >
              <Text style={styles.severityText}>{diagnostic.severity}</Text>
            </View>
          </View>
        </CardHeader>
        <CardContent>
          <Text
            style={[
              styles.diagnosticTitle,
              { color: isDark ? colors.white : colors.gray[900] },
            ]}
          >
            {diagnostic.description}
          </Text>

          <Text
            style={[
              styles.diagnosticDescription,
              { color: isDark ? colors.gray[300] : colors.gray[700] },
            ]}
          >
            {diagnostic.details}
          </Text>

          <View style={styles.diagnosticMeta}>
            <Text
              style={[
                styles.diagnosticMetaText,
                { color: isDark ? colors.gray[400] : colors.gray[600] },
              ]}
            >
              Detected on: {diagnostic.dateDetected}
            </Text>
          </View>
        </CardContent>
        <CardFooter>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: colors.primary[500] },
            ]}
            onPress={handleFindMechanic}
          >
            <Text style={styles.actionButtonText}>Find Mechanics</Text>
          </TouchableOpacity>
        </CardFooter>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    marginLeft: 12,
  },
  vehicleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: "600",
  },
  vehicleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  vehicleBadgeText: {
    fontSize: 12,
    fontWeight: "500",
  },
  vehicleDetails: {
    marginBottom: 8,
  },
  vehicleDetailItem: {
    marginBottom: 8,
  },
  vehicleDetailLabel: {
    fontSize: 14,
    marginBottom: 2,
  },
  vehicleDetailValue: {
    fontSize: 16,
    fontWeight: "500",
  },
  diagnosticHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  severityText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "600",
  },
  diagnosticTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  diagnosticDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  diagnosticMeta: {
    marginTop: 8,
  },
  diagnosticMetaText: {
    fontSize: 14,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
});
