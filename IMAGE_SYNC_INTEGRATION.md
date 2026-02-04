# Event Image Sync Integration Guide

This guide explains how to integrate event images with the existing eventSyncService.

## Current Architecture

The `eventSyncService` manages synchronization of event schedules to devices. Images are now stored with events and should be sent when events are synced.

## Integration Points

### 1. Event Creation Flow

When a user creates an event with an image:

```
EventForm (user selects image)
    ↓
Image Processing (processImageForDevice)
    ↓
CalendarEvent with imageData
    ↓
Firebase saves event
    ↓
Event assigned to devices
    ↓
[To be implemented] Send image to devices
```

### 2. Event Sync Flow

Current flow sends schedule only:

```
syncDeviceEvents(kidId, deviceId)
    ↓
sendEventBatchWithRetry(eventBatch, deviceId)
    ↓
sendJSONAlert (sends CONFIG characteristic)
    ↓
✅ Events synced
```

Proposed enhanced flow:

```
syncDeviceEvents(kidId, deviceId)
    ↓
sendEventBatchWithRetry(eventBatch, deviceId)
    ↓
sendJSONAlert (sends CONFIG characteristic with events)
    ↓
[NEW] For each event with imageData:
      sendImageToDevice(deviceId, imageBase64, filename)
    ↓
✅ Events and images synced
```

## Implementation Steps

### Step 1: Modify Event Batch Structure

The current event batch includes only alerts. Extend it to include image references:

```typescript
// In eventSyncService.ts - enhance AlertBatch or create new structure
export interface EventBatchWithImages extends AlertBatch {
  events: Array<{
    eventId: string;
    title: string;
    imageFilename?: string; // "school-time.png" if image exists
  }>;
}
```

### Step 2: Update sendEventBatchWithRetry

Modify `sendEventBatchWithRetry` to handle image syncing:

```typescript
private async sendEventBatchWithRetry(
  eventBatch: AlertBatch,
  targetDeviceId: string,
  kidId: string
): Promise<boolean> {
  const bleConnection = useBleConnection();
  const jsonPayload = this.formatEventBatchForTransmission(eventBatch);

  try {
    // Send event schedule via CONFIG characteristic
    const success = await bleConnection.sendJSONAlert(
      jsonPayload,
      targetDeviceId
    );

    if (success) {
      // NEW: Send images for events in this batch
      await this.sendEventImages(eventBatch, targetDeviceId, kidId);

      console.log(
        `✅ Event batch successfully synced to device ${targetDeviceId}`
      );
      await this.markSyncSuccessful(
        targetDeviceId,
        kidId,
        eventBatch,
        syncAttempt
      );
      return true;
    }
  } catch (error) {
    // ... error handling
  }

  return false;
}
```

### Step 3: Add Image Sending Method

Create a new private method in eventSyncService:

```typescript
private async sendEventImages(
  eventBatch: AlertBatch,
  deviceId: string,
  kidId: string
): Promise<void> {
  try {
    const user = firebaseService.getCurrentUser();
    if (!user) return;

    // Get full event data (currently we only have alerts)
    const events = await this.getEventsForDateRange(
      user.uid,
      eventBatch.generatedAt,
      eventBatch.validUntil
    );

    const bluetoothService = require("./bluetoothService");

    // Filter for events assigned to this device with images
    for (const event of events) {
      if (
        event.imageData &&
        event.assignedDeviceIds?.includes(deviceId)
      ) {
        console.log(
          `🖼️  Sending image for event: ${event.title}`
        );

        const sendResult = await bluetoothService.sendImageToDevice(
          deviceId,
          event.imageData.base64,
          event.imageData.filename,
          event.title
        );

        if (!sendResult.success) {
          console.warn(
            `⚠️ Failed to send image for event ${event.title}: ${sendResult.error}`
          );
          // Continue with other images, don't fail entire sync
        } else {
          console.log(
            `✅ Image sent for event: ${event.title}`
          );
        }
      }
    }
  } catch (error) {
    console.error("Error sending event images:", error);
    // Don't fail the entire sync if images fail
  }
}
```

### Step 4: Update Event Assignment

When events are assigned to devices, trigger image sync:

```typescript
// In calendarService or where assignEventToDevices is called
const assignEventToDevices = async (
  eventId: string,
  deviceIds: string[],
): Promise<void> => {
  // ... existing assignment logic

  // NEW: Trigger image sync if event has image
  const event = await getEventById(eventId);
  if (event?.imageData) {
    for (const deviceId of deviceIds) {
      // Queue image send for later or send immediately if connected
      await queueImageForSync(eventId, deviceId, event.imageData);
    }
  }
};
```

## Alternative: Separate Image Sync Queue

If you want more control over image syncing, implement a separate queue:

