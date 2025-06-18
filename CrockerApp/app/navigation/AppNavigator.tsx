"use client";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useColorScheme } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";

// Screens
import HomeScreen from "../screens/Home";
import FindMechanicsScreen from "../screens/FindMechanics";
// import MechanicProfileScreen from '../screens/MechanicProfile'
// import AppointmentsScreen from '../screens/Appointment'
import VehicleProfilesScreen from "../screens/VehicleProfiles";
// // import VehicleDetailScreen from '../screens/VehicleDetailScreen'
import BookAppointmentScreen from "../screens/BookAppointment";
import LoginScreen from "../screens/Login";
import SignupScreen from "../screens/Signup";
// import DriverOnboardingScreen from '../screens/driverOnBoarding'
// import MechanicSignupScreen from '../screens/MechanicSignUp'
// import MechanicDashboardScreen from '../screens/MechanicDashboard'
import DiagnosticsDetailScreen from "../screens/dtcDetails";
import ScanDevicesScreen from "../screens/ScanDevices";
import AddVehicleScreen from "../screens/AddVehicle";
import { colors } from "../theme/colors";

export type RootStackParamList = {
  FindMechanics: { diagnosticCode: string };
  Main: undefined; // Add Main route
  Login: undefined;
  Signup: undefined;
  MechanicProfile: undefined;
  BookAppointment: undefined;
  VehicleDetail: undefined;
  Appointments: undefined;
  DriverOnboarding: undefined;
  MechanicSignup: undefined;
  MechanicDashboard: undefined;
  DiagnosticsDetail: {
    userId: number;
    carId: number;
    diagnosticCode: string;
  };
  ScanDevices: undefined;
  AddVehicle: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary[500],
        tabBarInactiveTintColor: isDark ? colors.gray[400] : colors.gray[500],
        tabBarStyle: {
          backgroundColor: isDark ? colors.gray[900] : colors.white,
          borderTopColor: isDark ? colors.gray[800] : colors.gray[200],
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="FindMechanics"
        component={FindMechanicsScreen}
        options={{
          title: "Find Mechanics",
          tabBarIcon: ({ color, size }) => (
            <Feather name="search" size={size} color={color} />
          ),
        }}
      />
      {/* <Tab.Screen
        name='Appointments'
        component={AppointmentsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Feather name='calendar' size={size} color={color} />,
        }}
      /> */}
      <Tab.Screen
        name="Vehicles"
        component={VehicleProfilesScreen}
        options={{
          title: "My Vehicles",
          tabBarIcon: ({ color, size }) => (
            <Feather name="truck" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null; // Or a loading screen
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          {/* <Stack.Screen
            name='MechanicProfile'
            component={MechanicProfileScreen}
            options={{ headerShown: true, title: 'Mechanic Details' }}
          /> */}
          {/* <Stack.Screen
            name='VehicleDetail'
            component={VehicleDetailScreen}
            options={{ headerShown: true, title: 'Vehicle Details' }}
          /> */}
          <Stack.Screen
            name="BookAppointment"
            component={BookAppointmentScreen}
            options={{ headerShown: true, title: "Book Appointment" }}
          />
          {/* <Stack.Screen
            name='MechanicDashboard'
            component={MechanicDashboardScreen}
            options={{ headerShown: true, title: 'Mechanic Dashboard' }}
          /> */}
          <Stack.Screen
            name="DiagnosticsDetail"
            component={DiagnosticsDetailScreen}
            options={{ headerShown: true, title: "Diagnostic Details" }}
          />
          <Stack.Screen name="ScanDevices" component={ScanDevicesScreen} />
          <Stack.Screen
            name="AddVehicle"
            component={AddVehicleScreen}
            options={{ headerShown: false }}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          {/* <Stack.Screen name='DriverOnboarding' component={DriverOnboardingScreen} />
          <Stack.Screen name='MechanicSignup' component={MechanicSignupScreen} /> */}
        </>
      )}
    </Stack.Navigator>
  );
}
