# Quick Reference: Event Image API

## Using Images in Events

### EventForm Component
The `EventForm` component now automatically handles image selection and processing.

```tsx
<EventForm
  mode="create"  // or "edit"
  visible={true}
  onSave={handleSave}
  onCancel={handleCancel}
/>
```

Users can:
- Tap the image picker to select/capture a photo
- View image preview (200px height)
- Remove the image before saving

### CalendarEvent Structure

```typescript
interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  alertIntervals: number[];
  isActive: boolean;
  assignedKidId?: string;
  assignedDeviceIds?: string[];
  source: "native" | "manual" | "imported";
  lastModified: Date;
  imageData?: {
    base64: string;        // Base64 encoded PNG image
    filename: string;      // "school-time.png"
    originalUri?: string;  // Original device path
  };
}
```

### Image Processing Service

```typescript
import {
  processImageForDevice,
  validateImageSize,
  eventNameToFilename,
  base64ToBytes,
} from "../services/imageService";

// Process image for transmission
const imageData = await processImageForDevice(
  imageUri,
  base64String,
  "My Event Name"
);

// Validate image size
const isValid = validateImageSize(imageData.base64);

// Convert filename
const filename = eventNameToFilename("School time"); // "school-time.png"

// Convert for BLE transmission
const bytes = base64ToBytes(base64String);
```

### Sending Images to Device

```typescript
import { sendImageToDevice } from "../services/bluetoothService";

// Send image to device
const result = await sendImageToDevice(
  deviceId,              // Bluetooth device ID
  imageBase64,           // Base64 encoded PNG image
  "school-time.png",     // Filename
  "School time"          // Event name (optional)
);

if (result.success) {
  console.log("Image sent successfully");
} else {
  console.error("Image send failed:", result.error);
}
```

## Integration Example

```typescript
// In event save handler
if (selectedImage) {
  const processed = await processImageForDevice(
    selectedImage.uri,
    selectedImage.base64,
    eventTitle
  );

  if (!validateImageSize(processed.base64)) {
    Alert.alert("Image Too Large", "Please select a smaller image");
    return;
  }

  const eventData = {
    title: eventTitle,
    // ... other event properties
    imageData: {
      base64: processed.base64,
      filename: processed.filename,
      originalUri: processed.uri,
    },
  };

  await saveEvent(eventData);
}
```

## Filename Convention

Event names are converted to filenames using this pattern:

- Input: "School time"
- Output: "school-time.png"

Conversion rules:
1. Convert to lowercase
2. Replace spaces with dashes
3. Remove special characters (keep only a-z, 0-9, dashes)
4. Replace multiple dashes with single dash
5. Remove leading/trailing dashes
6. Append ".png"

## Bluetooth Protocol

Images are sent via IMAGE_TRANSFER characteristic (550e8400-e29b-41d4-a716-446655440005):

```
[Filename Length: 2 bytes, big-endian]
[Filename: variable length UTF-8]
[Image Length: 4 bytes, big-endian]
[Image Data: 480-byte chunks]
```

## Error Handling

```typescript
try {
  const result = await sendImageToDevice(deviceId, base64, filename);
  
  if (!result.success) {
    console.error("Failed:", result.error);
    // Handle transmission error
  }
} catch (error) {
  console.error("Exception:", error);
  // Handle unexpected error
}
```

## Constants

```typescript
// BLE chunk size
const BLE_FILE_CHUNK_SIZE = 480;  // Maximum bytes per chunk

// Maximum image size
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;  // 5MB

// Delay between chunks
const CHUNK_DELAY = 50;  // milliseconds
```

## State Management in EventForm

```typescript
// Image selection state
const [selectedImage, setSelectedImage] = useState<{
  uri: string;
  base64?: string;
} | null>(null);

// Processing state
const [isResizingImage, setIsResizingImage] = useState(false);

// Handle image picker
const handlePickImage = () => {
  // Opens action sheet with:
  // - Take Photo
  // - Choose from Gallery
  // - Remove Image
  // - Cancel
};
```

## Logging Output Example

```
📸 Starting image processing for: file:///path/to/image.jpg
📋 File info: { exists: true, size: 245634 }
📖 Reading image file to base64...
✅ Image processed successfully
📊 Base64 length: 327512 characters
📝 Filename: school-time.png

🖼️  Starting image send for device ABC123
✅ Device ABC123 is still connected
📦 Image size: 245634 bytes
📝 Filename bytes: 14 bytes (school-time.png)
📏 Sending filename length header: 14 bytes
✅ Filename length header written
✅ Filename written (14 bytes)
📏 Sending image length header: 245634 bytes
✅ Image length header written
📦 Sending image in 513 chunks (480 bytes each)
📦 Chunk 1/513: 480 bytes
✅ Chunk 1 written
...
✅ Image sent successfully to FILE_TRANSFER_CHAR_UUID
```

## Dependency Versions

```json
{
  "react-native-image-picker": "5.0.1",
  "expo-file-system": "~15.4.5"
}
```

## Testing Checklist

- [ ] Select image from gallery
- [ ] Capture image with camera
- [ ] Remove selected image
- [ ] Verify image preview shows correctly
- [ ] Save event with image
- [ ] Verify event loads with image data
- [ ] Send image to connected device
- [ ] Verify device receives image correctly
- [ ] Test with large image (>2MB)
- [ ] Test with very small image
- [ ] Test device disconnect during send
- [ ] Test invalid filename characters
- [ ] Test missing image file
- [ ] Test corrupted image data
