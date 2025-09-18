// Debug script to check Firebase data
// Run this with: node debug-calendar.js

const firebaseService = require("./app/services/firebaseService.ts");

async function debugCalendarData() {
  try {
    console.log("🔍 Starting Calendar Debug...\n");

    // Check auth state
    console.log("1. Checking authentication state:");
    const user = firebaseService.debugAuthState();

    if (!user) {
      console.log("❌ No authenticated user found!");
      return;
    }

    console.log("\n2. Checking Firebase data:");

    // Get events
    try {
      const events = await firebaseService.getEvents();
      console.log(`📅 Events found: ${events.length}`);
      if (events.length > 0) {
        console.log("First event:", events[0]);
      }
    } catch (error) {
      console.log("❌ Error getting events:", error.message);
    }

    // Get kids
    try {
      const kids = await firebaseService.getKids();
      console.log(`👶 Kids found: ${kids.length}`);
      if (kids.length > 0) {
        console.log("First kid:", kids[0]);
      }
    } catch (error) {
      console.log("❌ Error getting kids:", error.message);
    }

    console.log("\n3. To clear all data, you can call:");
    console.log("   await firebaseService.clearUserData()");
  } catch (error) {
    console.error("❌ Debug script error:", error);
  }
}

module.exports = { debugCalendarData };

// If run directly
if (require.main === module) {
  debugCalendarData();
}
