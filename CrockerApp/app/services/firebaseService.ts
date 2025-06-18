// firebaseService.ts
import { 
  initializeApp, 
  getApp, 
  getApps 
} from '@react-native-firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as authSignOut,
  onAuthStateChanged
} from '@react-native-firebase/auth';
import { 
  getDatabase, 
  ref, 
  set, 
  get,
  update,
  remove,
  push,
} from '@react-native-firebase/database';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAZ2Xk8Kkbc-0tdkJBqWhqNZie8Ls7cEnc",
  authDomain: "fluid-tangent-405719.firebaseapp.com",
  databaseURL: "https://fluid-tangent-405719-default-rtdb.firebaseio.com",
  projectId: "fluid-tangent-405719",
  storageBucket: "fluid-tangent-405719.firebasestorage.app",
  messagingSenderId: "578434461817",
  appId: "1:578434461817:ios:5509bcf8e73151e2c524a8"
};

// Flag to track initialization status
let isInitialized = false;

// Initialize Firebase - get the existing app or create a new one
export const initializeFirebase = async () => {
  // If we've already initialized, return early to prevent duplicate initialization
  if (isInitialized) {
    console.log("Firebase already initialized by this service");
    return getApp();
  }

  try {
    // Check if already initialized
    if (getApps().length === 0) {
      // Only initialize if no apps exist
      initializeApp(firebaseConfig);
      console.log("Firebase initialized successfully");
    } else {
      console.log("Firebase app already exists, using existing app");
    }
    isInitialized = true;
    return getApp();
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
    .catch((error) => console.error("Error writing data:", error));
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
      return { user: null, error: { code: 'auth/empty-email', message: 'Email cannot be empty' } };
    }
    
    if (!password || password.length < 6) {
      return { user: null, error: { code: 'auth/weak-password', message: 'Password must be at least 6 characters' } };
    }
    
    // Use React Native Firebase auth
    const auth = getAuth();
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Add this line to ensure user exists in database
    await ensureUserProfile(userCredential.user);
    
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    // Provide more specific error messages based on Firebase error codes
    console.error("Firebase authentication error:", error.code, error.message);
    
    let errorMessage = 'Failed to sign in';
    if (error.code === 'auth/user-not-found') {
      errorMessage = 'No account exists with this email';
    } else if (error.code === 'auth/wrong-password') {
      errorMessage = 'Incorrect password';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email format';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Too many failed login attempts. Please try again later';
    }
    
    return { 
      user: null, 
      error: {
        code: error.code || 'auth/unknown',
        message: errorMessage,
        originalError: error 
      }
    };
  }
};

export const signUp = async (email: string, password: string) => {
  try {
    const auth = getAuth();
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
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
  const auth = getAuth();
  return auth.currentUser;
};

export const onAuthChange = (callback: (user: FirebaseAuthTypes.User | null) => void) => {
  const auth = getAuth();
  return onAuthStateChanged(auth, callback);
};

// Vehicle-specific functions
export const getVehicles = async (userId: string) => {
  const database = getDatabase();
  const vehiclesRef = ref(database, `users/${userId}/vehicles`);
  
  try {
    const snapshot = await get(vehiclesRef);
    if (snapshot.exists()) {
      const vehiclesData = snapshot.val();
      // Convert object to array with id included
      return Object.keys(vehiclesData).map(key => ({
        id: key,
        ...vehiclesData[key]
      }));
    }
    return [];
  } catch (error) {
    console.error("Error fetching vehicles:", error);
    throw error;
  }
};

export const addVehicle = async (userId: string, vehicleData: any) => {
  const database = getDatabase();
  const vehiclesRef = ref(database, `users/${userId}/vehicles`);
  
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

export const updateVehicle = async (userId: string, vehicleId: string, vehicleData: any) => {
  const database = getDatabase();
  const vehicleRef = ref(database, `users/${userId}/vehicles/${vehicleId}`);
  
  try {
    await update(vehicleRef, vehicleData);
    return { id: vehicleId, ...vehicleData };
  } catch (error) {
    console.error("Error updating vehicle:", error);
    throw error;
  }
};

export const deleteVehicle = async (userId: string, vehicleId: string) => {
  const database = getDatabase();
  const vehicleRef = ref(database, `users/${userId}/vehicles/${vehicleId}`);
  
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
  const database = getDatabase();
  const logsRef = ref(database, `users/${userId}/diagnostic_logs`);
  
  try {
    const snapshot = await get(logsRef);
    if (snapshot.exists()) {
      const logsData = snapshot.val();
      // Filter logs for the specific vehicle and convert to array
      return Object.keys(logsData)
        .filter(key => logsData[key].vehicleId === vehicleId)
        .map(key => ({
          id: key,
          ...logsData[key]
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
  
  const database = getDatabase();
  const userRef = ref(database, `users/${user.uid}`);
  
  try {
    // Check if user profile already exists
    const snapshot = await get(userRef);
    
    if (!snapshot.exists()) {
      // Create new user profile
      const userData = {
        profile: {
          name: user.displayName || '',
          email: user.email || '',
          phone: user.phoneNumber || '',
        },
        vehicles: {},
        diagnostic_logs: {},
        maintenance_records: {}
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
};
