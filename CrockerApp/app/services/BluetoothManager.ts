import BleManager from "react-native-ble-manager";
import {
  NativeModules,
  NativeEventEmitter,
  Platform,
  PermissionsAndroid,
} from "react-native";
import Base64 from "react-native-base64";

const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

const SERVICE_UUID = "00001101-0000-1000-8000-00805F9B34FB";
const CHARACTERISTIC_UUID = "0000FFF1-0000-1000-8000-00805F9B34FB";

class BluetoothManager {
  private deviceId: string | null = null;

  constructor() {
    BleManager.start({ showAlert: false });
  }

  async requestPermissions(): Promise<void> {
    if (Platform.OS === "android" && Platform.Version >= 23) {
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
    }
  }

  async startScan(): Promise<string> {
    await this.requestPermissions();

    return new Promise((resolve, reject) => {
      let found = false;

      const subscription = bleManagerEmitter.addListener(
        "BleManagerDiscoverPeripheral",
        (device) => {
          console.log(
            "Discovered device:",
            device.name || "(no name)",
            device.id
          );

          if (device.name === "OBDII") {
            found = true;
            this.deviceId = device.id;
            BleManager.stopScan();
            subscription.remove();
            resolve(device.id);
          }
        }
      );

      BleManager.scan([], 5, true)
        .then(() => {
          console.log("Scanning for devices...");
          setTimeout(() => {
            if (!found) {
              subscription.remove();
              reject(new Error("OBDII device not found"));
            }
          }, 6000);
        })
        .catch((error) => {
          subscription.remove();
          reject(error);
        });
    });
  }

  async connectToDevice(): Promise<void> {
    if (!this.deviceId) throw new Error("No device selected");

    await BleManager.connect(this.deviceId);
    console.log(`Connected to device ${this.deviceId}`);

    await BleManager.retrieveServices(this.deviceId);
    console.log("Services retrieved");
  }

  async disconnectFromDevice(): Promise<void> {
    if (!this.deviceId) throw new Error("No connected device");
    await BleManager.disconnect(this.deviceId);
    console.log("Disconnected from device");
    this.deviceId = null;
  }

  async writeCommand(hexCommand: string): Promise<void> {
    if (!this.deviceId) throw new Error("No connected device");

    const base64 = hexToBase64(hexCommand);
    const bytes = base64ToBytes(base64);

    await BleManager.write(
      this.deviceId,
      SERVICE_UUID,
      CHARACTERISTIC_UUID,
      bytes
    );
    console.log("Command sent");
  }

  async readResponse(): Promise<string> {
    if (!this.deviceId) throw new Error("No connected device");

    const data = await BleManager.read(
      this.deviceId,
      SERVICE_UUID,
      CHARACTERISTIC_UUID
    );
    const hex = bytesToHex(data);
    console.log("Received data:", hex);
    return hex;
  }
}

// Helper functions
function hexToBase64(hex: string): string {
  let raw = "";
  for (let i = 0; i < hex.length; i += 2) {
    raw += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  }
  return Base64.encode(raw);
}

function base64ToBytes(base64: string): number[] {
  const raw = Base64.decode(base64);
  return Array.from(raw).map((char) => char.charCodeAt(0));
}

function bytesToHex(bytes: number[]): string {
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default BluetoothManager;
