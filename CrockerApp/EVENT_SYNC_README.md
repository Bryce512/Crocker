# Event Synchronization System

The Sori app now includes a comprehensive event synchronization system that automatically manages sending 24-hour event batches to connected Bluetooth devices (ESP32 devices). This system ensures that transition alerts are properly delivered to help kids with autism manage their daily routines.

## Features

- **24-Hour Event Batches**: Automatically generates and sends the next 24 hours of events to connected devices
- **Persistent Sync Status**: Tracks sync status across app sessions using AsyncStorage
- **Automatic Retry Logic**: Failed syncs are automatically retried with exponential backoff
- **Data Integrity**: Uses checksums to verify successful data transmission
- **Background Processing**: Monitors for changes and triggers syncs when needed
- **Device Management**: Tracks sync status for multiple devices and kids

## Architecture

### Core Services

1. **EventSyncService** (`app/services/eventSyncService.ts`)
   - Main service managing all sync operations
   - Handles device sync status tracking
   - Manages retry logic and background processing
   - Integrates with Firebase and Bluetooth services

2. **CalendarService** (updated)
   - Now delegates sync operations to EventSyncService
   - Triggers resync when events are modified
   - Maintains backward compatibility

3. **BleConnections** (enhanced)
   - Added JSON alert transmission functionality
   - Supports chunked data transfer for large payloads
   - Includes verification methods for data integrity

### React Hooks & Context

1. **useEventSync** (`app/hooks/useEventSync.ts`)
   - React hook providing easy access to sync functionality
   - Manages sync status state and loading states
   - Provides methods for triggering syncs and managing devices

2. **BluetoothContext** (updated)
   - Enhanced to include event sync functionality
   - Provides sync status and methods throughout the app
   - Integrates with device management

## Usage Examples

### Basic Event Sync

```typescript
import { useEventSync } from '../hooks/useEventSync';

const MyComponent = () => {
  const { syncDeviceEvents, allSyncStatus, isSyncing } = useEventSync();

  const handleSyncKid = async (kidId: string) => {
    const success = await syncDeviceEvents(kidId);
    if (success) {
      console.log('Events synced successfully!');
    } else {
      console.log('Sync failed');
    }
  };

  return (
    <View>
      {allSyncStatus.map(status => (
        <Text key={status.deviceId}>
          Device {status.deviceId}: {status.isDataCurrent ? 'Up to date' : 'Needs sync'}
        </Text>
      ))}
    </View>
  );
};
```

### Using the Bluetooth Context

```typescript
import { useBluetooth } from '../contexts/BluetoothContext';

const SyncStatusScreen = () => {
  const { 
    syncStatus, 
    devicesNeedingSync, 
    forceSyncAll,
    markAllDevicesForResync 
  } = useBluetooth();

  return (
    <View>
      <Text>Devices needing sync: {devicesNeedingSync.length}</Text>
      <Button 
        title="Sync All Devices" 
        onPress={forceSyncAll}
        disabled={devicesNeedingSync.length === 0}
      />
    </View>
  );
};
```

### Displaying Sync Status

```typescript
import DeviceSyncStatusDisplay from '../components/DeviceSyncStatusDisplay';

const SyncManagementScreen = () => {
  return (
    <View>
      <DeviceSyncStatusDisplay 
        showDetails={true}
        onSyncDevice={(deviceId, kidId) => {
          console.log(`Sync completed for ${deviceId}`);
        }}
      />
    </View>
  );
};
```

## Data Format

### Event Batch JSON Structure

The system sends event data to ESP32 devices in the following JSON format:

```json
{
  "kid_id": "kid_12345",
  "generated_at": 1704067200,
  "valid_until": 1704153600,
  "checksum": "abc123xy",
  "alert_count": 5,
  "alerts": [
    {
      "event_id": "event_67890",
      "event_title": "Math Class",
      "alert_time": 1704070800,
      "minutes_until": 15,
      "type": 0,
      "vibration": [200, 100, 200]
    }
  ]
}
```

