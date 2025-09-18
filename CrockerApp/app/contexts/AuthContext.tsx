import React, { createContext, useContext, useState, useEffect } from "react";
import type { User } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import firebaseService from "../services/firebaseService";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (
    email: string,
    password: string
  ) => Promise<{ error: any; user: User | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Set up Firebase auth state listener
  useEffect(() => {
    console.log("🔄 Setting up Firebase auth state listener...");

    const setupAuthListener = async () => {
      try {
        // Ensure Firebase is initialized
        await firebaseService.initializeFirebase();

        // Set up auth state listener
        const unsubscribe = firebaseService.onAuthChange((user) => {
          console.log(
            "🔍 Auth state changed:",
            user ? `User: ${user.uid}` : "No user"
          );
          setUser(user);
          setIsLoading(false);

          // Store/clear user data in AsyncStorage
          if (user) {
            AsyncStorage.setItem(
              "userData",
              JSON.stringify({
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
              })
            );
          } else {
            AsyncStorage.removeItem("userData");
          }
        });

        return unsubscribe;
      } catch (error) {
        console.error("Failed to set up auth listener:", error);
        setIsLoading(false);
      }
    };

    const unsubscribePromise = setupAuthListener();

    // Cleanup function
    return () => {
      unsubscribePromise.then((unsubscribe) => {
        if (unsubscribe) {
          unsubscribe();
        }
      });
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log("🔄 Signing in user...");
      const response = await firebaseService.signIn(email, password);

      if (response.user && !response.error) {
        console.log("✅ Sign in successful");
        // The auth state listener will handle setting the user
        return { error: null };
      }

      console.log("❌ Sign in failed:", response.error);
      return { error: response.error };
    } catch (error) {
      console.error("❌ Sign in error:", error);
      return { error };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      console.log("🔄 Signing up user...");
      const response = await firebaseService.signUp(email, password);

      if (response.user && !response.error) {
        console.log("✅ Sign up successful");
        // The auth state listener will handle setting the user
        return { user: response.user, error: null };
      }

      console.log("❌ Sign up failed:", response.error);
      return { user: null, error: response.error ?? "Unknown error" };
    } catch (error) {
      console.error("❌ Sign up error:", error);
      return { user: null, error };
    }
  };

  const signOut = async () => {
    try {
      console.log("🔄 Signing out user...");
      await firebaseService.signOut();
      // The auth state listener will handle clearing the user
      console.log("✅ User signed out successfully");
    } catch (error) {
      console.error("❌ Sign out error:", error);
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
