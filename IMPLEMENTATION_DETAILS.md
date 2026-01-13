# Implementation Details & Integration Points

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    EventForm (UI)                            │
│  - Device selector dropdown                                 │
│  - assignEventToDevices / unassignEventFromDevices         │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                CalendarContext                              │
│  - assignEventToDevices()                                   │
│  - unassignEventFromDevices()                               │
│  - markDeviceForResync()                                    │
│  - sendEventScheduleToDevice()                              │
│  - syncAllDeviceEvents()                                    │
│  - checkForDeviceResyncNeeds()                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
   Firebase       Bluetooth      AppState
   Updates        Service        Listener
```

## File-by-File Changes

### 1. `app/models/index.ts`

**Changes:**

- Event interface: Added `assignedDeviceIds?: string[]`
- RegisteredDevice interface: Added `eventsUpdatedFlag?: boolean` and `lastEventsSyncTime?: Date | null`

**Why:**

- Track which devices need the event
- Track when each device needs an update

### 2. `app/services/bluetoothService.ts`

**New Functions:**

- `createEventScheduleForDevice(deviceId)` - Creates JSON payload
- `sendEventScheduleToDevice(deviceId)` - Sends JSON to device via BLE

**Why:**

- Separates event scheduling from other Bluetooth operations
- Provides clean API for sending event schedules
- Filters events per device automatically

**BLE Details:**

- Uses CONFIG_CHAR_UUID (`550e8400-e29b-41d4-a716-446655440001`)
- Sends JSON as UTF-8 string bytes
- No acknowledgment required (fire and forget)

### 3. `app/contexts/CalendarContext.tsx`

**New Functions:**

```typescript
assignEventToDevices(eventId, deviceIds)
├─ Updates event in Firebase
├─ Sets assignedDeviceIds array
├─ Calls markDeviceForResync for each device
└─ Auto-syncs if connected

unassignEventFromDevices(eventId, deviceIds)
├─ Updates event in Firebase
├─ Removes from assignedDeviceIds array
├─ Calls markDeviceForResync for each device
└─ Auto-syncs if connected

markDeviceForResync(deviceId)
├─ Gets device from Firebase
├─ Sets eventsUpdatedFlag: true
├─ Updates lastEventsSyncTime
└─ Saves to Firebase

sendEventScheduleToDevice(deviceId)
├─ Calls bluetoothService.sendEventScheduleToDevice()
├─ Clears eventsUpdatedFlag on success
├─ Updates lastEventsSyncTime
└─ Updates Firebase

syncAllDeviceEvents()
├─ Gets all registered devices
├─ Filters devices with eventsUpdatedFlag: true
├─ Calls sendEventScheduleToDevice for each
└─ Updates lastSyncTime

checkForDeviceResyncNeeds()
├─ Checks if app is active
├─ Gets all registered devices
├─ Filters devices needing sync
└─ Calls syncAllDeviceEvents()
```

**Integration with Existing Code:**

- Hooks into existing Firebase integration
- Uses existing BluetoothContext connection state
- Follows CalendarContext patterns and hooks
- No breaking changes to existing APIs

### 4. `app/components/EventForm.tsx`

**New State:**

```typescript
const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
const [showDeviceSelector, setShowDeviceSelector] = useState(false);
```

**New Functions:**

```typescript
getAvailableDevices()
├─ Iterates through kids
├─ Collects deviceIds
└─ Returns array of {id, name}

toggleDeviceSelection(deviceId)
├─ Adds/removes from selectedDeviceIds
└─ Updates state
```

**UI Changes:**

1. Added device selector dropdown in Assignment section
2. Added Device Selector modal (FlatList with checkmarks)
3. Shows count of selected devices
4. Displays hint text when devices selected

**Form Submission Changes:**

```typescript
handleSave()
├─ If edit mode:
│  ├─ Detect added devices
│  ├─ Detect removed devices
│  ├─ Call assignEventToDevices for added
│  └─ Call unassignEventFromDevices for removed
└─ If create mode:
   ├─ Create event
   └─ Call assignEventToDevices if devices selected
```

## Data Flow Examples

### Creating Event with Device Assignment

```
User input:
  Title: "Breakfast"
  Start: 2025-01-10 8:00 AM
  End: 2025-01-10 8:30 AM
  Kid: "Emma"
  Devices: ["device-001", "device-002"]
  │
  ▼
