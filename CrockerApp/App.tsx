import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthProvider } from "./app/contexts/AuthContext";
import { ThemeProvider } from "./app/components1/theme-provider";
import firebaseService from "./app/services/firebaseService";
import { View, Text } from "react-native";
import AppNavigator from "./app/navigation/AppNavigator";
import { BluetoothProvider } from "./app/contexts/BluetoothContext";
import { CalendarProvider } from "./app/contexts/CalendarContext";
import { SafeAreaView } from "react-native-safe-area-context";

const Stack = createNativeStackNavigator();

export default function App() {
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Firebase at app startup
  useEffect(() => {
    const initApp = async () => {
      try {
        await firebaseService.initializeFirebase();
        console.log("Firebase initialized at app level");
        setFirebaseReady(true);
      } catch (error: any) {
        // Handle default app already configured error as success
        if (
          error.message?.includes("Default app has already been configured")
        ) {
          console.log("Firebase was already initialized by native code");
          setFirebaseReady(true);
        } else {
          console.error("Failed to initialize Firebase at app level:", error);
          setError(error.message);
        }
      }
    };

    initApp();
  }, []);

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Failed to initialize app: {error}</Text>
      </View>
    );
  }

  if (!firebaseReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <BluetoothProvider>
          <CalendarProvider>
            <NavigationContainer>
              <SafeAreaView style={{ flex: 1 }}>
                <AppNavigator />
              </SafeAreaView>
            </NavigationContainer>
          </CalendarProvider>
        </BluetoothProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
