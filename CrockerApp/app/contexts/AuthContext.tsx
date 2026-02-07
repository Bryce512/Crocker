import React, { createContext, useContext, useState, useEffect } from "react";
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import firebaseService from "../services/firebaseService";
import AppErrorService from "../services/errorService";
import { User, AppError } from "../models";

type AuthContextType = {
  user: FirebaseAuthTypes.User | null;
  isLoading: boolean;
  error: AppError | null;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: AppError }>;
  signUp: (
    email: string,
    password: string,
    name: string,
  ) => Promise<{
    success: boolean;
    user?: FirebaseAuthTypes.User;
    error?: AppError;
  }>;
  signInWithApple: (credential: {
    identityToken: string;
    nonce: string;
    displayName?: string;
    firstName?: string;
    lastName?: string;
  }) => Promise<{ success: boolean; error?: AppError }>;
  signOut: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);

  const clearError = () => setError(null);

  // Set up Firebase auth state listener
  useEffect(() => {
    console.log("🔄 Setting up Firebase auth state listener...");

    const setupAuthListener = async () => {
      try {
        // First, try to restore user from AsyncStorage for faster startup
        try {
          const storedUserData = await AsyncStorage.getItem("userData");
          if (storedUserData) {
            const userData = JSON.parse(storedUserData);
            console.log("📱 Restored user from AsyncStorage:", userData.uid);
            // Note: We don't set the user here, we let Firebase auth handle it
            // This is just for logging/debugging purposes
          }
        } catch (storageError) {
          console.log("No stored user data found");
        }

        // Ensure Firebase is initialized
        await firebaseService.initializeFirebase();

        // Set up auth state listener
        const unsubscribe = firebaseService.onAuthChange((user) => {
          console.log(
            "🔍 Auth state changed:",
            user ? `User: ${user.uid}` : "No user",
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
              }),
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
      // Validate input first
      const emailError = AppErrorService.validateEmail(email);
      if (emailError) {
        setError(emailError);
        return { success: false, error: emailError };
      }

      const passwordError = AppErrorService.validatePassword(password);
      if (passwordError) {
        setError(passwordError);
        return { success: false, error: passwordError };
      }

      console.log("🔄 Signing in user...");
      const response = await firebaseService.signIn(email, password);

      if (response.user && !response.error) {
        console.log("✅ Sign in successful");
        setError(null);
        return { success: true };
      }

      console.log("❌ Sign in failed:", response.error);
      const appError = AppErrorService.handleFirebaseAuthError(response.error);
      setError(appError);
      return { success: false, error: appError };
    } catch (error) {
      console.error("❌ Sign in error:", error);
      const appError = AppErrorService.handleFirebaseAuthError(error);
      setError(appError);
      return { success: false, error: appError };
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      // Validate input first
      const emailError = AppErrorService.validateEmail(email);
      if (emailError) {
        setError(emailError);
        return { success: false, error: emailError };
      }

      const passwordError = AppErrorService.validatePassword(password);
      if (passwordError) {
        setError(passwordError);
        return { success: false, error: passwordError };
      }

      console.log("🔄 Signing up user...");
      const response = await firebaseService.signUp(email, password, name);

      if (response.user && !response.error) {
        console.log("✅ Sign up successful");
        setError(null);
        return { success: true, user: response.user };
      }

      console.log("❌ Sign up failed:", response.error);
      const appError = AppErrorService.handleFirebaseAuthError(response.error);
      setError(appError);
      return { success: false, error: appError };
    } catch (error) {
      console.error("❌ Sign up error:", error);
      const appError = AppErrorService.handleFirebaseAuthError(error);
      setError(appError);
      return { success: false, error: appError };
    }
  };

  const signOut = async () => {
    try {
      console.log("🔄 Signing out user...");
      await firebaseService.signOut();
      setError(null); // Clear any errors on sign out
      console.log("✅ User signed out successfully");
    } catch (error) {
      console.error("❌ Sign out error:", error);
      const appError = AppErrorService.handleDataError(error, "signout");
      setError(appError);
    }
  };

  const signInWithApple = async (credential: {
    identityToken: string;
    nonce: string;
  }) => {
    try {
      console.log("🔄 Signing in with Apple...");
      const response = await firebaseService.signInWithApple(credential);

      if (response.user && !response.error) {
        setError(null);
        return { success: true };
      }

      console.log("❌ Apple sign-in failed:", response.error);
      const appError = AppErrorService.handleFirebaseAuthError(response.error);
      setError(appError);
      return { success: false, error: appError };
    } catch (error) {
      console.error("❌ Apple sign-in error:", error);
      const appError = AppErrorService.handleFirebaseAuthError(error);
      setError(appError);
      return { success: false, error: appError };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        signIn,
        signUp,
        signInWithApple,
        signOut,
        clearError,
      }}
    >
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
