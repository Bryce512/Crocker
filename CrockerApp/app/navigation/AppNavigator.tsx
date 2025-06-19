"use client";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useColorScheme } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";

// Screens
import LoginScreen from "../screens/Login";
import SignupScreen from "../screens/Signup";
import DeviceConnection from "../screens/ScanDevices";
import Home from "../screens/Home";
import CalendarScreen from "../screens/Calendar";
import EventCreation from "../screens/NewEvent";

import { colors } from "../theme/colors";

export type RootStackParamList = {
  FindMechanics: { diagnosticCode: string };
  Login: undefined;
  Signup: undefined;
  ScanDevices: undefined;
  Home: undefined;
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
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <></>
      ) : (
        <>
          <Stack.Screen name="ScanDevices" component={DeviceConnection} />
          <Stack.Screen name="Home" component={Home} />
          <Stack.Screen name="CalendarScreen" component={CalendarScreen} />
          <Stack.Screen name="EventCreation" component={EventCreation} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          {/* <Stack.Screen name='DriverOnboarding' component={DriverOnboardingScreen} />
          <Stack.Screen name='MechanicSignup' component={MechanicSignupScreen} /> */}
        </>
      )}
    </Stack.Navigator>
  );
}
