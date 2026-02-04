import { Platform } from "react-native";
import storage from "@react-native-firebase/storage";
import * as ImageManipulator from "expo-image-manipulator";
import { convertToRGB } from "react-native-image-to-rgb";

// Note: Using React Native Firebase Storage which shares authentication
// with @react-native-firebase/auth, unlike modular Firebase SDK

/**
 * Image management service
 * - Uploads images to Firebase Storage
 * - Generates download URLs
 * - Provides base64 for device transmission
 */

export interface ImageData {
  uri: string;
  base64: string;
  filename: string;
}

/**
 * Converts event name to a valid filename
 * @param eventName - The event name (e.g., "School time")
 * @returns Formatted filename (e.g., "school-time.png")
 */
export const eventNameToFilename = (eventName: string): string => {
  return eventName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with dashes
    .replace(/[^a-z0-9-]/g, "") // Remove special characters
    .replace(/-+/g, "-") // Replace multiple dashes with single dash
    .replace(/^-|-$/g, "") // Remove leading/trailing dashes
    .concat(".rgb565");
};

/**
 * Compresses and resizes image for device transmission with LVGL header
 * Converts 480x480 image to LVGL format with 12-byte header + RGB565 raw data
 * Format: [LVGL header (12 bytes)][RGB565 data (460,800 bytes)]
 * @param imageUri - URI of the image to convert
 * @returns Array of bytes: 12-byte LVGL header + RGB565 pixel data (460,812 bytes total)
 */
export const compressImageForDevice = async (
  imageUri: string,
): Promise<number[]> => {
  try {
    console.log(`🗜️  Converting image to RGB565 for device transmission...`);
    console.log(`   Original URI: ${imageUri}`);

    // First, resize to 480x480 using ImageManipulator
    const resized = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 480, height: 480 } }],
      {
        compress: 1.0,
        format: ImageManipulator.SaveFormat.PNG,
      },
    );

    console.log(`✅ Image resized to 480x480`);
    console.log(`   Resized URI: ${resized.uri}`);

    // Get RGB array from the resized image (3 bytes per pixel: R, G, B)
    const rgbArray = await convertToRGB(resized.uri);
    console.log(
      `✅ Converted to RGB: ${rgbArray.length} bytes (${rgbArray.length / 3} pixels)`,
    );

    // Convert RGB (3 bytes/pixel) to RGB565 (2 bytes/pixel)
    // RGB565: 5-bit Red, 6-bit Green, 5-bit Blue
    const rgb565Array: number[] = [];

    for (let i = 0; i < rgbArray.length; i += 3) {
      const r = rgbArray[i] || 0; // 8-bit red
      const g = rgbArray[i + 1] || 0; // 8-bit green
      const b = rgbArray[i + 2] || 0; // 8-bit blue

      // Convert to RGB565: R(5) G(6) B(5) = 16 bits
      const r5 = (r >> 3) & 0x1f; // Top 5 bits of 8-bit red
      const g6 = (g >> 2) & 0x3f; // Top 6 bits of 8-bit green
      const b5 = (b >> 3) & 0x1f; // Top 5 bits of 8-bit blue

      // Combine into 16-bit value: RRRRRGGGGGGBBBBB
      const rgb565 = (r5 << 11) | (g6 << 5) | b5;

      // Convert to 2 bytes (little-endian: low byte first, high byte second)
      rgb565Array.push(rgb565 & 0xff); // Low byte
      rgb565Array.push((rgb565 >> 8) & 0xff); // High byte
    }

    console.log(`✅ Image converted to RGB565 format`);
    console.log(
      `   Size: ${rgb565Array.length} bytes (${rgb565Array.length / 2} pixels)`,
    );

    // Create LVGL header (12 bytes total)
    // Byte 0-3: Magic number "LVGL" (0x4C, 0x56, 0x47, 0x4C)
    // Byte 4-5: Width 480 as uint16_t little-endian (0xE0, 0x01)
    // Byte 6-7: Height 480 as uint16_t little-endian (0xE0, 0x01)
    // Byte 8: Color format = 2 (LV_COLOR_FORMAT_RGB565)
    // Byte 9-11: Reserved/padding (0x00, 0x00, 0x00)
    const header: number[] = [
      // Magic number: "LVGL"
      0x4c, 0x56, 0x47, 0x4c,
      // Width: 480 (little-endian uint16_t)
      0xe0, 0x01,
      // Height: 480 (little-endian uint16_t)
      0xe0, 0x01,
      // Color format: 2 (LV_COLOR_FORMAT_RGB565)
      0x02,
      // Reserved padding
      0x00, 0x00, 0x00,
    ];

    console.log(`✅ Created LVGL header (${header.length} bytes)`);

    // Combine header + RGB565 data
    const finalData = [...header, ...rgb565Array];

    console.log(`✅ Final LVGL image format`);
    console.log(
      `   Total size: ${finalData.length} bytes (${header.length} byte header + ${rgb565Array.length} byte RGB565 data)`,
    );

    return finalData;
  } catch (error) {
    console.error(`❌ Error processing image: ${error}`);
    throw error;
  }
};

/**
 * Uploads image to Firebase Storage
 * Stores at: user_uploads/{userId}/{eventId}.png
 * @param imageUri - Local file URI
 * @param userId - Current user ID
 * @param eventId - Event ID (for filename)
 * @returns Firebase Storage path (e.g., "user_uploads/abc123/event456.png")
 */