EventForm.handleSave()
  │
  ├─ const newEvent = await addEvent(eventData)
  │  └─ Saves to Firebase with assignedDeviceIds
  │
  ├─ await assignEventToDevices(newEvent.id, ["device-001", "device-002"])
  │  ├─ For device-001:
  │  │  ├─ markDeviceForResync("device-001")
  │  │  │  └─ device.eventsUpdatedFlag = true
  │  │  │  └─ Save to Firebase
  │  │  └─ sendEventScheduleToDevice("device-001")
  │  │     └─ BLE write to 0001
  │  │
  │  └─ For device-002: (same as above)
  │
  └─ Show success alert

Firebase State After:
  Event:
    ├─ id: "event_123"
    ├─ title: "Breakfast"
    ├─ assignedDeviceIds: ["device-001", "device-002"]
    └─ ...

  Device-001:
    ├─ id: "device-001"
    ├─ eventsUpdatedFlag: false (cleared after sync)
    ├─ lastEventsSyncTime: 2025-01-10T08:00:00Z
    └─ ...
```

### Editing Event - Removing Device

```
User changes:
  Remove "device-002" from assignment
  │
  ▼
handleSave()
  │
  ├─ previousDeviceIds: ["device-001", "device-002"]
  ├─ selectedDeviceIds: ["device-001"]
  │
  ├─ removedDevices = ["device-002"]
  ├─ await unassignEventFromDevices(eventId, ["device-002"])
  │  ├─ markDeviceForResync("device-002")
  │  │  └─ device-002.eventsUpdatedFlag = true
  │  └─ sendEventScheduleToDevice("device-002")
  │     └─ BLE write with updated schedule (no "Breakfast" now)
  │
  ├─ addedDevices = [] (none)
  │
  └─ Show success alert

Firebase State:
  Device-002:
    ├─ eventsUpdatedFlag: false (cleared after sync)
    ├─ lastEventsSyncTime: 2025-01-10T08:05:00Z (updated)
    └─ Event no longer in its assigned list
```

### App Becomes Active - Auto Sync

```
User opens app
  │
  ▼
AppState listener: nextAppState === "active"
  │
  ├─ Trigger useEffect dependency
  │
  └─ checkForDeviceResyncNeeds()
     ├─ Get all registered devices from Firebase
     ├─ Filter: devices with eventsUpdatedFlag === true
     │
     ├─ Device-001: eventsUpdatedFlag = true
     │  ├─ createEventScheduleForDevice("device-001")
     │  │  └─ Creates JSON with Breakfast + other events
     │  │
     │  ├─ sendEventScheduleToDevice("device-001")
     │  │  ├─ BLE write to 0001 characteristic
     │  │  └─ Send JSON: {"events": [...]}
     │  │
     │  └─ On success:
     │     ├─ device-001.eventsUpdatedFlag = false
     │     └─ device-001.lastEventsSyncTime = now
     │
     └─ Device-003: eventsUpdatedFlag = false
        └─ Skip (no update needed)
```

## Integration Checklist

- [x] Models updated with device assignment fields
- [x] Bluetooth service can format and send events to 0001 characteristic
- [x] Calendar context has device assignment/sync functions
- [x] Event form UI has device selector
- [x] Form submission handles device assignment
- [x] Auto-sync on app foreground
- [x] Firebase integration for persistent storage
- [x] Error handling in all functions
- [x] Console logging for debugging

## Testing Scenarios

### Test 1: Create Event, Assign to Single Device

```
1. Create event "Lunch"
2. Assign to Emma's device
3. Verify:
   - Event has assignedDeviceIds: ["device-001"]
   - Device has eventsUpdatedFlag: true
   - JSON sent to device contains "Lunch"
```

### Test 2: Edit Event, Add Device

```
1. Open existing event
2. Add another device
3. Verify:
   - assignedDeviceIds updated
   - markDeviceForResync called for new device
   - Schedule synced to new device
```

### Test 3: App Lifecycle Auto-Sync

```
1. Close app (or background)
2. Create event in another app (or update Firebase directly)
3. Open Crocker app
4. Verify:
   - checkForDeviceResyncNeeds triggered
   - Devices with eventsUpdatedFlag synced
   - Sync completed within 5 seconds
```

### Test 4: Multiple Events, Multiple Devices

```
1. Create 3 events, assign to 2 devices each
2. Verify Firebase state correct
3. Close/reopen app
4. Verify all 6 device-event pairs synced
```