```typescript
// In eventSyncService.ts

export interface ImageSyncQueue {
  eventId: string;
  deviceId: string;
  imageData: CalendarEvent["imageData"];
  filename: string;
  scheduledAt: Date;
  attempts: number;
  maxAttempts: number;
}

private imageSyncQueue: ImageSyncQueue[] = [];

// Add image to sync queue
private async queueImageForSync(
  eventId: string,
  deviceId: string,
  imageData: CalendarEvent["imageData"]
): Promise<void> {
  if (!imageData) return;

  this.imageSyncQueue.push({
    eventId,
    deviceId,
    imageData,
    filename: imageData.filename,
    scheduledAt: new Date(),
    attempts: 0,
    maxAttempts: 3,
  });

  // Persist to AsyncStorage
  await this.saveImageSyncQueue();
}

// Process image sync queue
private async processImageSyncQueue(): Promise<void> {
  const bluetoothService = require("./bluetoothService");

  for (let i = 0; i < this.imageSyncQueue.length; i++) {
    const item = this.imageSyncQueue[i];

    if (item.attempts >= item.maxAttempts) {
      // Max retries exceeded, remove from queue
      this.imageSyncQueue.splice(i, 1);
      i--;
      continue;
    }

    const result = await bluetoothService.sendImageToDevice(
      item.deviceId,
      item.imageData.base64,
      item.filename
    );

    if (result.success) {
      // Image sent successfully, remove from queue
      this.imageSyncQueue.splice(i, 1);
      i--;
    } else {
      // Mark attempt
      item.attempts++;
    }
  }

  // Persist updated queue
  await this.saveImageSyncQueue();
}
```

## Data Flow Diagram

```
┌─────────────┐
│ User Action │
├─────────────┤
│ Create Event│
│ with Image  │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ EventForm        │
│ - Select image   │
│ - Process image  │
│ - Save event     │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Firebase         │
│ - Store event    │
│ - With imageData │
└──────┬───────────┘
       │
       ▼
┌──────────────────────┐
│ Calendar Context     │
│ - assignEventToDevs  │
└──────┬───────────────┘
       │
       ▼
┌──────────────────┐
│ Event Sync       │
│ - Schedule sync  │
│ - Image sync     │
└──────┬───────────┘
       │
       ├─────────────────────┐
       │                     │
       ▼                     ▼
┌──────────────────┐  ┌──────────────────┐
│ CONFIG Char      │  │ FILE_TRANSFER    │
│ - Events JSON    │  │ - Image bytes    │
│ - Schedules      │  │ - 480-byte chunks│
└──────────────────┘  └──────────────────┘
       │                     │
       └─────────┬───────────┘
                 │
                 ▼
        ┌────────────────┐
        │ Device         │
        │ - Display      │
        │ - Image        │
        │ - Event alert  │
        └────────────────┘
```

## Testing the Integration

### Manual Testing

1. Create event with image
2. Assign event to device
3. Check Bluetooth logs for image send
4. Verify image appears on device

### Automated Testing

```typescript
test("sends event images when syncing to device", async () => {
  // Create event with image
  const event = {
    title: "Test Event",
    imageData: {
      base64: "iVBORw0KGgoAAAANS...",
      filename: "test-event.png",
    },
  };

  // Assign to device
  await assignEventToDevices(event.id, [deviceId]);

  // Trigger sync
  const syncResult = await eventSyncService.syncDeviceEvents(kidId, deviceId);

  // Verify sync succeeded
  expect(syncResult).toBe(true);

  // Verify sendImageToDevice was called
  expect(bluetoothService.sendImageToDevice).toHaveBeenCalledWith(
    deviceId,
    event.imageData.base64,
    event.imageData.filename,
  );
});
```

## Monitoring & Debugging

Add logs to track image sync progress:

```typescript
// Enable detailed logging
const VERBOSE_LOGGING = __DEV__;

function logImageSync(message: string, data?: any) {
  if (VERBOSE_LOGGING) {
    console.log(`[ImageSync] ${message}`, data || "");
  }
}

// Usage
logImageSync("Starting image sync", { eventId, deviceId });
logImageSync("Image sent", { filename, bytes: imageBytes.length });
logImageSync("Image sync failed", { error: result.error });
```

## Performance Considerations

1. **Chunked Transmission**: Images are sent in 480-byte chunks with 50ms delays
   - A 1MB image takes ~100 chunks = ~5 seconds

2. **Sequential Processing**: Process one image at a time per device
   - Multiple devices process in parallel

3. **Queue Management**: Only keep necessary images in memory
   - Persist to AsyncStorage for reliability

4. **Size Limits**: 5MB max per image
   - Validate before attempting send

## Error Recovery

```typescript
// Automatic retry on failure
if (!sendResult.success) {
  if (isTransientError(sendResult.error)) {
    // Schedule retry in background
    await queueImageForSync(eventId, deviceId, imageData);
  } else {
    // Log permanent error
    console.error("Permanent failure:", sendResult.error);
  }
}

function isTransientError(error: string): boolean {
  return (
    error.includes("disconnect") ||
    error.includes("timeout") ||
    error.includes("transmission failed")
  );
}
```

## Future Enhancements

1. **Progress Tracking**: Show upload progress for large images
2. **Bandwidth Throttling**: Limit image sync during metered connections
3. **Image Caching**: Cache sent images to avoid resending
4. **Batch Processing**: Send multiple images concurrently
5. **Device Storage**: Track device storage and manage image cleanup
