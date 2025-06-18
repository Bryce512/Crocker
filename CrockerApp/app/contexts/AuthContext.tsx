import React, { createContext, useContext, useState, useEffect } from "react";
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import firebaseService from "../services/firebaseService";

type AuthContextType = {
  user: FirebaseAuthTypes.User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (
    email: string,
    password: string
  ) => Promise<{ error: any; user: FirebaseAuthTypes.User | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load stored user data when app starts
  useEffect(() => {
    // Check for stored credentials on startup
    const loadStoredUser = async () => {
      try {
        const storedUserData = await AsyncStorage.getItem("userData");
        if (storedUserData) {
          setUser(JSON.parse(storedUserData));
        }
      } catch (error) {
        console.error("Failed to load authentication state:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredUser();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      // Your existing sign in logic
      const response = await firebaseService.signIn(email, password);

      // If login successful, store user data
      if (response.user && !response.error) {
        await AsyncStorage.setItem("userData", JSON.stringify(response.user));
        setUser(response.user);
      }

      return response;
    } catch (error) {
      return { error };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      // Your existing sign up logic
      const response = await firebaseService.signUp(email, password);

      // If signup successful, store user data
      if (response.user && !response.error) {
        await AsyncStorage.setItem("userData", JSON.stringify(response.user));
        setUser(response.user);
        return { user: response.user, error: null };
      }

      // If signup failed, ensure both user and error are present
      return { user: null, error: response.error ?? "Unknown error" };
    } catch (error) {
      return { user: null, error };
    }
  };

  const signOut = async () => {
    try {
      // Your existing sign out logic
      await firebaseService.signOut();

      // Clear stored user data
      await AsyncStorage.removeItem("userData");
      setUser(null);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
