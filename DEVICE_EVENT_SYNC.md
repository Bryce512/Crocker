# Device Event Assignment & Sync Implementation

## Overview

This implementation adds the ability to assign events to specific devices (kids' devices) and automatically sync updated event schedules to those devices via Bluetooth.

## Changes Made

### 1. Data Models (`app/models/index.ts`)

#### Event Interface

- **Added**: `assignedDeviceIds?: string[]` - Array to track which devices the event is assigned to

#### RegisteredDevice Interface

- **Added**: `eventsUpdatedFlag?: boolean` - Indicates when the device needs an event schedule sync
- **Added**: `lastEventsSyncTime?: Date | null` - Timestamp of the last successful event sync

### 2. Bluetooth Service (`app/services/bluetoothService.ts`)

#### New Functions

**`createEventScheduleForDevice(deviceId: string): Promise<string>`**

- Creates a JSON payload with the simplified event format specified
- Filters events assigned to the given device for the next 24 hours
- Returns JSON with structure:

```json
{
  "events": [
    {
      "start": 360, // minutes from midnight
      "duration": 1800, // seconds
      "label": "Event Title",
      "path": "/sdcard/event.png"
    }
  ]
}
```

**`sendEventScheduleToDevice(deviceId: string): Promise<ServiceResponse<boolean>>`**

- Sends the event schedule to a device via the CONFIG_CHAR_UUID (0001 characteristic)
- Converts JSON to bytes and transmits via BLE
- Logs success/failure status

### 3. Calendar Context (`app/contexts/CalendarContext.tsx`)

#### New Context Functions

**`assignEventToDevices(eventId: string, deviceIds: string[]): Promise<void>`**

- Assigns an event to one or more devices
- Updates event record in Firebase with device IDs
- Triggers resync flag for affected devices
- Automatically syncs to those devices

**`unassignEventFromDevices(eventId: string, deviceIds: string[]): Promise<void>`**

- Removes event from specific devices
- Updates Firebase record
- Marks devices for resync

**`markDeviceForResync(deviceId: string): Promise<void>`**

- Sets `eventsUpdatedFlag: true` on the device
- Updates `lastEventsSyncTime` timestamp
- Saves to Firebase

**`sendEventScheduleToDevice(deviceId: string): Promise<boolean>`**

- Sends the event schedule to a specific device via Bluetooth
- Clears the `eventsUpdatedFlag` after successful sync
- Updates `lastEventsSyncTime`

**`syncAllDeviceEvents(): Promise<void>`**

- Syncs all devices that have `eventsUpdatedFlag: true`
- Iterates through devices needing sync and sends schedules

**`checkForDeviceResyncNeeds(): Promise<void>`**

- Auto-triggered when app becomes active
- Checks for devices with `eventsUpdatedFlag: true`
- Automatically initiates sync if device is connected

#### Updated Context Type

Added new methods to `CalendarContextType`:

- `assignEventToDevices`
- `unassignEventFromDevices`
- `markDeviceForResync`
- `sendEventScheduleToDevice`
- `syncAllDeviceEvents`
- `checkForDeviceResyncNeeds`

### 4. Event Form UI (`app/components/EventForm.tsx`)

#### New State

- `selectedDeviceIds: string[]` - Tracks which devices are selected for the event

#### New UI Section

- **"Send schedule to" Dropdown** - Shows available devices (from kids with registered devices)
- **Device Selector Modal** - Multi-select modal to choose devices
- Shows count of selected devices
- Displays hint text when devices are selected

#### Updated Save Logic

- Handles device assignment when creating/editing events
- Calls `assignEventToDevices` for newly selected devices
- Calls `unassignEventFromDevices` for removed devices
- Properly manages device-event relationships

## Workflow

### Creating/Editing an Event with Device Assignment

1. User opens the event form (create or edit mode)
2. User selects which devices to assign the event to via "Send schedule to" dropdown
3. User saves the event
4. System:
   - Saves event to Firebase with `assignedDeviceIds`
   - Calls `assignEventToDevices()` for each selected device
   - Sets `eventsUpdatedFlag: true` on those devices
   - If connected, automatically syncs to those devices

### Auto-Sync on App Activation

1. App becomes active (foreground)
2. `checkForDeviceResyncNeeds()` is triggered
3. System:
   - Checks all devices for `eventsUpdatedFlag: true`
   - For each device needing sync:
     - Calls `sendEventScheduleToDevice(deviceId)`
     - Device receives JSON payload on CONFIG_CHAR_UUID
     - Flag is cleared after successful sync

### Manual Sync

- Users can call `syncAllDeviceEvents()` from the UI to manually trigger sync for all devices
- Individual device sync via `sendEventScheduleToDevice(deviceId)`

## Event Schedule JSON Format

Sent to Bluetooth characteristic 0001 (CONFIG_CHAR_UUID):

```json
{
  "events": [
    {
      "start": 360,
      "duration": 1800,
      "label": "Breakfast",
      "path": "/sdcard/breakfast.png"
    },
    {
      "start": 540,
      "duration": 3600,
      "label": "Play Time",
      "path": "/sdcard/playtime.png"
    }
    // ... more events
  ]
}
```

- **start**: Minutes from midnight (0-1440)
- **duration**: Seconds (how long the event lasts)
- **label**: Event title (max 50 chars)
- **path**: Image file path on device SD card

## Key Features

✅ **Per-Device Event Assignment** - Each event can be assigned to multiple devices
✅ **Sync Status Tracking** - Each device tracks when schedule was last synced
✅ **Auto-Sync on Connection** - Devices sync when app becomes active if flag is set
✅ **Manual Sync Support** - Users can manually trigger sync from UI
✅ **24-Hour Window** - Only events in next 24 hours are synced
✅ **JSON Format** - Simplified, efficient format for device consumption
✅ **Firebase Integration** - All state persisted to Firebase

## Testing Checklist

- [ ] Create event and assign to single device
- [ ] Create event and assign to multiple devices
- [ ] Edit event and change device assignments
- [ ] Verify `eventsUpdatedFlag` is set when device assigned
- [ ] Test auto-sync when app becomes active
- [ ] Verify JSON payload structure sent to device
- [ ] Test unassigning devices from event
- [ ] Verify Firebase state updates correctly
- [ ] Test with multiple kids having devices
