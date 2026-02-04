# Event Image Integration - Implementation Guide

This document describes the new image functionality added to the Crocker app for events.

## Overview

Events can now have an optional image attached. Images are:

- Selected or captured via camera by the user
- Processed to extract base64 data
- Stored with the event in Firebase
- Sent to devices via Bluetooth when events are synced

## Features

### 1. Image Selection & Capture

- Users can take a photo with the camera
- Users can select an image from their photo library
- Selected image is previewed in the event form
- Users can remove an image before saving

**Location:** [app/components/EventForm.tsx](app/components/EventForm.tsx)

**Implementation:**

- Uses `react-native-image-picker` (already in dependencies)
- `launchCamera()` - Opens device camera
- `launchImageLibrary()` - Opens photo library
- Base64 encoding enabled for instant use

### 2. Image Processing Service

**Location:** [app/services/imageService.ts](app/services/imageService.ts)

**Core Functions:**

#### `processImageForDevice(imageUri, imageBase64?, eventName?)`

- Converts event name to valid filename (e.g., "School time" → "school-time.png")
- Reads image and extracts base64 data
- Returns `ImageData` with URI, base64, and filename
- Error handling included

#### `validateImageSize(base64String)`

- Validates image is under 5MB max
- Logs size for debugging
- Returns boolean validation result

#### `eventNameToFilename(eventName)`

- Converts event names to lowercase
- Replaces spaces with dashes
- Removes special characters
- Returns: `event-name-with-dashes.png`

#### `base64ToBytes(base64String)`

- Converts base64 string to byte array
- Used for BLE transmission
- Error handling for invalid base64

### 3. Event Model Update

**Location:** [app/services/calendarService.ts](app/services/calendarService.ts)

**CalendarEvent Interface:**

```typescript
interface CalendarEvent {
  // ... existing fields
  imageData?: {
    base64: string; // Base64 encoded PNG image
    filename: string; // event-name-with-dashes.png
    originalUri?: string; // Original device URI
  };
}
```

### 4. Bluetooth Image Transfer

**Location:** [app/services/bluetoothService.ts](app/services/bluetoothService.ts)

#### `sendImageToDevice(deviceId, imageBase64, filename, eventName?)`

**Protocol Details:**
The function sends image data via the FILE_TRANSFER characteristic (550e8400-e29b-41d4-a716-446655440002) using the following protocol:

```
[Filename Length (2 bytes, big-endian)]
[Filename (variable length UTF-8)]
[Image Data Length (4 bytes, big-endian)]
[Image Data (variable length, chunked at 480 bytes)]
```

**Features:**

- Automatic reconnection if device disconnects
- Chunked transmission (480 bytes per chunk)
- 50ms delays between chunks for device processing
- Comprehensive logging for debugging
- Error handling and retry capability
- Returns `ServiceResponse<boolean>` with success status

**Transmission Flow:**

1. Verify device connection
2. Convert image to bytes
3. Send filename length header
4. Send filename
5. Send image data length header
6. Send image data in 480-byte chunks with 50ms delays

### 5. Event Form Integration

**Location:** [app/components/EventForm.tsx](app/components/EventForm.tsx)

**Changes:**

- Added image picker button in Event Details section
- Shows selected image preview (200px height)
- Displays "Image will be resized to 480×480" hint
- Added loading overlay while processing image
- Updated `handleSave()` to process image before saving event
- Image processing includes error handling

**UI Components:**

- Image picker button with tap handler
- Image preview display
- Loading indicator with "Processing image..." text
- Image selection modal with camera/gallery/remove options

## Usage Flow

### Creating an Event with Image

1. User creates new event in app
2. User enters event title and details
3. User taps "Tap to add a photo" button
4. User chooses: Take Photo, Choose from Gallery, or Cancel
5. User confirms image selection
6. Image appears as preview in form
7. User continues filling event details
8. User taps "Save" button
9. App shows "Processing image..." loading indicator
10. Image is processed to extract base64
11. Image size is validated (< 5MB)
12. Event with image data is saved to Firebase
13. Loading indicator disappears, form closes

### Syncing Image to Device

When events are synced to devices:

1. Event data is sent via CONFIG characteristic
2. If event has image data, `sendImageToDevice()` is called
3. Image filename is derived from event name
4. Image is sent in chunks via FILE_TRANSFER characteristic
5. Device receives and saves image

## Technical Stack

**Dependencies Added/Used:**

- `react-native-image-picker` 5.0.1 - Image selection
- `expo-file-system` ~15.4.5 - File reading (new)

**Existing Dependencies Used:**

- `react-native-ble-manager` - Bluetooth communication
- Firebase - Event storage

## Error Handling

### Image Processing Errors

- Try/catch with user-friendly alerts
- File reading failures
- Base64 conversion failures
- Image size validation failures

### Bluetooth Transmission Errors

- Device disconnection detection and auto-reconnect
- Write operation error handling per chunk
- Comprehensive error logging
- Service response with error messages

### Validation

- Empty image check
- Size validation (5MB max)
- Filename validation
- Base64 integrity validation

## Logging

Comprehensive logging at each step:

```
📸 Starting image processing...
📖 Reading image file to base64...
✅ Image processed successfully
📊 Base64 length: X characters
📝 Filename: event-name.png
🖼️  Starting image send...
📏 Sending filename length header
📦 Chunk X/Y: Z bytes
✅ Image sent successfully
```

## Testing Recommendations

1. **Image Selection:**
   - Test camera capture
   - Test gallery selection
   - Test with different image formats
   - Test with very large images (validate size limit)

2. **Image Processing:**
   - Test filename generation with various event names
   - Test base64 encoding accuracy
   - Test with corrupted image files

3. **Bluetooth Transmission:**
   - Test with short filenames and long filenames
   - Test with various image sizes
   - Test device disconnection during transfer
   - Test with multiple devices

4. **Edge Cases:**
   - User takes photo but cancels
   - User selects image but removes it before saving
   - Network error during Firebase save
   - Device disconnects during image transfer
   - Very large images (>5MB)

## Future Enhancements

1. **Image Compression:**
   - Add automatic JPEG compression option
   - Allow user to choose compression quality
   - Reduce base64 size further

2. **Image Resizing:**
   - Implement actual 480x480 resize using image library
   - Add different size presets
   - Preserve aspect ratio options

3. **Image Management:**
   - View images from past events
   - Edit event images
   - Delete event images from device

4. **Sync Enhancement:**
   - Add image sync status tracking
   - Implement image upload progress feedback
   - Queue image transfers if device unavailable

5. **Device Features:**
   - Implement device-side image display on event alerts
   - Add image cache management on device
   - Support multiple images per event

## Files Modified

1. **[app/components/EventForm.tsx](app/components/EventForm.tsx)** - Added image picker UI and event form integration
2. **[app/services/calendarService.ts](app/services/calendarService.ts)** - Updated CalendarEvent interface
3. **[app/services/bluetoothService.ts](app/services/bluetoothService.ts)** - Added sendImageToDevice function
4. **[package.json](package.json)** - Added expo-file-system dependency

## Files Created

1. **[app/services/imageService.ts](app/services/imageService.ts)** - Image processing utilities

## Next Steps

1. Install dependencies: `npm install` or `yarn install`
2. Test image selection in app
3. Test image sending to device
4. Verify images appear correctly on device display
5. Test error scenarios and edge cases
6. Consider additional enhancements from "Future Enhancements" section
