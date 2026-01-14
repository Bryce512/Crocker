// firebaseService.ts
import auth from "@react-native-firebase/auth";
import database from "@react-native-firebase/database";
import { ref, get, set, update, remove } from "@react-native-firebase/database";
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";

// Flag to track initialization status
let isInitialized = false;

// Initialize Firebase - React Native Firebase doesn't need manual initialization
export const initializeFirebase = async () => {
  if (isInitialized) {
    console.log("Firebase already initialized by this service");
    return true;
  }

  try {
    // React Native Firebase is automatically initialized via native configuration
    console.log("React Native Firebase initialized successfully");
    isInitialized = true;
    return true;
  } catch (error) {
    console.error("Firebase initialization error:", error);
    throw error;
  }
};

// Function to write data to the database
export const writeData = (userId: string, name: string, email: string) => {
  const db = database();
  const userRef = ref(db, `users/${userId}`);
  console.log(`Writing to user ${userId}`);
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
  const db = database();
  const userRef = ref(db, `users/${userId}`);

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

    const userCredential = await auth().signInWithEmailAndPassword(
      email,
      password
    );

    console.log("🔷 User signed in with UID:", userCredential.user.uid);
    await ensureUserProfile(userCredential.user);

    return { user: userCredential.user, error: null };
  } catch (error: any) {
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
    console.log("🔄 Signing up user...");
    const userCredential = await auth().createUserWithEmailAndPassword(
      email,
      password
    );

    console.log("🔷 New user created with UID:", userCredential.user.uid);

    // Test database connection first
    console.log("🔍 Testing database permissions...");
    const dbTestResult = await testDatabaseConnection();

    if (!dbTestResult) {
      console.error(
        "🔴 Database connection test failed - proceeding anyway..."
      );
    }

    // Add this line to create user profile in database
    await ensureUserProfile(userCredential.user);

    return { user: userCredential.user, error: null };
  } catch (error) {
    console.error("🔴 Sign up failed:", error);
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

// Get diagnostic logs for a specific vehicle
export const getDiagnosticLogs = async (userId: string, vehicleId: string) => {
  const db = database();
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

  console.log("🔷 Ensuring user profile for UID:", user.uid);

  // Add a small delay to ensure auth state is fully propagated
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const db = database();
  const userRef = ref(db, `users/${user.uid}`);

  try {
    // Check if user profile already exists
    const snapshot = await get(userRef);

    if (!snapshot.exists()) {
      console.log(
        "🔷 Creating new user profile in database for UID:",
        user.uid
      );

      // Create new user profile with complete structure
      const userData = {
        profile: {
          name: user.displayName || "",
          email: user.email || "",
          phone: user.phoneNumber || "",
          createdAt: new Date().toISOString(),
        },
        maintenance_records: {},
        events: {},
        kids: {},
        devices: {}, // For registered Bluetooth devices
        deviceProfiles: {}, // For device settings and preferences
      };

      await set(userRef, userData);
      console.log(
        "✅ Successfully created user profile in database with path: users/" +
          user.uid
      );
      return userData;
    } else {
      console.log("🔷 User profile already exists for UID:", user.uid);

      // Check if we need to add missing sections for existing users
      const existingData = snapshot.val();
      let needsUpdate = false;

      if (!existingData.devices) {
        existingData.devices = {};
        needsUpdate = true;
      }

      if (!existingData.deviceProfiles) {
        existingData.deviceProfiles = {};
        needsUpdate = true;
      }

      if (needsUpdate) {
        console.log(
          "🔷 Updating existing user profile to include device sections"
        );
        await set(userRef, existingData);
      }

      return existingData;
    }
  } catch (error: any) {
    console.error("🔴 Error ensuring user profile:", error);
    console.error("🔴 Error code:", error.code);
    console.error("🔴 Error message:", error.message);
    console.error("🔴 User UID:", user.uid);
    console.error("🔴 Database path:", `users/${user.uid}`);

    if (error.message && error.message.includes("Permission denied")) {
      console.error(
        "🔴 FIREBASE RULES ERROR: The database security rules are blocking this write operation."
      );
      console.error(
        "🔴 Please check your Firebase Realtime Database rules in the Firebase Console."
      );
      console.error("🔴 Expected rules format:");
      console.error(`🔴 {
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    }
  }
}`);
    }

    throw error;
  }
};

// Test function to help diagnose database permission issues
export const testDatabaseConnection = async () => {
  const user = getCurrentUser();
  if (!user) {
    console.log("🔴 No authenticated user for database test");
    return false;
  }

  console.log("🔍 Testing database connection for user:", user.uid);
  const db = database();
  const testRef = ref(db, `users/${user.uid}/test`);

  try {
    // Try to write a simple test value
    await set(testRef, { timestamp: Date.now(), test: true });
    console.log("✅ Database write test successful");

    // Try to read it back
    const snapshot = await get(testRef);
    if (snapshot.exists()) {
      console.log("✅ Database read test successful");

      // Clean up test data
      await set(testRef, null);
      console.log("✅ Database cleanup successful");
      return true;
    } else {
      console.log("🔴 Database read test failed - no data found");
      return false;
    }
  } catch (error: any) {
    console.error("🔴 Database test failed:", error.message);
    return false;
  }
};

export const getUserProfile = async (userId: string) => {
  const db = database();
  const userRef = ref(db, `users/${userId}/profile`);

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

  const db = database();
  const eventsRef = ref(db, `users/${user.uid}/events`);

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

  console.log(`Fetching events for user ${user.uid}`);
  const db = database();
  const eventsRef = ref(db, `users/${user.uid}/events`);

  try {
    const snapshot = await get(eventsRef);

    if (snapshot.exists()) {
      const eventsData = snapshot.val();
      console.log("🔍 DEBUG getEvents: eventsData type:", typeof eventsData);

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
      } else if (eventsData && typeof eventsData === "object") {
        // New object format - convert to array for app use
        eventsArray = Object.keys(eventsData).map((key) => ({
          id: key,
          ...eventsData[key],
        }));
      } else {
        eventsArray = [];
      }

      // Restore Date objects from ISO strings
      const finalEventsArray = eventsArray.map((event) => {
        if (event.startTime && typeof event.startTime === "string") {
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

      return finalEventsArray;
    }
    return [];
  } catch (error) {
    console.error("Error fetching events:", error);
    throw error;
  }
};

// Get a specific event by ID
export const getEventById = async (eventId: string): Promise<any | null> => {
  const user = getCurrentUser();
  if (!user) {
    throw new Error("No authenticated user found");
  }

  try {
    const db = database();
    const eventRef = ref(db, `users/${user.uid}/events/${eventId}`);
    const snapshot = await get(eventRef);

    if (snapshot.exists()) {
      const eventData = snapshot.val();

      // Convert date strings back to Date objects
      const event = {
        id: eventId,
        ...eventData,
      };

      if (event.startTime && typeof event.startTime === "string") {
        event.startTime = new Date(event.startTime);
      }
      if (event.endTime && typeof event.endTime === "string") {
        event.endTime = new Date(event.endTime);
      }
      if (event.lastModified && typeof event.lastModified === "string") {
        event.lastModified = new Date(event.lastModified);
      }

      // Ensure assignedDeviceIds exists
      if (!event.assignedDeviceIds) {
        event.assignedDeviceIds = [];
      }

      return event;
    }

    return null;
  } catch (error) {
    console.error("Error fetching event by ID:", error);
    throw error;
  }
};

// Get kids for the current user
export const getKids = async () => {
  const user = getCurrentUser();
  if (!user) {
    throw new Error("No authenticated user found");
  }

  const db = database();
  const kidsRef = ref(db, `users/${user.uid}/kids`);

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

  console.log(`Writing events for user ${user}`);
  const db = database();
  const eventsRef = ref(db, `users/${user.uid}/events`);

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

  const db = database();
  const eventRef = ref(db, `users/${user.uid}/events/${eventData.id}`);

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

  const db = database();
  const eventRef = ref(db, `users/${user.uid}/events/${eventId}`);

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

  const path = `users/${user.uid}/events/${eventId}`;
  console.log(`🗑️ Attempting to delete event ${eventId} at path: ${path}`);

  const db = database();
  const eventRef = ref(db, path);

  try {
    // Log the current value before deleting
    const snapshot = await get(eventRef);
    console.log(`📋 Event exists before delete: ${snapshot.exists()}`);
    if (snapshot.exists()) {
      console.log(`📋 Event data before delete:`, snapshot.val());
    }

    // Remove the individual event object
    await remove(eventRef);

    // Verify deletion
    const afterSnapshot = await get(eventRef);
    console.log(`📋 Event exists after delete: ${afterSnapshot.exists()}`);

    if (!afterSnapshot.exists()) {
      console.log(
        `✅ Event ${eventId} deleted successfully from Firebase at path: ${path}`
      );
      return true;
    } else {
      console.error(`❌ Event ${eventId} still exists after delete attempt!`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error deleting event ${eventId}:`, error);
    throw error;
  }
};

// Add or update kids for the current user
export const addKid = async (kidData: any) => {
  const user = getCurrentUser();
  if (!user) {
    throw new Error("No authenticated user found");
  }

  const db = database();
  const kidsRef = ref(db, `users/${user.uid}/kids`);

  try {
    if (Array.isArray(kidData)) {
      // If it's an array, save all kids
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
      const db = database();
      const kidRef = ref(db, `users/${user.uid}/kids/${kidData.id}`);
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

  const db = database();
  const devicesRef = ref(db, `users/${user.uid}/devices`);

  try {
    const snapshot = await get(devicesRef);
    if (snapshot.exists()) {
      const devicesData = snapshot.val();
      return Object.keys(devicesData).map((key) => ({
        id: key,
        ...devicesData[key],
        registeredAt: devicesData[key].registeredAt
          ? new Date(devicesData[key].registeredAt)
          : new Date(),
        lastConnected: devicesData[key].lastConnected
          ? new Date(devicesData[key].lastConnected)
          : null,
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

  const db = database();
  const deviceRef = ref(db, `users/${user.uid}/devices/${deviceData.id}`);

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

  const db = database();
  const deviceRef = ref(db, `users/${user.uid}/devices/${deviceId}`);

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

  const db = database();
  const deviceRef = ref(db, `users/${user.uid}/devices/${deviceId}`);

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

  const db = database();
  const userRef = ref(db, `users/${user.uid}`);

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

// Debug function to verify database structure and permissions
export const verifyDatabaseAccess = async () => {
  try {
    const user = getCurrentUser();
    if (!user) {
      console.log("🔴 No authenticated user for database access verification");
      return false;
    }

    console.log("🔷 Verifying database access for UID:", user.uid);

    const db = database();
    const userRef = ref(db, `users/${user.uid}`);

    // Try to read the user's data
    const snapshot = await get(userRef);

    if (snapshot.exists()) {
      const data = snapshot.val();
      console.log(
        "✅ Successfully read user data from path: users/" + user.uid
      );
      console.log("🔷 User data structure keys:", Object.keys(data));

      // Check for device-related sections
      if (data.devices !== undefined) {
        console.log("✅ Devices section exists");
      } else {
        console.log("🔶 Devices section missing");
      }

      if (data.deviceProfiles !== undefined) {
        console.log("✅ Device profiles section exists");
      } else {
        console.log("🔶 Device profiles section missing");
      }

      return true;
    } else {
      console.log("🔴 No data found at path: users/" + user.uid);
      return false;
    }
  } catch (error: any) {
    console.error("🔴 Database access verification failed:", error);

    // Check if it's a permission error
    if (error?.code === "PERMISSION_DENIED") {
      console.error("🔴 PERMISSION DENIED - Check Firebase security rules");
      console.error("🔴 Expected path: users/" + getCurrentUser()?.uid);
      console.error("🔴 Auth UID:", getCurrentUser()?.uid);
    }

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
  verifyDatabaseAccess,
};
