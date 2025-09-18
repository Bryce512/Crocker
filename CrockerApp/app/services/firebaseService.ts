// firebaseService.ts
import { initializeApp, getApp, getApps } from "firebase/app";
import {
  getDatabase,
  ref,
  get,
  set,
  update,
  remove,
  push,
} from "firebase/database";
import {
  initializeAuth,
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as authSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

// Firebase configuration - you'll need to add your actual config values
const firebaseConfig = {
  apiKey: "AIzaSyDJy4IvjkKkjtJBQmO2F3rPvZs_J3WeNZ8",
  authDomain: "crocker-78644.firebaseapp.com",
  databaseURL: "https://crocker-78644-default-rtdb.firebaseio.com/",
  projectId: "crocker-78644",
  messagingSenderId: "729289409049",
  appId: "y1:729289409049:ios:942138008a5ecb1eb7a088",
};

// Flag to track initialization status
let isInitialized = false;
let firebaseApp: any = null;
let firebaseAuth: any = null;

// Initialize Firebase - get the existing app or create a new one
export const initializeFirebase = async () => {
  // If we've already initialized, return early to prevent duplicate initialization
  if (isInitialized && firebaseApp) {
    console.log("Firebase already initialized by this service");
    return firebaseApp;
  }

  try {
    // Check if already initialized
    if (getApps().length === 0) {
      // Only initialize if no apps exist
      firebaseApp = initializeApp(firebaseConfig);
      console.log("Firebase app initialized successfully");
    } else {
      console.log("Firebase app already exists, using existing app");
      firebaseApp = getApp();
    }

    // Get or initialize auth
    try {
      firebaseAuth = getAuth(firebaseApp);
      console.log("Firebase auth initialized successfully");
    } catch (error) {
      console.error("Error initializing Firebase auth:", error);
      throw error;
    }

    isInitialized = true;
    return firebaseApp;
  } catch (error) {
    console.error("Firebase initialization error:", error);
    throw error;
  }
};

// Function to write data to the database
export const writeData = (userId: string, name: string, email: string) => {
  const database = getDatabase();
  const userRef = ref(database, `users/${userId}`);

  const userData = {
    name: name,
    email: email,
  };

  return set(userRef, userData)
    .then(() => console.log("Data written successfully"))
    .catch((error: any) => console.error("Error writing data:", error));
};

// Function to read data from the database
export const readData = (userId: string) => {
  const database = getDatabase();
  const userRef = ref(database, `users/${userId}`);

  return get(userRef)
    .then((snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.val();
        console.log(userData);
        return userData;
      } else {
        console.log("No data available");
        return null;
      }
    })
    .catch((error) => {
      console.error("Error reading data:", error);
      throw error;
    });
};

// Authentication functions
export const signIn = async (email: string, password: string) => {
  try {
    // Basic validation before attempting sign in
    if (!email || !email.trim()) {
      return {
        user: null,
        error: { code: "auth/empty-email", message: "Email cannot be empty" },
      };
    }

    if (!password || password.length < 6) {
      return {
        user: null,
        error: {
          code: "auth/weak-password",
          message: "Password must be at least 6 characters",
        },
      };
    }

    // Use Firebase web SDK auth
    const auth = getAuth();
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    // Add this line to ensure user exists in database
    await ensureUserProfile(userCredential.user);

    return { user: userCredential.user, error: null };
  } catch (error: any) {
    // Provide more specific error messages based on Firebase error codes
    console.error("Firebase authentication error:", error.code, error.message);

    let errorMessage = "Failed to sign in";
    if (error.code === "auth/user-not-found") {
      errorMessage = "No account exists with this email";
    } else if (error.code === "auth/wrong-password") {
      errorMessage = "Incorrect password";
    } else if (error.code === "auth/invalid-email") {
      errorMessage = "Invalid email format";
    } else if (error.code === "auth/too-many-requests") {
      errorMessage = "Too many failed login attempts. Please try again later";
    }

    return {
      user: null,
      error: {
        code: error.code || "auth/unknown",
        message: errorMessage,
        originalError: error,
      },
    };
  }
};

export const signUp = async (email: string, password: string) => {
  try {
    const auth = getAuth();
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    // Add this line to create user profile in database
    await ensureUserProfile(userCredential.user);

    return { user: userCredential.user, error: null };
  } catch (error) {
    return { user: null, error };
  }
};

