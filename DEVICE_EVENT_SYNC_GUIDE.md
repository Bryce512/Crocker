# Device Event Assignment - Quick Reference

## For Users

### Assigning an Event to a Device (Kid)

1. Open the Event Form (Create New or Edit Existing)
2. Fill in event details (title, date/time, alerts)
3. In the "Assignment" section:
   - Select which child the event is for (assigns alert notifications)
   - Select which devices to send the schedule to (sends event data)
4. Tap "Save"
5. The event schedule automatically syncs to selected devices

### Syncing Events to Devices

**Automatic:**

- When you open the app, it checks if any devices need schedule updates
- If devices are flagged for sync, schedules are sent automatically

**Manual:**

- Call `syncAllDeviceEvents()` from Calendar context to force sync all devices

## For Developers

### Core API

```typescript
// From useCalendar() hook
const calendar = useCalendar();

// Assign events to devices
await calendar.assignEventToDevices(eventId, [deviceId1, deviceId2]);

// Remove events from devices
await calendar.unassignEventFromDevices(eventId, [deviceId1]);

// Mark device for resync (automatic, but can be manual)
await calendar.markDeviceForResync(deviceId);

// Send schedule to specific device
const success = await calendar.sendEventScheduleToDevice(deviceId);

// Sync all devices
await calendar.syncAllDeviceEvents();

// Check and auto-sync devices needing updates
await calendar.checkForDeviceResyncNeeds();
```

### Bluetooth Service API

```typescript
import bluetoothService from "../services/bluetoothService";

// Create schedule JSON for device
const json = await bluetoothService.createEventScheduleForDevice(deviceId);

// Send to device (via CONFIG_CHAR_UUID / 0001)
const response = await bluetoothService.sendEventScheduleToDevice(deviceId);
if (response.success) {
  console.log("Schedule sent successfully");
}
```

### Data Flow

```
User creates/edits event with device selection
↓
EventForm.handleSave()
↓
assignEventToDevices() / unassignEventFromDevices()
↓
markDeviceForResync() → sets eventsUpdatedFlag: true
↓
Firebase update
↓
App lifecycle: App becomes active
↓
checkForDeviceResyncNeeds()
↓
For each device with eventsUpdatedFlag:
  createEventScheduleForDevice() → JSON
  ↓
  sendEventScheduleToDevice() → BLE send to 0001
  ↓
  Clear eventsUpdatedFlag: false
  ↓
  Update lastEventsSyncTime
```

### Event Schedule JSON Structure

Sent to Bluetooth characteristic `550e8400-e29b-41d4-a716-446655440001` (CONFIG_CHAR_UUID):

```json
{
  "events": [
    {
      "start": 360,
      "duration": 1800,
      "label": "Breakfast",
      "path": "/sdcard/breakfast.png"
    }
  ]
}
```

**Field Descriptions:**

- `start`: Minutes from midnight (0 = midnight, 720 = noon, 1440 = next midnight)
- `duration`: Seconds (1800 = 30 minutes)
- `label`: Event title/name (max 50 chars recommended)
- `path`: Image file path on device (typically /sdcard/...)

### Example: Manual Sync Trigger

```typescript
const { syncAllDeviceEvents } = useCalendar();

const handleSyncButton = async () => {
  try {
    await syncAllDeviceEvents();
    Alert.alert("Success", "All devices synced");
  } catch (error) {
    Alert.alert("Error", "Sync failed");
  }
};
```

### Example: Check Device Sync Status

```typescript
// Get device from Firebase
const device = await firebaseService.getRegisteredDevice(deviceId);

if (device.eventsUpdatedFlag) {
  console.log("Device needs sync");
  console.log("Last sync:", device.lastEventsSyncTime);
}
```

## Constants

- **Service UUID**: `550e8400-e29b-41d4-a716-446655440000`
- **Config Characteristic (0001)**: `550e8400-e29b-41d4-a716-446655440001`
- **Time Window**: Next 24 hours from current time
- **Max Label Length**: 50 characters
- **Sync Check Interval**: On app foreground (AppState.active)

## Troubleshooting

**Device not receiving schedule:**

- Check `eventsUpdatedFlag` is true on device
- Verify device is connected
- Check Bluetooth characteristic write permissions
- Review console logs for BLE errors

**Events not showing device assignment:**

- Verify kid has `deviceId` set
- Check event `assignedDeviceIds` array in Firebase
- Confirm device is registered and active

**Sync not triggering automatically:**

- Check `eventsUpdatedFlag` is set correctly
- Verify app foreground detection is working
- Check device connection state
- Review AppState listener setup
