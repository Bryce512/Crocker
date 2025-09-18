// Temporary debug script to test Firebase connection
import firebase from "@react-native-firebase/app";
import database from "@react-native-firebase/database";

export const testFirebaseConnection = async () => {
  try {
    console.log("Testing Firebase connection...");
    console.log("Firebase app:", firebase.app().name);
    console.log("Database URL:", firebase.app().options.databaseURL);

    // Test database connection
    const ref = database().ref("test");
    await ref.set({ timestamp: Date.now(), message: "test connection" });
    console.log("✅ Database write successful");

    const snapshot = await ref.once("value");
    console.log("✅ Database read successful:", snapshot.val());

    // Clean up test data
    await ref.remove();
    console.log("✅ Test data cleaned up");

    return true;
  } catch (error) {
    console.error("❌ Firebase connection failed:", error);
    return false;
  }
};