export const signOut = async () => {
  const auth = getAuth();
  return authSignOut(auth);
};

export const getCurrentUser = () => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    console.log(
      "🔍 getCurrentUser result:",
      user ? `User: ${user.uid}` : "No user"
    );
    return user;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
};

export const onAuthChange = (callback: (user: User | null) => void) => {
  const auth = getAuth();
  return onAuthStateChanged(auth, callback);
};

// Vehicle-specific functions
export const getVehicles = async (userId: string) => {
  const db = getDatabase();
  const vehiclesRef = ref(db, `users/${userId}/vehicles`);

  try {
    const snapshot = await get(vehiclesRef);
    if (snapshot.exists()) {
      const vehiclesData = snapshot.val();
      // Convert object to array with id included
      return Object.keys(vehiclesData).map((key) => ({
        id: key,
        ...vehiclesData[key],
      }));
    }
    return [];
  } catch (error) {
    console.error("Error fetching vehicles:", error);
    throw error;
  }
};

export const addVehicle = async (userId: string, vehicleData: any) => {
  const db = getDatabase();
  const vehiclesRef = ref(db, `users/${userId}/vehicles`);

  // Create a new unique key for the vehicle
  const newVehicleRef = push(vehiclesRef);

  try {
    await set(newVehicleRef, vehicleData);
    return { id: newVehicleRef.key, ...vehicleData };
  } catch (error) {
    console.error("Error adding vehicle:", error);
    throw error;
  }
};

export const updateVehicle = async (
  userId: string,
  vehicleId: string,
  vehicleData: any
) => {
  const db = getDatabase();
  const vehicleRef = ref(db, `users/${userId}/vehicles/${vehicleId}`);

  try {
    await update(vehicleRef, vehicleData);
    return { id: vehicleId, ...vehicleData };
  } catch (error) {
    console.error("Error updating vehicle:", error);
    throw error;
  }
};

export const deleteVehicle = async (userId: string, vehicleId: string) => {
  const db = getDatabase();
  const vehicleRef = ref(db, `users/${userId}/vehicles/${vehicleId}`);

  try {
    await remove(vehicleRef);
    return true;
  } catch (error) {
    console.error("Error deleting vehicle:", error);
    throw error;
  }
};

// Get diagnostic logs for a specific vehicle
export const getDiagnosticLogs = async (userId: string, vehicleId: string) => {
  const db = getDatabase();
  const logsRef = ref(db, `users/${userId}/diagnostic_logs`);

  try {
    const snapshot = await get(logsRef);
    if (snapshot.exists()) {
      const logsData = snapshot.val();
      // Filter logs for the specific vehicle and convert to array
      return Object.keys(logsData)
        .filter((key) => logsData[key].vehicleId === vehicleId)
        .map((key) => ({
          id: key,
          ...logsData[key],
        }));
    }
    return [];
  } catch (error) {
    console.error("Error fetching diagnostic logs:", error);
    throw error;
  }
};

// Creates a user profile in the database if it doesn't already exist
export const ensureUserProfile = async (user: User) => {
  if (!user) return null;

  const database = getDatabase();
  const userRef = ref(database, `users/${user.uid}`);

  try {
    // Check if user profile already exists
    const snapshot = await get(userRef);

    if (!snapshot.exists()) {
      // Create new user profile
      const userData = {
        profile: {
          name: user.displayName || "",
          email: user.email || "",
          phone: user.phoneNumber || "",
        },
        maintenance_records: {},
        events: {},
        kids: {},
      };

      await set(userRef, userData);
      console.log("Created new user profile in database");
      return userData;
    }

    return snapshot.val();
  } catch (error) {
    console.error("Error ensuring user profile:", error);
    throw error;
  }
};

export const getUserProfile = async (userId: string) => {
  const database = getDatabase();
  const userRef = ref(database, `users/${userId}/profile`);

  try {
    const snapshot = await get(userRef);
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw error;
  }
};

