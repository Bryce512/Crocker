import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from "react-native";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import LinearGradient from "react-native-linear-gradient";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useAuth } from "../contexts/AuthContext";
import { colors } from "../theme/colors";

const { width: screenWidth } = Dimensions.get("window");
const MENU_WIDTH = 280;

const Home = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { user, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const slideAnim = useRef(new Animated.Value(screenWidth)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Get username from user email (first part before @)
  const username = user?.displayName || user?.email?.split("@")[0] || "User";

  const openMenu = () => {
    setIsMenuOpen(true);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: screenWidth - MENU_WIDTH,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0.5,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const closeMenu = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: screenWidth,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start(() => {
      setIsMenuOpen(false);
    });
  };

  const handleMenuItemPress = (screen?: keyof RootStackParamList) => {
    closeMenu();
    if (screen) {
      setTimeout(() => navigation.navigate(screen), 300);
    }
  };

  const handleLogout = () => {
    closeMenu();
    setTimeout(() => signOut(), 300);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.gray[50], colors.primary[50]]}
        style={styles.background}
      >
        <StatusBar backgroundColor={colors.gray[50]} barStyle="dark-content" />

        {/* Header with hamburger menu */}
        <View style={styles.header}>
          <View style={styles.logoSection}>
            <Text style={styles.logo}>
              <Text style={styles.logoS}>s</Text>
              <Text style={styles.logoO}>o</Text>
              <Text style={styles.logoR}>r</Text>
              <Text style={styles.logoI}>i</Text>
            </Text>
          </View>

          <TouchableOpacity style={styles.hamburgerButton} onPress={openMenu}>
            <View style={styles.hamburgerLine} />
            <View style={styles.hamburgerLine} />
            <View style={styles.hamburgerLine} />
          </TouchableOpacity>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>Welcome to Sori</Text>
            <Text style={styles.tagline}>soften the switch</Text>
          </View>
        </View>

        {/* Overlay */}
        {isMenuOpen && (
          <TouchableWithoutFeedback onPress={closeMenu}>
            <Animated.View
              style={[styles.overlay, { opacity: overlayOpacity }]}
            />
          </TouchableWithoutFeedback>
        )}

        {/* Slide Menu */}
        <Animated.View
          style={[
            styles.slideMenu,
            {
              transform: [{ translateX: slideAnim }],
              width: MENU_WIDTH,
            },
          ]}
        >
          <LinearGradient
            colors={[colors.white, colors.gray[50]]}
            style={styles.menuGradient}
          >
            {/* Menu Header */}
            <View style={styles.menuHeader}>
              <Text style={styles.menuGreeting}>Hey {username},</Text>
              <TouchableOpacity style={styles.closeButton} onPress={closeMenu}>
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            {/* Menu Items */}
            <View style={styles.menuItems}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleMenuItemPress()}
              >
                <Text style={styles.menuIcon}>�</Text>
                <Text style={styles.menuItemText}>Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleMenuItemPress("ScanDevices")}
              >
                <Text style={styles.menuItemText}>Devices</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleMenuItemPress("CalendarScreen")}
              >
                <Text style={styles.menuIcon}>�</Text>
                <Text style={styles.menuItemText}>Calendar</Text>
              </TouchableOpacity>
            </View>

            {/* Logout Button */}
            <View style={styles.menuFooter}>
              <TouchableOpacity
                style={styles.logoutMenuItem}
                onPress={handleLogout}
              >
                <Text style={styles.logoutIcon}>🚪</Text>
                <Text style={styles.logoutText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  logoSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: 2,
  },
  logoS: {
    color: colors.primary[400],
  },
  logoO: {
    color: colors.green[500],
  },
  logoR: {
    color: colors.primary[400],
  },
  logoI: {
    color: colors.primary[500],
  },
  hamburgerButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  hamburgerLine: {
    width: 18,
    height: 2,
    backgroundColor: colors.gray[700],
    marginVertical: 2,
    borderRadius: 1,
  },
  mainContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  welcomeSection: {
    alignItems: "center",
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.gray[800],
    marginBottom: 8,
  },
  tagline: {
    fontSize: 18,
    fontWeight: "500",
    color: colors.green[500],
    letterSpacing: 0.5,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.black,
  },
  slideMenu: {
    position: "absolute",
    top: 0,
    right: 0,
    height: "100%",
    shadowColor: colors.black,
    shadowOffset: {
      width: -2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  menuGradient: {
    flex: 1,
    paddingTop: 60,
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
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 16,
    width: 24,
    textAlign: "center",
  },
  menuItemText: {
    fontSize: 18,
    fontWeight: "500",
    color: colors.gray[700],
  },
  menuFooter: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  logoutMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.red[500],
    borderRadius: 12,
  },
  logoutIcon: {
    fontSize: 18,
    marginRight: 12,
    width: 20,
    textAlign: "center",
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.white,
  },
});

export default Home;
