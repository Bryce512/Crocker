// React Native Firebase auto-initializes from native config files
// No manual configuration needed - it reads from GoogleService-Info.plist and google-services.json

import auth from "@react-native-firebase/auth";
import database from "@react-native-firebase/database";

// Export the firebase instances (no initialization needed)
export { auth, database };
