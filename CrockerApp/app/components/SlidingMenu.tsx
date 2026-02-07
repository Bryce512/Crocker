import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useAuth } from "../contexts/AuthContext";
import { useCalendar } from "../contexts/CalendarContext";
import { calendarService } from "../services/calendarService";
import firebaseService from "../services/firebaseService";
import { colors } from "../theme/colors";

const { width: screenWidth } = Dimensions.get("window");
const MENU_WIDTH = screenWidth * 0.75; // 75% of screen width

interface SlidingMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const SlidingMenu: React.FC<SlidingMenuProps> = ({ isOpen, onClose }) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { importCalendarEvents, isImporting } = useCalendar();
  const insets = useSafeAreaInsets();
  const [firstName, setFirstName] = useState<string>("");

  const slideAnim = useRef(new Animated.Value(-MENU_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [isVisible, setIsVisible] = React.useState(false);

  // Fetch user profile on mount and when user changes
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user?.uid) {
        try {
          const profile = await firebaseService.getUserProfile(user.uid);
          if (profile?.firstName) {
            setFirstName(profile.firstName);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      }
    };

    fetchUserProfile();
  }, [user?.uid]);

  // Fallback padding in case safe area context fails
  const safeAreaTop = insets.top || 50; // Default to 50px if safe area fails
  const safeAreaBottom = insets.bottom || 34; // Default to 34px (typical home indicator height)

  React.useEffect(() => {
    if (isOpen) {
      // Show the menu and slide in from left to right
      setIsVisible(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0.5,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start();
    } else if (isVisible) {
      // Slide out from right to left with slight overshoot for better visual effect
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -MENU_WIDTH - 50, // Slight overshoot for smoother exit
          duration: 250, // Slightly faster exit
          useNativeDriver: false,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: false,
        }),
      ]).start(() => {
        // Hide the menu after animation completes
        setIsVisible(false);
      });
    }
  }, [isOpen, isVisible]);

  const handleMenuItemPress = (screen?: keyof RootStackParamList) => {
    onClose();
    if (screen) {
      setTimeout(() => navigation.navigate(screen), 300);
    }
  };

  const handleLogout = () => {
    onClose();
    setTimeout(() => firebaseService.signOut(), 300);
  };

  const handleImportCalendar = async () => {
    try {
      // First check permissions
      const permissionStatus = await calendarService.checkPermissions();
      console.log("Current permission status:", permissionStatus);

      if (permissionStatus === "denied") {
        Alert.alert(
          "Calendar Access Denied",
          "Calendar access has been denied. Please go to Settings > Privacy & Security > Calendars and enable access for this app, then restart the app.",
          [{ text: "OK", style: "default" }]
        );
        return;
      }

      Alert.alert(
        "Import Calendar",
        "Import events from your device calendar? This will add them to your event list.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Import",
            onPress: async () => {
              try {
                await importCalendarEvents();
              } catch (error) {
                console.error("Import error:", error);
                let errorMessage = "Failed to import calendar events.";

                if (error instanceof Error) {
                  if (
                    error.message.includes("permission") ||
                    error.message.includes("denied")
                  ) {
                    errorMessage =
                      "Calendar access denied. Please enable calendar permissions in your device settings and restart the app.";
                  } else if (error.message.includes("not found")) {
                    errorMessage = "No calendar events found to import.";
                  }
                }

                Alert.alert("Import Failed", errorMessage);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error checking permissions:", error);
      Alert.alert("Error", "Failed to check calendar permissions.");
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <>
      {/* Overlay */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} />
      </TouchableWithoutFeedback>

      {/* Slide Menu */}
      <Animated.View
        style={[
          styles.slideMenu,
          {
            transform: [{ translateX: slideAnim }],
            width: MENU_WIDTH,
            height: "100%",
          },
        ]}
      >
        <View style={[styles.menuContainer, { paddingTop: safeAreaTop }]}>
          {/* Menu Header */}
          <View style={[styles.menuHeader, { marginTop: 20 }]}>
            <Text style={styles.menuGreeting}> Welcome {firstName || ""} </Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          {/* Menu Items */}
          <View style={styles.menuItems}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuItemPress()}
            >
              <FontAwesome
                name="user"
                size={20}
                color={colors.gray[600]}
                style={styles.menuIcon}
              />
              <Text style={styles.menuItemText}>Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuItemPress("ScanDevices")}
            >
              <FontAwesome
                name="mobile"
                size={20}
                color={colors.gray[600]}
                style={styles.menuIcon}
              />
              <Text style={styles.menuItemText}>Devices</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuItemPress("CalendarScreen")}
            >
              <FontAwesome
                name="calendar"
                size={20}
                color={colors.gray[600]}
                style={styles.menuIcon}
              />
              <Text style={styles.menuItemText}>Calendar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleImportCalendar}
              disabled={isImporting}
            >
              <FontAwesome
                name="download"
                size={20}
                color={isImporting ? colors.gray[400] : colors.gray[600]}
                style={styles.menuIcon}
              />
              {isImporting ? (
                <View style={styles.importingContainer}>
                  <ActivityIndicator color={colors.gray[600]} size="small" />
                  <Text
                    style={[styles.menuItemText, { color: colors.gray[400] }]}
                  >
                    Importing...
                  </Text>
                </View>
              ) : (
                <Text style={styles.menuItemText}>Import Calendar</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Logout at bottom */}
          <View
            style={[styles.menuFooter, { marginBottom: safeAreaBottom + 40 }]}
          >
            <TouchableOpacity
              style={styles.logoutMenuItem}
              onPress={handleLogout}
            >
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.black,
    zIndex: 999,
  },
  slideMenu: {
    position: "absolute",
    top: 0,
    left: 0,
    height: "100%",
    shadowColor: colors.black,
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 1000,
  },
  menuContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  importingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 32,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  menuGreeting: {
    fontSize: 24,
    fontWeight: "600",
    color: colors.gray[800],
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
    backgroundColor: colors.gray[100],
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: "500",
    color: colors.gray[600],
  },
  menuItems: {
    flex: 1,
    paddingTop: 32,
  },
  menuFooter: {
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  menuIcon: {
    marginRight: 16,
    width: 24,
    textAlign: "center",
  },
  menuItemText: {
    fontSize: 18,
    fontWeight: "500",
    color: colors.gray[700],
  },
  logoutMenuItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: colors.red[500],
    borderRadius: 12,
    alignItems: "center",
  },
  logoutText: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.white,
  },
});

export default SlidingMenu;
