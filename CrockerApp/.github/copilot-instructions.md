# Copilot Instructions for Sori (React Native OBD-II App)

## Project Overview

This is "Sori" - a React Native/Expo app for helping kids with autism transition tasks by alerting them at regular intervals before transitions occur. The app uses Firebase for authentication and data storage.

## Architecture Patterns

### Context-Based State Management

- **BluetoothContext** (`app/contexts/BluetoothContext.tsx`) - Central state for Bluetooth connections, device management, and OBD data
- **AuthContext** (`app/contexts/AuthContext.tsx`) - Firebase authentication state
- Follow the pattern: Context wraps service hooks and manages persistent state across screens

### Bluetooth Architecture (Critical Integration Pattern)

The app uses a **dual-library Bluetooth approach**:

- `react-native-ble-plx` (primary) - Modern BLE library in `services/bleConnections.ts`
- `react-native-ble-manager` (legacy) - Fallback in `services/BluetoothManager.ts`

**Key Service Integration:**

- `bleConnections.ts` - Hook-based connection management with auto-reconnect

### Firebase Service Pattern

`firebaseService.ts` handles both auth and Realtime Database with specific structure:

```
users/{userId}/
  ├── profile/
```

## Development Workflow

### Essential Setup Commands

```bash
npm install
./fix-modules.sh          # REQUIRED: Applies critical patches
npx expo run:ios          # iOS development
npx expo run:android      # Android development
```

### Module Patches System

- **Always run** `./fix-modules.sh` after `npm install`
- Patches in `/patches/` fix compatibility issues with expo-file-system, expo-font, and react-native-screens
- `postinstall` script auto-applies patches via patch-package

## Critical Code Patterns

### Bluetooth Connection Flow

1. **Context manages state**: `BluetoothContext` wraps `useBleConnection` hook
2. **Auto-reconnect logic**: Monitors app state changes and connection health
3. **PID command structure**: Commands sent as hex strings, responses parsed in `obdDataCollection.ts`

### Screen Navigation Pattern

- **Conditional rendering** in `AppNavigator.tsx` based on auth state
- No bottom tabs - uses stack navigation throughout
- Screens handle their own device connection state via `useBluetooth()` hook

### Styling Approach

- **NativeWind** (Tailwind for React Native) + StyleSheet hybrid
- Theme colors in `app/theme/colors.ts` with design system approach
- Component files show mix of Tailwind classes and StyleSheet for complex layouts

### Permission Handling

Both iOS and Android require specific Bluetooth permissions defined in:

- `app.json` - Expo config with platform-specific permissions
- Background modes for Bluetooth central role

## File Organization Logic

- `app/screens/` - Screen components
- `app/services/` - Business logic and external integrations
- `app/contexts/` - React Context providers
- `app/components1/` - Reusable UI components (note the "1" suffix)
- `app/navigation/` - Navigation configuration

## Debugging Tips

- Bluetooth connection issues: Check device permissions and bonding status
- Firebase initialization: App handles "already configured" errors gracefully
- Module compatibility: Use `fix-modules.sh` for patch-related issues
- OBD data parsing: Commands are hex-based, responses need byte manipulation

## Integration Dependencies

- **Firebase**: Authentication + Realtime Database (not Firestore)
- **Expo managed workflow** with custom dev client
- **Platform-specific**: iOS requires Podfile, Android needs gradle configuration
- **React Navigation**: Stack-based with conditional auth flows