export const uploadImageToFirebaseStorage = async (
  imageUri: string,
  userId: string,
  eventId: string,
): Promise<string> => {
  try {
    console.log(`📤 Uploading image to Firebase Storage...`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Event ID: ${eventId}`);
    console.log(`   Image URI: ${imageUri}`);

    // Create storage path
    const storagePath = `user_uploads/${userId}/${eventId}.png`;
    console.log(`   Storage Path: ${storagePath}`);

    // Get the file reference
    const storageRef = storage().ref(storagePath);

    // Upload the image from the local URI
    // React Native Firebase automatically includes auth credentials
    await storageRef.putFile(imageUri, {
      cacheControl: "public, max-age=3600",
    });

    console.log(`✅ Image uploaded to Firebase Storage: ${storagePath}`);
    return storagePath;
  } catch (error) {
    console.error(`❌ Error uploading image to Firebase Storage:`);
    console.error(`   Error: ${error}`);
    if (error instanceof Error) {
      console.error(`   Message: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
    }
    throw error;
  }
};

/**
 * Gets Firebase Storage download URL
 * @param storagePath - Firebase Storage path (e.g., "user_uploads/abc123/event456.png")
 * @returns Download URL
 */
export const getImageDownloadUrl = async (
  storagePath: string,
): Promise<string> => {
  try {
    const storageRef = storage().ref(storagePath);
    const url = await storageRef.getDownloadURL();
    console.log(`✅ Got download URL for ${storagePath}`);
    return url;
  } catch (error) {
    console.error(`❌ Error getting download URL: ${error}`);
    throw error;
  }
};

/**
 * Processes an image for device transmission
 * React-native-image-picker provides image URI
 * @param imageUri - URI of the image to process
 * @param eventName - The event name for filename generation
 * @returns ImageData with URI and filename
 */
export const processImageForDevice = async (
  imageUri: string,
  eventName?: string,
): Promise<ImageData> => {
  try {
    console.log(`📸 Processing image for device: ${imageUri}`);

    // In React Native, we can get base64 directly from the URI in many cases
    // For camera roll images, we may need to fetch and convert
    let base64Data: string;

    // Try to read the file and convert to base64
    try {
      // Use fetch to read the image file
      const response = await fetch(imageUri);

      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const blob = await response.blob();

      // Convert blob to base64 using a different method that works in React Native
      // We'll read the blob as text after encoding
      const reader = new FileReader();

      // Check if FileReader exists (might not in all React Native environments)
      if (!reader || typeof reader.readAsDataURL !== "function") {
        // Fallback: use base64 encoding method
        console.log("⚠️ FileReader not available, using alternative encoding");

        // Convert blob to arrayBuffer then to base64
        const arrayBuffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binaryString = "";
        for (let i = 0; i < bytes.byteLength; i++) {
          binaryString += String.fromCharCode(bytes[i]);
        }
        base64Data = btoa(binaryString);
      } else {
        // Use FileReader if available
        base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            // Extract base64 part after "data:image/png;base64,"
            const base64 = result.split(",")[1] || result;
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      if (!base64Data || base64Data.length === 0) {
        throw new Error("Failed to convert image to base64 - result is empty");
      }
    } catch (fetchError) {
      console.error(`❌ Error fetching/converting image: ${fetchError}`);
      throw fetchError;
    }

    // Create filename from event name
    const filename = eventName
      ? eventNameToFilename(eventName)
      : "event-image.png";

    console.log(`✅ Image processed successfully`);
    console.log(`📊 Base64 length: ${base64Data.length} characters`);
    console.log(`📝 Filename: ${filename}`);
    console.log(`🔍 First 50 chars of base64: ${base64Data.substring(0, 50)}`);

    return {
      uri: imageUri,
      base64: base64Data,
      filename,
    };
  } catch (error) {
    console.error(`❌ Error processing image: ${error}`);
    if (error instanceof Error) {
      console.error(`   Stack: ${error.stack}`);
    }
    throw error;
  }
};

/**
 * Validates if an image file is suitable for transmission
 * @param base64String - Base64 encoded image data
 * @returns Validation result
 */
export const validateImageSize = (base64String: string): boolean => {
  // Base64 is ~33% larger than binary, so divide by 4/3
  const sizeInBytes = (base64String.length * 3) / 4;
  const maxSizeBytes = 5 * 1024 * 1024; // 5MB max

  console.log(`📊 Image size: ${(sizeInBytes / 1024).toFixed(2)} KB`);

  if (sizeInBytes > maxSizeBytes) {
    console.warn(`⚠️ Image exceeds maximum size of 5MB`);
    return false;
  }

  return true;
};

/**
 * Converts base64 string to byte array for BLE transmission
 * @param base64String - Base64 encoded data
 * @returns Array of bytes
 */
export const base64ToBytes = (base64String: string): number[] => {
  try {
    const binaryString = atob(base64String);
    const bytes: number[] = [];
    for (let i = 0; i < binaryString.length; i++) {
      bytes.push(binaryString.charCodeAt(i));
    }
    return bytes;
  } catch (error) {
    console.error(`Error converting base64 to bytes: ${error}`);
    return [];
  }
};
