import React, { useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import LinearGradient from "react-native-linear-gradient";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useAuth } from "../contexts/AuthContext";
import { colors } from "../theme/colors";

const { width: screenWidth } = Dimensions.get("window");
const MENU_WIDTH = screenWidth * 0.75; // 75% of screen width

interface SlidingMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const SlidingMenu: React.FC<SlidingMenuProps> = ({ isOpen, onClose }) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  
  const slideAnim = useRef(new Animated.Value(-MENU_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [isVisible, setIsVisible] = React.useState(false);

  // Get username from user email (first part before @)
  const username = user?.displayName || user?.email?.split("@")[0] || "User";

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
    setTimeout(() => signOut(), 300);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <>
      {/* Overlay */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          style={[styles.overlay, { opacity: overlayOpacity }]}
        />
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
          <LinearGradient
            colors={[colors.white, colors.gray[50]]}
            style={[styles.menuGradient, { paddingTop: safeAreaTop }]}
          >
            {/* Menu Header */}
            <View style={[styles.menuHeader, { marginTop: 20 }]}>
              <Text style={styles.menuGreeting}>Hey {username},</Text>
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
                <FontAwesome name="user" size={20} color={colors.gray[600]} style={styles.menuIcon} />
                <Text style={styles.menuItemText}>Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleMenuItemPress("ScanDevices")}
              >
                <FontAwesome name="mobile" size={20} color={colors.gray[600]} style={styles.menuIcon} />
                <Text style={styles.menuItemText}>Devices</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleMenuItemPress("CalendarScreen")}
              >
                <FontAwesome name="calendar" size={20} color={colors.gray[600]} style={styles.menuIcon} />
                <Text style={styles.menuItemText}>Calendar</Text>
              </TouchableOpacity>
            </View>

          {/* Logout at bottom */}
          <View style={[styles.menuFooter, { marginBottom: safeAreaBottom + 40 }]}>
            <TouchableOpacity
              style={styles.logoutMenuItem}
              onPress={handleLogout}
            >
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
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
  menuGradient: {
    flex: 1,
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