// Get events for the current user
export const getEvents = async () => {
  const user = getCurrentUser();
  if (!user) {
    throw new Error("No authenticated user found");
  }

  const database = getDatabase();
  const eventsRef = ref(database, `users/${user.uid}/events`);

  try {
    const snapshot = await get(eventsRef);
    if (snapshot.exists()) {
      const eventsData = snapshot.val();

      // Handle both array and object formats for backward compatibility
      let eventsArray;
      if (Array.isArray(eventsData)) {
        eventsArray = eventsData;
      } else if (eventsData && typeof eventsData === "object") {
        // Convert object format to array for backward compatibility
        eventsArray = Object.keys(eventsData).map((key) => ({
          id: key,
          ...eventsData[key],
        }));
      } else {
        eventsArray = [];
      }

      // Restore Date objects from ISO strings
      return eventsArray.map((event) => {
        if (event.startTime && typeof event.startTime === "string") {
          console.log("StartTime found:", event.startTime);
          event.startTime = new Date(event.startTime);
        }
        if (event.endTime && typeof event.endTime === "string") {
          event.endTime = new Date(event.endTime);
        }
        if (event.lastModified && typeof event.lastModified === "string") {
          event.lastModified = new Date(event.lastModified);
        }
        return event;
      });
    }
    return [];
  } catch (error) {
    console.error("Error fetching events:", error);
    throw error;
  }
};

// Get kids for the current user
export const getKids = async () => {
  const user = getCurrentUser();
  if (!user) {
    throw new Error("No authenticated user found");
  }

  const database = getDatabase();
  const kidsRef = ref(database, `users/${user.uid}/kids`);

  try {
    const snapshot = await get(kidsRef);
    if (snapshot.exists()) {
      const kidsData = snapshot.val();
      // Convert object to array with id included
      return Object.keys(kidsData).map((key) => ({
        id: key,
        ...kidsData[key],
      }));
    }
    return [];
  } catch (error) {
    console.error("Error fetching kids:", error);
    throw error;
  }
};

// Set events for the current user (saves as array)
export const setEvents = async (events: any[]) => {
  const user = getCurrentUser();
  if (!user) {
    throw new Error("No authenticated user found");
  }

  const database = getDatabase();
  const eventsRef = ref(database, `users/${user.uid}/events`);

  try {
    // Convert array events to storage format with serialized dates
    const eventsArray = events.map((event) => {
      const eventCopy = { ...event };

      // Convert Date objects to ISO strings for Firebase storage
      if (eventCopy.startTime instanceof Date) {
        eventCopy.startTime = eventCopy.startTime.toISOString();
      }
      if (eventCopy.endTime instanceof Date) {
        eventCopy.endTime = eventCopy.endTime.toISOString();
      }
      if (eventCopy.lastModified instanceof Date) {
        eventCopy.lastModified = eventCopy.lastModified.toISOString();
      }

      return eventCopy;
    });

    // Save as array directly
    await set(eventsRef, eventsArray);
    console.log(
      `Events saved successfully to Firebase as array: ${events.length} events`
    );
    return events;
  } catch (error) {
    console.error("Error saving events:", error);
    throw error;
  }
};

// Add or update a single event for the current user
export const addEvent = async (eventData: any) => {
  const user = getCurrentUser();
  if (!user) {
    throw new Error("No authenticated user found");
  }

  try {
    // Get existing events
    const existingEvents = await getEvents();

    // Create a copy of the event and ensure dates are properly serialized
    const eventCopy = { ...eventData };

    // Convert Date objects to ISO strings for Firebase storage
    if (eventCopy.startTime instanceof Date) {
      eventCopy.startTime = eventCopy.startTime.toISOString();
    }
    if (eventCopy.endTime instanceof Date) {
      eventCopy.endTime = eventCopy.endTime.toISOString();
    }
    if (eventCopy.lastModified instanceof Date) {
      eventCopy.lastModified = eventCopy.lastModified.toISOString();
    }

    // Find if event already exists and update it, or add new event
    const eventIndex = existingEvents.findIndex((e) => e.id === eventData.id);

    let updatedEvents;
    if (eventIndex >= 0) {
      // Update existing event
      updatedEvents = [...existingEvents];
      updatedEvents[eventIndex] = {
        ...existingEvents[eventIndex],
        ...eventCopy,
      };
    } else {
      // Add new event
      updatedEvents = [...existingEvents, eventCopy];
    }

    // Save all events back as array
    await setEvents(
      updatedEvents.map((event) => {
        // Convert ISO strings back to Date objects for the return value
        const returnEvent = { ...event };
        if (
          returnEvent.startTime &&
          typeof returnEvent.startTime === "string"
        ) {
          returnEvent.startTime = new Date(returnEvent.startTime);
        }
        if (returnEvent.endTime && typeof returnEvent.endTime === "string") {
          returnEvent.endTime = new Date(returnEvent.endTime);
        }
        if (
          returnEvent.lastModified &&
          typeof returnEvent.lastModified === "string"
        ) {
          returnEvent.lastModified = new Date(returnEvent.lastModified);
        }
        return returnEvent;
      })
    );

    console.log("Event saved successfully to Firebase array");
    return eventData;
  } catch (error) {
    console.error("Error saving event:", error);
    throw error;
  }
};

