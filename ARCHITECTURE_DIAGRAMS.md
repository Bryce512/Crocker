# System Architecture Diagrams

## Overall System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interface                            │
├──────────────┬──────────────────────────┬──────────────────────┤
│ EventForm    │     Calendar             │   Device Manager     │
│ - Device     │     Screen               │   (Future)           │
│   Selector   │   - Show Events          │                      │
│ - Save       │   - Manage Events        │                      │
│   Handler    │                          │                      │
└──────────────┼──────────────────────────┼──────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────┐
│                  CalendarContext (State Management)             │
├──────────────┬──────────────────────────┬──────────────────────┤
│ Event        │ Device Assignment &      │   Sync Management    │
│ Management   │ Tracking                 │   & Auto-Sync        │
│              │                          │                      │
│ - addEvent   │ - assignEventToDevices   │ - markDeviceForSync  │
│ - updateEvent│ - unassignEventFromDev   │ - sendEventSchedule  │
│ - deleteEvent│ - markDeviceForResync    │ - syncAllDevices     │
│              │                          │ - checkForResyncNeeds│
└──────────────┴──────────────────────────┴──────────────────────┘
               │
      ┌────────┼────────┐
      ▼        ▼        ▼
┌──────────┐ ┌────────┐ ┌──────────────┐
│ Firebase │ │ Bluetooth│ │  AppState    │
│ Service  │ │ Service  │ │  Listener    │
└──────────┘ └────────┘ └──────────────┘
      ▲        │
      │        ▼
      │    ┌─────────────────────┐
      │    │ BLE Characteristic  │
      │    │      0001           │
      └────┤  (Config / Events)  │
           └─────────────────────┘
                    │
                    ▼
           ┌──────────────────┐
           │ Physical Device  │
           │   (Kid's Device) │
           └──────────────────┘
```

## Event Assignment Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                  User Creates/Edits Event                        │
│  "Create a Breakfast event and send to Emma and Jake's devices" │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
                ┌────────────────────┐
                │  EventForm.tsx     │
                │  handleSave()      │
                └────────┬───────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
    ┌──────────┐  ┌──────────┐  ┌──────────────┐
    │ Firebase │  │ Assign   │  │ Unassign     │
    │ Event    │  │ Event To │  │ Event From   │
    │ Save     │  │ Devices  │  │ Devices      │
    └──────────┘  └────┬─────┘  └──────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │ Device1  │ │ Device2  │ │ Device3  │
    │ Mark     │ │ Mark     │ │ Mark     │
    │ For Sync │ │ For Sync │ │ For Sync │
    └────┬─────┘ └────┬─────┘ └────┬─────┘
         │            │            │
         ▼            ▼            ▼
    ┌──────────────────────────────────┐
    │ Firebase RegisteredDevices Update │
    │ eventsUpdatedFlag: true           │
    │ lastEventsSyncTime: now           │
    └────┬─────────────────────────────┘
         │
         ├─ Connected? YES ──────┐
         │                       │
         │                       ▼
         │              ┌──────────────────┐
         │              │ Send to Devices  │
         │              │ (Immediately)    │
         │              └──────────────────┘
         │
         └─ Connected? NO
                        │
                        ▼
              ┌──────────────────┐
              │ Wait for App Open│
              │ (Auto-Sync)      │
              └──────────────────┘
```

## Data Synchronization Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ STATE: Device has eventsUpdatedFlag = true                        │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                    TRIGGER 1: App Opens
                         │
                         ▼
            ┌────────────────────────────┐
            │ AppState Listener Fires    │
            │ "active"                   │
            └────────────┬───────────────┘
                         │
                         ▼
            ┌────────────────────────────┐
            │ checkForDeviceResyncNeeds()│
            │  - Get all devices         │
            │  - Filter by flag          │
            └────────────┬───────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
    ┌────────┐     ┌────────┐     ┌────────┐
    │Device 1│     │Device 2│     │Device 3│
    │ FLAG=T │     │ FLAG=F │     │ FLAG=T │
    │ SYNC   │     │ SKIP   │     │ SYNC   │
    └────┬───┘     └────────┘     └────┬───┘
         │                             │
         ├─────────────┬───────────────┤
         │             │               │
         ▼             ▼               ▼
    ┌──────────────────────────────────────┐
    │ For Each Device:                      │
    │ 1. createEventScheduleForDevice()     │
    │    - Get next 24h events              │
    │    - Filter by device assignment      │
    │    - Create JSON                      │
    │                                       │
    │ 2. sendEventScheduleToDevice()        │
    │    - Send JSON to 0001                │
    │    - BLE write complete               │
    │                                       │
    │ 3. On Success:                        │
    │    - Set eventsUpdatedFlag: false     │
    │    - Update lastEventsSyncTime        │
    │    - Save to Firebase                 │
    └──────────────────────────────────────┘
         │
         ▼
    ┌────────────────────────┐
    │ Device Receives JSON    │
    │ Updates Local Schedule  │
    │ Updates Display         │
    └────────────────────────┘
```

## Event Schedule Creation

```
┌─────────────────────────────────────────────────────────────┐
│ createEventScheduleForDevice(deviceId)                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │ Get All Events from Firebase   │
        │ [Event1, Event2, Event3, ...] │
        └────────────────────┬───────────┘
                             │
                             ▼
        ┌────────────────────────────────┐
        │ Filter 1: Next 24 Hours        │
        │ now <= eventTime <= now+24h    │
        │ Result: [Event1, Event3]       │
        └────────────────────┬───────────┘
                             │
                             ▼
        ┌────────────────────────────────┐
        │ Filter 2: Assigned to Device   │
        │ device_id in assignedDeviceIds │
        │ Result: [Event1]               │
        └────────────────────┬───────────┘
                             │
                             ▼
        ┌────────────────────────────────┐
        │ Sort by Start Time             │
        │ [Event1(8am), Event2(10am)]    │
        └────────────────────┬───────────┘
                             │
                             ▼
        ┌────────────────────────────────┐
        │ For Each Event:                │
        │ Convert to BLE Format:         │
        │                                │
        │ startTime: 8:00 AM             │
        │ → start: 480 (minutes)         │
        │                                │
        │ duration: 30 minutes           │
        │ → duration: 1800 (seconds)     │
        │                                │
        │ label: "Breakfast"             │
        │ → label: "Breakfast"           │
        │                                │
        │ path: "/sdcard/breakfast.png"  │
        │ → path: "/sdcard/breakfast.png"│
        └────────────────────┬───────────┘
                             │
                             ▼
        ┌────────────────────────────────┐
        │ Create JSON:                   │
        │ {                              │
        │   "events": [                  │
        │     {                          │
        │       "start": 480,            │
        │       "duration": 1800,        │
        │       "label": "Breakfast",    │
        │       "path": "/sdcard/..."    │
        │     }                          │
        │   ]                            │
        │ }                              │
        └────────────────────┬───────────┘
                             │
                             ▼
        ┌────────────────────────────────┐
        │ Return JSON String             │
        │ Sent to Device via BLE         │
        └────────────────────────────────┘
```

## Database State Changes

### Before Assignment

```
EVENTS (Firebase):
  event_123:
    ├─ id: "event_123"
    ├─ title: "Breakfast"
    ├─ startTime: 2025-01-10T08:00Z
    ├─ endTime: 2025-01-10T08:30Z
    └─ assignedKidId: "kid_001"

REGISTERED_DEVICES:
  device_001:
    ├─ id: "device_001"
    ├─ nickname: "Emma's Device"
    ├─ eventsUpdatedFlag: false
    └─ lastEventsSyncTime: null
```

### During Assignment

```
Operation: assignEventToDevices("event_123", ["device_001"])

EVENTS (Updated):
  event_123:
    ├─ ...
    └─ assignedDeviceIds: ["device_001"]  ← ADDED

REGISTERED_DEVICES (Updated):
  device_001:
    ├─ ...
    ├─ eventsUpdatedFlag: true             ← SET
    └─ lastEventsSyncTime: 2025-01-10T08:05Z ← UPDATED
```

### After Sync Completes

```
Operation: sendEventScheduleToDevice("device_001")
  ├─ Create JSON with event
  ├─ Send via BLE to 0001
  └─ On Success:

REGISTERED_DEVICES (Final):
  device_001:
    ├─ ...
    ├─ eventsUpdatedFlag: false            ← CLEARED
    └─ lastEventsSyncTime: 2025-01-10T08:05Z
```

## Time Calculation Example

```
Event Details:
  Title: "School"
  Start: 2025-01-10 09:30 AM
  End: 2025-01-10 03:30 PM
  Duration: 6 hours

Calculation:

  Start of day: 2025-01-10 00:00:00
  Event start: 2025-01-10 09:30:00

  Minutes from midnight:
  = (09:30:00 - 00:00:00) / 60
  = (9 hours 30 minutes) / 60
  = 570 minutes

  Duration:
  = (15:30:00 - 09:30:00)
  = 6 hours
  = 6 * 3600 seconds
  = 21600 seconds

JSON Output:
  {
    "start": 570,
    "duration": 21600,
    "label": "School",
    "path": "/sdcard/school.png"
  }

Device Time Display:
  09:30 + 570 minutes offset

  Verification:
  570 ÷ 60 = 9 hours 30 minutes ✓
  21600 ÷ 3600 = 6 hours ✓
```

## Error Handling Flow

```
┌──────────────────────────────┐
│ sendEventScheduleToDevice()  │
└──────────┬───────────────────┘
           │
           ▼
     ┌──────────────┐
     │ Try Block:   │
     │ BLE Write    │
     └──────┬───────┘
            │
    ┌───────┴────────┐
    │                │
    ▼ Success        ▼ Failure
┌─────────┐     ┌──────────────┐
│ Clear   │     │ Log Error    │
│ Flag    │     │ Return false │
│ Save DB │     │ Keep Flag    │
└─────────┘     │ Retry Later  │
                └──────────────┘
```

---

## Legend

```
┌────────┐      Component/Function
│ Block  │
└────────┘

┌────────┐      Database/Storage
│Database│
└────────┘

─────►   Flow/Sequence

═════►   Critical Path
```