### Sync Status Structure

Each device maintains a comprehensive sync status:

```typescript
interface DeviceSyncStatus {
  deviceId: string;
  kidId: string;
  lastSyncAttempt: Date | null;
  lastSuccessfulSync: Date | null;
  syncedBatchChecksum: string | null;
  syncedEventCount: number;
  isDataCurrent: boolean;
  pendingRetries: number;
  maxRetries: number;
  nextRetryAt: Date | null;
  failureReason: string | null;
  syncHistory: SyncAttempt[];
}
```

## Configuration

The sync service uses the following default configuration:

```typescript
{
  syncIntervalHours: 12,        // Sync every 12 hours
  maxRetryAttempts: 3,          // Retry up to 3 times
  retryBackoffMultiplier: 2,    // Exponential backoff
  batchValidityHours: 24,       // 24-hour event window
  checksumAlgorithm: 'md5',     // Data integrity verification
  compressionEnabled: true,     // Compress large payloads
  autoSyncEnabled: true,        // Automatic background sync
}
```

## Bluetooth Protocol

### JSON Transmission Protocol

Large JSON payloads are sent in chunks to accommodate ESP32 memory limitations:

1. **Header**: `JSON_HEADER:{"type":"ALERT_BATCH","totalChunks":3,"payloadSize":1024}`
2. **Chunks**: `JSON_CHUNK:0:eyJraWRfaWQiOiJ...` (base64 encoded)
3. **Completion**: `JSON_COMPLETE`

### Verification

After transmission, the ESP32 can verify the data:

```
Command: VERIFY_BATCH:abc123xy
Response: BATCH_OK or BATCH_ERROR
```

## Automatic Sync Triggers

The system automatically triggers syncs in the following scenarios:

1. **Event Changes**: When events are added, modified, or deleted
2. **Scheduled Intervals**: Every 12 hours (configurable)
3. **App Activation**: When the app becomes active from background
4. **Device Connection**: When a device reconnects after being offline
5. **Manual Triggers**: When users explicitly request sync

## Error Handling & Retry Logic

- **Exponential Backoff**: Retries with increasing delays (5min, 10min, 20min)
- **Max Retry Limits**: Prevents infinite retry loops
- **Failure Tracking**: Records and displays failure reasons
- **Recovery**: Automatically resumes syncs when conditions improve

## Storage & Persistence

- **AsyncStorage**: Sync status persists across app sessions
- **Firebase Integration**: Sync history logged to user's Firebase account
- **Cache Management**: Local sync status cache for performance
- **Cleanup**: Automatic cleanup of old sync history records

## Testing & Debugging

Use the provided `EventSyncDemoScreen` to test and monitor sync functionality:

```typescript
// Add to your navigation
import EventSyncDemoScreen from '../screens/EventSyncDemo';

// In your navigator:
<Stack.Screen 
  name="EventSyncDemo" 
  component={EventSyncDemoScreen}
  options={{ title: 'Event Sync Management' }}
/>
```

## Integration Notes

1. **Firebase Rules**: Ensure your Firebase security rules allow writing to sync history
2. **Bluetooth Permissions**: The system requires Bluetooth permissions for transmission
3. **Background Processing**: Uses AppState monitoring for background sync checks
4. **Memory Management**: Chunked transmission prevents ESP32 memory issues
5. **Data Validation**: All synced data includes checksums for integrity verification

## Migration from Legacy System

If upgrading from the previous sync implementation:

1. The old `needsResync` flag on kids is now handled by EventSyncService
2. Previous sync methods in CalendarService now delegate to EventSyncService
3. All sync status is now persistent and more comprehensive
4. The new system is backward compatible with existing Bluetooth implementations

## Future Enhancements

- Compression of JSON payloads for large event batches
- Delta sync (only send changed events)
- Device-specific sync preferences
- Sync analytics and reporting
- Offline sync queue for when devices are disconnected