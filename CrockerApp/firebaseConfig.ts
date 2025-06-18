import { firebase } from "@react-native-firebase/app";
import "@react-native-firebase/auth";
import "@react-native-firebase/database";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCkTvizBpmaxVJFAWbwL9BcbL93daDMMWE",
  authDomain: "fluid-tangent-405719.firebaseapp.com",
  databaseURL: "https://fluid-tangent-405719-default-rtdb.firebaseio.com",
  projectId: "fluid-tangent-405719",
  storageBucket: "fluid-tangent-405719.firebasestorage.app",
  messagingSenderId: "578434461817",
  appId: "1:578434461817:web:d336ebf5d1e7188dc524a8",
  measurementId: "G-S9X6HFYRLC",
};

// Initialize Firebase if no apps have been initialized
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Export the firebase instance
export default firebase;
export const auth = firebase.auth();
export const database = firebase.database();
