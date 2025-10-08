"use client";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../contexts/AuthContext";
import ErrorBoundary from "../components/ErrorBoundary";

// Screens
import LoginScreen from "../screens/Login";
import SignupScreen from "../screens/Signup";
import DeviceConnection from "../screens/ScanDevices";
import CalendarScreen from "../screens/Calendar";
import EventCreation from "../screens/NewEvent";

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  ScanDevices: undefined;
  CalendarScreen: undefined;
  EventCreation: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null; // Or a loading screen
  }

  return (
    <ErrorBoundary>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="CalendarScreen" component={CalendarScreen} />
            <Stack.Screen name="ScanDevices" component={DeviceConnection} />
            <Stack.Screen name="EventCreation" component={EventCreation} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        )}
      </Stack.Navigator>
    </ErrorBoundary>
  );
}