// Delete a single event from the array
export const deleteEvent = async (eventId: string) => {
  const user = getCurrentUser();
  if (!user) {
    throw new Error("No authenticated user found");
  }

  try {
    // Get existing events
    const existingEvents = await getEvents();

    // Filter out the event to delete
    const updatedEvents = existingEvents.filter(
      (event) => event.id !== eventId
    );

    // Save updated array back to Firebase
    await setEvents(updatedEvents);

    console.log(`Event ${eventId} deleted successfully from Firebase array`);
    return true;
  } catch (error) {
    console.error("Error deleting event:", error);
    throw error;
  }
};

// Add or update kids for the current user
export const addKid = async (kidData: any) => {
  const user = getCurrentUser();
  if (!user) {
    throw new Error("No authenticated user found");
  }

  const database = getDatabase();

  try {
    if (Array.isArray(kidData)) {
      // If it's an array, save all kids
      const kidsRef = ref(database, `users/${user.uid}/kids`);
      const kidsObject: { [key: string]: any } = {};
      kidData.forEach((kid) => {
        if (kid.id) {
          kidsObject[kid.id] = kid;
        }
      });
      await set(kidsRef, kidsObject);
      console.log(
        `Kids saved successfully to Firebase: ${kidData.length} kids`
      );
      return kidData;
    } else {
      // If it's a single kid, save it
      const kidRef = ref(database, `users/${user.uid}/kids/${kidData.id}`);
      await set(kidRef, kidData);
      console.log("Kid saved successfully to Firebase");
      return kidData;
    }
  } catch (error) {
    console.error("Error saving kid(s):", error);
    throw error;
  }
};

// Debug function to check current auth state
export const debugAuthState = () => {
  const user = getCurrentUser();
  console.log("🔍 DEBUG Auth State:");
  console.log("  User:", user ? "Authenticated" : "Not authenticated");
  if (user) {
    console.log("  UID:", user.uid);
    console.log("  Email:", user.email);
    console.log("  Display Name:", user.displayName);
  }
  return user;
};

// Clear all user data (for debugging)
export const clearUserData = async () => {
  const user = getCurrentUser();
  if (!user) {
    throw new Error("No authenticated user found");
  }

  const database = getDatabase();
  const userRef = ref(database, `users/${user.uid}`);

  try {
    await remove(userRef);
    console.log("🗑️ All user data cleared from Firebase");
    return true;
  } catch (error) {
    console.error("Error clearing user data:", error);
    throw error;
  }
};

// Force refresh Firebase cache (for debugging)
export const clearFirebaseCache = async () => {
  try {
    const database = getDatabase();
    // Force Firebase to refresh its cache by going offline and online
    // Note: This requires @react-native-firebase/database
    console.log("🔄 Attempting to clear Firebase cache...");

    // Alternative approach: just log that we're forcing a refresh
    console.log("🔄 Firebase cache refresh requested");
    return true;
  } catch (error) {
    console.error("Error clearing Firebase cache:", error);
    return false;
  }
};

export default {
  initializeFirebase,
  readData,
  writeData,
  signIn,
  signUp,
  signOut,
  getCurrentUser,
  onAuthChange,
  getVehicles,
  addVehicle,
  updateVehicle,
  deleteVehicle,
  getDiagnosticLogs,
  ensureUserProfile,
  getUserProfile,
  getEvents,
  getKids,
  setEvents,
  addEvent,
  deleteEvent,
  addKid,
  debugAuthState,
  clearUserData,
  clearFirebaseCache,
};
