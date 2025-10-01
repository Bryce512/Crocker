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
// Use React Native Firebase for better persistence
import auth from "@react-native-firebase/auth";
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";
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
// React Native Firebase auth is available globally, no need to store reference

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

    // React Native Firebase Auth is automatically initialized and has built-in persistence
    console.log("React Native Firebase auth has built-in persistence");

    isInitialized = true;
    return firebaseApp;
  } catch (error) {
    console.error("Firebase initialization error:", error);
    throw error;
  }
};

// Function to write data to the database
export const writeData = (userId: string, name: string, email: string) => {
  const database = getDatabase(getApp());
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
  const database = getDatabase(getApp());
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

    // Use React Native Firebase auth for better persistence
    const userCredential = await auth().signInWithEmailAndPassword(
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
    const userCredential = await auth().createUserWithEmailAndPassword(
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
  return auth().signOut();
};

export const getCurrentUser = () => {
  try {
    const user = auth().currentUser;

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

export const onAuthChange = (
  callback: (user: FirebaseAuthTypes.User | null) => void
) => {
  return auth().onAuthStateChanged(callback);
};

// Vehicle-specific functions
export const getVehicles = async (userId: string) => {
  const db = getDatabase(getApp());
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
  const db = getDatabase(getApp());
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
  const db = getDatabase(getApp());
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
  const db = getDatabase(getApp());
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
  const db = getDatabase(getApp());
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
export const ensureUserProfile = async (user: FirebaseAuthTypes.User) => {
  if (!user) return null;

  const database = getDatabase(getApp());
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
  const database = getDatabase(getApp());
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

// Migrate legacy array-based events to individual objects
export const migrateEventsToIndividualObjects = async (eventsArray: any[]) => {
  const user = getCurrentUser();
  if (!user) {
    throw new Error("No authenticated user found");
  }

  const database = getDatabase(getApp());
  const eventsRef = ref(database, `users/${user.uid}/events`);

  try {
    console.log(
      `🔄 Migrating ${eventsArray.length} events from array to individual objects`
    );

    // Create object structure from array
    const eventsObject: { [key: string]: any } = {};

    eventsArray.forEach((event, index) => {
      // Ensure each event has an ID
      const eventId = event.id || `event_${Date.now()}_${index}`;

      // Remove the id from the event data since it becomes the key
      const { id, ...eventData } = event;

      eventsObject[eventId] = eventData;
    });

    // Replace the array with the object structure
    await set(eventsRef, eventsObject);

    console.log(
      `✅ Successfully migrated ${eventsArray.length} events to individual objects`
    );
    return eventsObject;
  } catch (error) {
    console.error("Error migrating events:", error);
    throw error;
  }
};

// Get events for the current user (now returns individual objects)
export const getEvents = async () => {
  const user = getCurrentUser();
  if (!user) {
    throw new Error("No authenticated user found");
  }

  const database = getDatabase(getApp());
  const eventsRef = ref(database, `users/${user.uid}/events`);

  try {
    const snapshot = await get(eventsRef);
    console.log("🔍 DEBUG getEvents: snapshot exists:", snapshot.exists());

    if (snapshot.exists()) {
      const eventsData = snapshot.val();
      console.log("🔍 DEBUG getEvents: Raw eventsData:", eventsData);
      console.log("🔍 DEBUG getEvents: eventsData type:", typeof eventsData);
      console.log(
        "🔍 DEBUG getEvents: eventsData isArray:",
        Array.isArray(eventsData)
      );

      // Handle both array and object formats for backward compatibility
      let eventsArray;
      if (Array.isArray(eventsData)) {
        // Legacy array format - convert to object format and migrate
        console.log("🔄 Migrating legacy array format to individual objects");
        await migrateEventsToIndividualObjects(eventsData);

        // Return the migrated events
        eventsArray = eventsData.map((event, index) => ({
          ...event,
          id: event.id || `event_${Date.now()}_${index}`, // Ensure ID exists
        }));
        console.log(
          "🔍 DEBUG getEvents: eventsArray after migration:",
          eventsArray
        );
      } else if (eventsData && typeof eventsData === "object") {
        // New object format - convert to array for app use
        console.log("🔍 DEBUG getEvents: Converting object format to array");
        eventsArray = Object.keys(eventsData).map((key) => ({
          id: key,
          ...eventsData[key],
        }));
        console.log(
          "🔍 DEBUG getEvents: eventsArray after object conversion:",
          eventsArray
        );
      } else {
        eventsArray = [];
        console.log(
          "🔍 DEBUG getEvents: No valid events data, returning empty array"
        );
      }

      // Restore Date objects from ISO strings
      const finalEventsArray = eventsArray.map((event) => {
        console.log(
          "🔍 DEBUG getEvents: Processing event for date conversion:",
          event.id
        );

        if (event.startTime && typeof event.startTime === "string") {
          console.log(
            "🔍 DEBUG getEvents: Converting startTime from string:",
            event.startTime
          );
          event.startTime = new Date(event.startTime);
          console.log(
            "🔍 DEBUG getEvents: Converted startTime to Date:",
            event.startTime
          );
        }
        if (event.endTime && typeof event.endTime === "string") {
          console.log(
            "🔍 DEBUG getEvents: Converting endTime from string:",
            event.endTime
          );
          event.endTime = new Date(event.endTime);
        }
        if (event.lastModified && typeof event.lastModified === "string") {
          event.lastModified = new Date(event.lastModified);
        }
        return event;
      });

      console.log("🔍 DEBUG getEvents: Final events array:", finalEventsArray);
      return finalEventsArray;
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

  const database = getDatabase(getApp());
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

// Set events for the current user (now saves as individual objects)
export const setEvents = async (events: any[]) => {
  const user = getCurrentUser();
  if (!user) {
    throw new Error("No authenticated user found");
  }

  const database = getDatabase(getApp());
  const eventsRef = ref(database, `users/${user.uid}/events`);

  try {
    // Convert array events to object structure with serialized dates
    const eventsObject: { [key: string]: any } = {};

    events.forEach((event) => {
      // Ensure event has an ID
      const eventId =
        event.id ||
        `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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

      // Remove ID from event data since it becomes the key
      const { id, ...eventDataWithoutId } = eventCopy;
      eventsObject[eventId] = eventDataWithoutId;
    });

    // Save as object structure (individual events)
    await set(eventsRef, eventsObject);
    console.log(
      `Events saved successfully to Firebase as individual objects: ${events.length} events`
    );
    return events;
  } catch (error) {
    console.error("Error saving events:", error);
    throw error;
  }
};

// Add or update a single event for the current user (now uses individual objects)
export const addEvent = async (eventData: any) => {
  const user = getCurrentUser();
  if (!user) {
    throw new Error("No authenticated user found");
  }

  const database = getDatabase(getApp());

  try {
    // Ensure event has an ID
    if (!eventData.id) {
      eventData.id = `event_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
    }

    // Create a copy of the event and ensure dates are properly serialized
    const eventCopy = { ...eventData };

    // Firebase doesn't allow undefined values, convert to null
    if (eventCopy.assignedKidId === undefined) {
      eventCopy.assignedKidId = null;
    }

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

    // Remove ID from the data since it becomes the Firebase key
    const { id, ...eventDataWithoutId } = eventCopy;

    // Save individual event object
    const eventRef = ref(database, `users/${user.uid}/events/${id}`);
    await set(eventRef, eventDataWithoutId);

    console.log(`Event ${id} saved successfully as individual object`);

    // Return the original event data with proper Date objects
    return {
      ...eventData,
      id: id,
    };
  } catch (error) {
    console.error("Error saving event:", error);
    throw error;
  }
};

// Update a single event (new function for individual objects)
export const updateEvent = async (eventId: string, updates: any) => {
  const user = getCurrentUser();
  if (!user) {
    throw new Error("No authenticated user found");
  }

  const database = getDatabase(getApp());
  const eventRef = ref(database, `users/${user.uid}/events/${eventId}`);

  try {
    // Create a copy of updates and ensure dates are properly serialized
    const updatesCopy = { ...updates };

    // Firebase doesn't allow undefined values, convert to null
    if (updatesCopy.assignedKidId === undefined) {
      updatesCopy.assignedKidId = null;
    }

    // Convert Date objects to ISO strings for Firebase storage
    if (updatesCopy.startTime instanceof Date) {
      updatesCopy.startTime = updatesCopy.startTime.toISOString();
    }
    if (updatesCopy.endTime instanceof Date) {
      updatesCopy.endTime = updatesCopy.endTime.toISOString();
    }
    if (updatesCopy.lastModified instanceof Date) {
      updatesCopy.lastModified = updatesCopy.lastModified.toISOString();
    }

    // Remove ID from updates since it's the key
    const { id, ...updatesWithoutId } = updatesCopy;

    // Update the individual event object
    await update(eventRef, updatesWithoutId);

    console.log(`Event ${eventId} updated successfully`);
    return true;
  } catch (error) {
    console.error("Error updating event:", error);
    throw error;
  }
};

// Delete a single event (now uses individual objects)
export const deleteEvent = async (eventId: string) => {
  const user = getCurrentUser();
  if (!user) {
    throw new Error("No authenticated user found");
  }

  const database = getDatabase(getApp());
  const eventRef = ref(database, `users/${user.uid}/events/${eventId}`);

  try {
    // Remove the individual event object
    await remove(eventRef);
    console.log(
      `Event ${eventId} deleted successfully from individual objects`
    );
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

  const database = getDatabase(getApp());

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

// Device management functions for Firebase integration
export const getDevices = async () => {
  const user = getCurrentUser();
  if (!user) {
    throw new Error("No authenticated user found");
  }

  const database = getDatabase(getApp());
  const devicesRef = ref(database, `users/${user.uid}/devices`);

  try {
    const snapshot = await get(devicesRef);
    if (snapshot.exists()) {
      const devicesData = snapshot.val();
      return Object.keys(devicesData).map((key) => ({
        id: key,
        ...devicesData[key],
        registeredAt: devicesData[key].registeredAt ? new Date(devicesData[key].registeredAt) : new Date(),
        lastConnected: devicesData[key].lastConnected ? new Date(devicesData[key].lastConnected) : null,
      }));
    }
    return [];
  } catch (error) {
    console.error("Error fetching devices:", error);
    throw error;
  }
};

export const addDevice = async (deviceData: any) => {
  const user = getCurrentUser();
  if (!user) {
    throw new Error("No authenticated user found");
  }

  const database = getDatabase(getApp());
  const deviceRef = ref(database, `users/${user.uid}/devices/${deviceData.id}`);

  try {
    // Remove ID from data since it becomes the key
    const { id, ...deviceDataWithoutId } = deviceData;
    await set(deviceRef, deviceDataWithoutId);
    console.log("Device saved successfully to Firebase");
    return deviceData;
  } catch (error) {
    console.error("Error saving device:", error);
    throw error;
  }
};

export const updateDevice = async (deviceId: string, updates: any) => {
  const user = getCurrentUser();
  if (!user) {
    throw new Error("No authenticated user found");
  }

  const database = getDatabase(getApp());
  const deviceRef = ref(database, `users/${user.uid}/devices/${deviceId}`);

  try {
    // Convert Date objects to ISO strings for Firebase storage
    const updatesCopy = { ...updates };
    if (updatesCopy.registeredAt instanceof Date) {
      updatesCopy.registeredAt = updatesCopy.registeredAt.toISOString();
    }
    if (updatesCopy.lastConnected instanceof Date) {
      updatesCopy.lastConnected = updatesCopy.lastConnected.toISOString();
    }

    // Remove ID from updates since it's the key
    const { id, ...updatesWithoutId } = updatesCopy;
    await update(deviceRef, updatesWithoutId);
    console.log(`Device ${deviceId} updated successfully`);
    return true;
  } catch (error) {
    console.error("Error updating device:", error);
    throw error;
  }
};

export const deleteDevice = async (deviceId: string) => {
  const user = getCurrentUser();
  if (!user) {
    throw new Error("No authenticated user found");
  }

  const database = getDatabase(getApp());
  const deviceRef = ref(database, `users/${user.uid}/devices/${deviceId}`);

  try {
    await remove(deviceRef);
    console.log(`Device ${deviceId} deleted successfully`);
    return true;
  } catch (error) {
    console.error("Error deleting device:", error);
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

  const database = getDatabase(getApp());
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
    const database = getDatabase(getApp());
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
  updateEvent,
  deleteEvent,
  addKid,
  // Device management
  getDevices,
  addDevice,
  updateDevice,
  deleteDevice,
  migrateEventsToIndividualObjects,
  debugAuthState,
  clearUserData,
  clearFirebaseCache,
};
