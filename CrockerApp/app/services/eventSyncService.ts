/**
 * Event Sync Service
 * 
 * Manages synchronization of 24-hour event batches with connected Bluetooth devices.
 * Handles persistent sync status tracking, retry logic, and data integrity verification.
 * 
 * Features:
 * - Generates 24-hour event batches for specific kids/devices
 * - Tracks sync status persistently across app sessions
 * - Manages retry logic for failed syncs
 * - Validates data integrity with checksums
 * - Handles automatic resync triggers when events are modified
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import firebaseService from './firebaseService';
import { useBleConnection } from './bleConnections';
import calendarService, { CalendarEvent, Kid, AlertBatch } from './calendarService';
import { AppState, AppStateStatus } from 'react-native';

// Storage keys for persistent data
const SYNC_STATUS_KEY = '@soriApp:syncStatus';
const SYNC_METADATA_KEY = '@soriApp:syncMetadata';
const RETRY_QUEUE_KEY = '@soriApp:retryQueue';

// Interfaces for sync management
export interface DeviceSyncStatus {
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

export interface SyncAttempt {
  timestamp: Date;
  success: boolean;
  batchSize: number;
  checksum: string;
  error?: string;
  responseTime?: number; // milliseconds
}

export interface EventSyncMetadata {
  lastEventModification: Date;
  eventCount: number;
  totalDevices: number;
  lastFullSyncCheck: Date;
}

export interface RetryQueueItem {
  deviceId: string;
  kidId: string;
  scheduledAt: Date;
  attempt: number;
  maxAttempts: number;
  priority: 'normal' | 'high';
}

export interface SyncConfiguration {
  syncIntervalHours: number;
  maxRetryAttempts: number;
  retryBackoffMultiplier: number;
  batchValidityHours: number;
  checksumAlgorithm: 'md5' | 'sha256';
  compressionEnabled: boolean;
  autoSyncEnabled: boolean;
}

class EventSyncService {
  private static instance: EventSyncService;
  private syncStatusCache: Map<string, DeviceSyncStatus> = new Map();
  private isInitialized = false;
  private appStateSubscription: any = null;
  private backgroundSyncInterval: NodeJS.Timeout | null = null;

  // Default configuration
  private config: SyncConfiguration = {
    syncIntervalHours: 12,
    maxRetryAttempts: 3,
    retryBackoffMultiplier: 2,
    batchValidityHours: 24,
    checksumAlgorithm: 'md5',
    compressionEnabled: true,
    autoSyncEnabled: true,
  };

  private constructor() {
    this.initializeService();
  }

  static getInstance(): EventSyncService {
    if (!EventSyncService.instance) {
      EventSyncService.instance = new EventSyncService();
    }
    return EventSyncService.instance;
  }

  /**
   * Initialize the sync service
   */
  private async initializeService(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🔄 Initializing Event Sync Service...');
      
      // Load persistent sync status
      await this.loadSyncStatusFromStorage();
      
      // Set up app state monitoring
      this.setupAppStateMonitoring();
      
      // Set up background sync checking
      this.setupBackgroundSync();
      
      // Perform initial sync check
      await this.performInitialSyncCheck();
      
      this.isInitialized = true;
      console.log('✅ Event Sync Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Event Sync Service:', error);
    }
  }

  /**
   * Generate and send 24-hour event batch to a specific device
   */
  public async syncDeviceEvents(kidId: string, deviceId?: string): Promise<boolean> {
    try {
      console.log(`🔄 Starting event sync for kid ${kidId}...`);
      
      const user = firebaseService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get kid information and determine device
      const kid = await this.getKidById(user.uid, kidId);
      if (!kid) {
        throw new Error(`Kid with ID ${kidId} not found`);
      }

      const targetDeviceId = deviceId || kid.deviceId;
      if (!targetDeviceId) {
        throw new Error(`No device associated with kid ${kidId}`);
      }

      // Get or create sync status for this device
      const syncStatus = await this.getSyncStatus(targetDeviceId, kidId);
      
      // Check if sync is needed
      if (!this.isSyncNeeded(syncStatus)) {
        console.log(`ℹ️ Device ${targetDeviceId} is already up to date`);
        return true;
      }

      // Generate 24-hour event batch
      const eventBatch = await this.generate24HourEventBatch(kidId);
      
      // Convert to JSON format for transmission
      const jsonPayload = this.formatEventBatchForTransmission(eventBatch);
      
      // Record sync attempt
      const syncAttempt: SyncAttempt = {
        timestamp: new Date(),
        success: false,
        batchSize: eventBatch.alerts.length,
        checksum: eventBatch.checksum,
      };

      const startTime = Date.now();
      
      try {
        // Send via Bluetooth
        const bleConnection = useBleConnection();
        const success = await bleConnection.sendJSONAlert(jsonPayload, targetDeviceId);
        
        syncAttempt.responseTime = Date.now() - startTime;
        syncAttempt.success = success;

        if (success) {
          // Verify delivery if possible
          const verified = await bleConnection.verifyAlertBatchDelivery(
            eventBatch.checksum, 
            targetDeviceId
          );

          if (verified) {
            console.log(`✅ Event batch successfully synced to device ${targetDeviceId}`);
            await this.markSyncSuccessful(targetDeviceId, kidId, eventBatch, syncAttempt);
            return true;
          } else {
            console.log(`⚠️ Event batch sent but verification failed for device ${targetDeviceId}`);
            syncAttempt.error = 'Verification failed';
          }
        } else {
          syncAttempt.error = 'Bluetooth transmission failed';
        }
      } catch (transmissionError) {
        syncAttempt.error = transmissionError instanceof Error ? transmissionError.message : String(transmissionError);
        syncAttempt.responseTime = Date.now() - startTime;
      }

      // Record failed attempt
      await this.markSyncFailed(targetDeviceId, kidId, syncAttempt);
      
      // Schedule retry if within limits
      if (syncStatus.pendingRetries < this.config.maxRetryAttempts) {
        await this.scheduleRetry(targetDeviceId, kidId);
      }

      return false;
    } catch (error) {
      console.error(`❌ Event sync failed for kid ${kidId}:`, error);
      return false;
    }
  }

  /**
   * Generate 24-hour event batch for a specific kid
   */
  private async generate24HourEventBatch(kidId: string): Promise<AlertBatch> {
    const user = firebaseService.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Get events for the next 24 hours
    const events = await this.getEventsForDateRange(user.uid, now, tomorrow);
    const kid = await this.getKidById(user.uid, kidId);

    if (!kid) {
      throw new Error('Kid not found');
    }

    // Generate alerts for assigned events
    const alerts = this.generateAlertsFromEvents(events, kidId, now, tomorrow);

    const batch: AlertBatch = {
      kidId,
      generatedAt: now,
      validUntil: tomorrow,
      alerts,
      checksum: this.generateBatchChecksum(alerts),
    };

    console.log(`📊 Generated batch for kid ${kidId}: ${alerts.length} alerts`);
    return batch;
  }

  /**
   * Generate alerts from events for a specific kid within time range
   */
  private generateAlertsFromEvents(
    events: CalendarEvent[], 
    kidId: string, 
    startTime: Date, 
    endTime: Date
  ): any[] {
    const alerts: any[] = [];

    events
      .filter(event => event.isActive && event.assignedKidId === kidId)
      .forEach(event => {
        event.alertIntervals.forEach(interval => {
          const alertTime = new Date(event.startTime.getTime() - interval * 60 * 1000);

          if (alertTime >= startTime && alertTime <= endTime) {
            alerts.push({
              eventId: event.id,
              eventTitle: event.title,
              alertTime,
              minutesUntilEvent: interval,
              alertType: interval <= 5 ? 'final_warning' : 'transition_warning',
              vibrationPattern: this.getVibrationPattern(interval),
            });
          }
        });
      });

    // Sort alerts by time
    return alerts.sort((a, b) => a.alertTime.getTime() - b.alertTime.getTime());
  }

  /**
   * Format event batch for Bluetooth transmission
   */
  private formatEventBatchForTransmission(batch: AlertBatch): string {
    const payload = {
      kid_id: batch.kidId,
      generated_at: Math.floor(batch.generatedAt.getTime() / 1000),
      valid_until: Math.floor(batch.validUntil.getTime() / 1000),
      checksum: batch.checksum,
      alert_count: batch.alerts.length,
      alerts: batch.alerts.map(alert => ({
        event_id: alert.eventId,
        event_title: alert.eventTitle.substring(0, 50), // Limit for ESP32
        alert_time: Math.floor(alert.alertTime.getTime() / 1000),
        minutes_until: alert.minutesUntilEvent,
        type: alert.alertType === 'final_warning' ? 1 : 0,
        vibration: alert.vibrationPattern || [200, 100, 200],
      })),
    };

    return JSON.stringify(payload);
  }

  /**
   * Check if device needs sync based on current status
   */
  private isSyncNeeded(syncStatus: DeviceSyncStatus): boolean {
    const now = new Date();

    // If never synced, sync is needed
    if (!syncStatus.lastSuccessfulSync) {
      console.log('📝 Sync needed: No previous successful sync');
      return true;
    }

    // If data is marked as not current, sync is needed
    if (!syncStatus.isDataCurrent) {
      console.log('📝 Sync needed: Data marked as not current');
      return true;
    }

    // If last sync was more than configured interval ago
    const syncIntervalMs = this.config.syncIntervalHours * 60 * 60 * 1000;
    if (now.getTime() - syncStatus.lastSuccessfulSync.getTime() > syncIntervalMs) {
      console.log('📝 Sync needed: Sync interval exceeded');
      return true;
    }

    // If there's a pending retry scheduled for now or past
    if (syncStatus.nextRetryAt && syncStatus.nextRetryAt <= now) {
      console.log('📝 Sync needed: Retry scheduled');
      return true;
    }

    return false;
  }

  /**
   * Mark sync as successful and update status
   */
  private async markSyncSuccessful(
    deviceId: string, 
    kidId: string, 
    batch: AlertBatch, 
    attempt: SyncAttempt
  ): Promise<void> {
    const syncStatus = await this.getSyncStatus(deviceId, kidId);
    
    syncStatus.lastSuccessfulSync = new Date();
    syncStatus.lastSyncAttempt = new Date();
    syncStatus.syncedBatchChecksum = batch.checksum;
    syncStatus.syncedEventCount = batch.alerts.length;
    syncStatus.isDataCurrent = true;
    syncStatus.pendingRetries = 0;
    syncStatus.nextRetryAt = null;
    syncStatus.failureReason = null;
    syncStatus.syncHistory.push(attempt);

    // Keep only last 10 sync attempts in history
    if (syncStatus.syncHistory.length > 10) {
      syncStatus.syncHistory = syncStatus.syncHistory.slice(-10);
    }

    await this.saveSyncStatus(deviceId, kidId, syncStatus);
    
    // Log successful sync to Firebase
    const user = firebaseService.getCurrentUser();
    if (user) {
      const syncRecord = {
        deviceId,
        kidId,
        batchSize: batch.alerts.length,
        checksum: batch.checksum,
        syncedAt: new Date().toISOString(),
        responseTime: attempt.responseTime,
      };
      
      // Store in Firebase for analytics
      await firebaseService.writeData(
        user.uid, 
        'syncHistory', 
        JSON.stringify(syncRecord)
      );
    }
  }

  /**
   * Mark sync as failed and handle retry logic
   */
  private async markSyncFailed(
    deviceId: string, 
    kidId: string, 
    attempt: SyncAttempt
  ): Promise<void> {
    const syncStatus = await this.getSyncStatus(deviceId, kidId);
    
    syncStatus.lastSyncAttempt = new Date();
    syncStatus.pendingRetries += 1;
    syncStatus.failureReason = attempt.error || 'Unknown error';
    syncStatus.syncHistory.push(attempt);

    // Keep only last 10 sync attempts in history
    if (syncStatus.syncHistory.length > 10) {
      syncStatus.syncHistory = syncStatus.syncHistory.slice(-10);
    }

    await this.saveSyncStatus(deviceId, kidId, syncStatus);
  }

  /**
   * Schedule retry for failed sync
   */
  private async scheduleRetry(deviceId: string, kidId: string): Promise<void> {
    const syncStatus = await this.getSyncStatus(deviceId, kidId);
    
    // Calculate backoff delay
    const baseDelay = 5 * 60 * 1000; // 5 minutes base
    const backoffDelay = baseDelay * Math.pow(
      this.config.retryBackoffMultiplier, 
      syncStatus.pendingRetries - 1
    );
    
    syncStatus.nextRetryAt = new Date(Date.now() + backoffDelay);
    await this.saveSyncStatus(deviceId, kidId, syncStatus);

    // Add to retry queue
    const retryItem: RetryQueueItem = {
      deviceId,
      kidId,
      scheduledAt: syncStatus.nextRetryAt,
      attempt: syncStatus.pendingRetries,
      maxAttempts: this.config.maxRetryAttempts,
      priority: 'normal',
    };

    await this.addToRetryQueue(retryItem);
    
    console.log(`⏰ Retry scheduled for device ${deviceId} at ${syncStatus.nextRetryAt.toISOString()}`);
  }

  /**
   * Mark all devices as needing resync when events are modified
   */
  public async markAllDevicesForResync(): Promise<void> {
    try {
      console.log('🔄 Marking all devices for resync due to event changes...');
      
      const user = firebaseService.getCurrentUser();
      if (!user) return;

      // Get all kids with devices
      const kids = await firebaseService.getKids();
      const devicesWithKids = kids.filter(kid => kid.deviceId);

      // Mark each device as needing sync
      for (const kid of devicesWithKids) {
        if (kid.deviceId) {
          const syncStatus = await this.getSyncStatus(kid.deviceId, kid.id);
          syncStatus.isDataCurrent = false;
          await this.saveSyncStatus(kid.deviceId, kid.id, syncStatus);
        }
      }

      // Update metadata
      await this.updateSyncMetadata();
      
      console.log(`✅ Marked ${devicesWithKids.length} devices for resync`);
    } catch (error) {
      console.error('❌ Failed to mark devices for resync:', error);
    }
  }

  /**
   * Get sync status for a device/kid combination
   */
  private async getSyncStatus(deviceId: string, kidId: string): Promise<DeviceSyncStatus> {
    const key = `${deviceId}_${kidId}`;
    
    // Check cache first
    if (this.syncStatusCache.has(key)) {
      return this.syncStatusCache.get(key)!;
    }

    // Load from storage
    try {
      const stored = await AsyncStorage.getItem(`${SYNC_STATUS_KEY}_${key}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        
        // Convert date strings back to Date objects
        const status: DeviceSyncStatus = {
          ...parsed,
          lastSyncAttempt: parsed.lastSyncAttempt ? new Date(parsed.lastSyncAttempt) : null,
          lastSuccessfulSync: parsed.lastSuccessfulSync ? new Date(parsed.lastSuccessfulSync) : null,
          nextRetryAt: parsed.nextRetryAt ? new Date(parsed.nextRetryAt) : null,
          syncHistory: (parsed.syncHistory || []).map((attempt: any) => ({
            ...attempt,
            timestamp: new Date(attempt.timestamp),
          })),
        };

        this.syncStatusCache.set(key, status);
        return status;
      }
    } catch (error) {
      console.error('Failed to load sync status from storage:', error);
    }

    // Return default status if not found
    const defaultStatus: DeviceSyncStatus = {
      deviceId,
      kidId,
      lastSyncAttempt: null,
      lastSuccessfulSync: null,
      syncedBatchChecksum: null,
      syncedEventCount: 0,
      isDataCurrent: false,
      pendingRetries: 0,
      maxRetries: this.config.maxRetryAttempts,
      nextRetryAt: null,
      failureReason: null,
      syncHistory: [],
    };

    this.syncStatusCache.set(key, defaultStatus);
    return defaultStatus;
  }

  /**
   * Save sync status to persistent storage
   */
  private async saveSyncStatus(
    deviceId: string, 
    kidId: string, 
    status: DeviceSyncStatus
  ): Promise<void> {
    const key = `${deviceId}_${kidId}`;
    
    try {
      // Update cache
      this.syncStatusCache.set(key, status);
      
      // Save to AsyncStorage
      await AsyncStorage.setItem(
        `${SYNC_STATUS_KEY}_${key}`, 
        JSON.stringify(status)
      );
    } catch (error) {
      console.error('Failed to save sync status:', error);
    }
  }

  /**
   * Load all sync status from storage
   */
  private async loadSyncStatusFromStorage(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const syncKeys = keys.filter(key => key.startsWith(SYNC_STATUS_KEY));
      
      console.log(`📂 Loading ${syncKeys.length} sync status records from storage`);
      
      for (const key of syncKeys) {
        try {
          const stored = await AsyncStorage.getItem(key);
          if (stored) {
            const parsed = JSON.parse(stored);
            const deviceKidKey = key.replace(`${SYNC_STATUS_KEY}_`, '');
            
            // Convert date strings back to Date objects
            const status: DeviceSyncStatus = {
              ...parsed,
              lastSyncAttempt: parsed.lastSyncAttempt ? new Date(parsed.lastSyncAttempt) : null,
              lastSuccessfulSync: parsed.lastSuccessfulSync ? new Date(parsed.lastSuccessfulSync) : null,
              nextRetryAt: parsed.nextRetryAt ? new Date(parsed.nextRetryAt) : null,
              syncHistory: (parsed.syncHistory || []).map((attempt: any) => ({
                ...attempt,
                timestamp: new Date(attempt.timestamp),
              })),
            };

            this.syncStatusCache.set(deviceKidKey, status);
          }
        } catch (parseError) {
          console.error(`Failed to parse sync status for key ${key}:`, parseError);
        }
      }
    } catch (error) {
      console.error('Failed to load sync status from storage:', error);
    }
  }

  /**
   * Setup app state monitoring for background sync checks
   */
  private setupAppStateMonitoring(): void {
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('📱 App became active, checking for pending syncs...');
        this.checkPendingSyncs();
      }
    });
  }

  /**
   * Setup background sync checking
   */
  private setupBackgroundSync(): void {
    // Check for pending syncs every 5 minutes when app is active
    this.backgroundSyncInterval = setInterval(() => {
      if (AppState.currentState === 'active') {
        this.checkPendingSyncs();
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Check for pending syncs and retries
   */
  private async checkPendingSyncs(): Promise<void> {
    try {
      const now = new Date();
      
      // Check retry queue
      const retryQueue = await this.getRetryQueue();
      const dueRetries = retryQueue.filter(item => item.scheduledAt <= now);

      console.log(`🔍 Found ${dueRetries.length} due retries out of ${retryQueue.length} queued`);

      for (const retry of dueRetries) {
        console.log(`🔄 Processing retry for device ${retry.deviceId}, kid ${retry.kidId}`);
        await this.syncDeviceEvents(retry.kidId, retry.deviceId);
        await this.removeFromRetryQueue(retry);
      }

      // Check for devices that need periodic sync
      if (this.config.autoSyncEnabled) {
        await this.checkPeriodicSyncNeeds();
      }
    } catch (error) {
      console.error('❌ Error checking pending syncs:', error);
    }
  }

  /**
   * Check for devices that need periodic sync
   */
  private async checkPeriodicSyncNeeds(): Promise<void> {
    try {
      const user = firebaseService.getCurrentUser();
      if (!user) return;

      const kids = await firebaseService.getKids();
      const devicesWithKids = kids.filter(kid => kid.deviceId);

      for (const kid of devicesWithKids) {
        if (kid.deviceId) {
          const syncStatus = await this.getSyncStatus(kid.deviceId, kid.id);
          if (this.isSyncNeeded(syncStatus)) {
            console.log(`📅 Periodic sync needed for device ${kid.deviceId}, kid ${kid.id}`);
            await this.syncDeviceEvents(kid.id, kid.deviceId);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error checking periodic sync needs:', error);
    }
  }

  /**
   * Perform initial sync check when service starts
   */
  private async performInitialSyncCheck(): Promise<void> {
    console.log('🔍 Performing initial sync check...');
    await this.checkPendingSyncs();
  }

  /**
   * Helper methods for retry queue management
   */
  private async getRetryQueue(): Promise<RetryQueueItem[]> {
    try {
      const stored = await AsyncStorage.getItem(RETRY_QUEUE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((item: any) => ({
          ...item,
          scheduledAt: new Date(item.scheduledAt),
        }));
      }
    } catch (error) {
      console.error('Failed to load retry queue:', error);
    }
    return [];
  }

  private async addToRetryQueue(item: RetryQueueItem): Promise<void> {
    try {
      const queue = await this.getRetryQueue();
      queue.push(item);
      await AsyncStorage.setItem(RETRY_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Failed to add to retry queue:', error);
    }
  }

  private async removeFromRetryQueue(item: RetryQueueItem): Promise<void> {
    try {
      const queue = await this.getRetryQueue();
      const filtered = queue.filter(
        queueItem => !(queueItem.deviceId === item.deviceId && queueItem.kidId === item.kidId)
      );
      await AsyncStorage.setItem(RETRY_QUEUE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to remove from retry queue:', error);
    }
  }

  /**
   * Utility methods
   */
  private generateBatchChecksum(alerts: any[]): string {
    // Simple checksum for data integrity
    const data = alerts
      .map(alert => `${alert.eventId}${alert.alertTime.getTime()}`)
      .join('');
    return Buffer.from(data).toString('base64').substring(0, 8);
  }

  private getVibrationPattern(minutesUntil: number): number[] {
    return minutesUntil <= 5 ? [300, 200, 300] : [200, 100, 200];
  }

  private async updateSyncMetadata(): Promise<void> {
    const metadata: EventSyncMetadata = {
      lastEventModification: new Date(),
      eventCount: 0, // Will be updated with actual count
      totalDevices: 0, // Will be updated with actual count
      lastFullSyncCheck: new Date(),
    };

    try {
      await AsyncStorage.setItem(SYNC_METADATA_KEY, JSON.stringify(metadata));
    } catch (error) {
      console.error('Failed to update sync metadata:', error);
    }
  }

  /**
   * Helper methods for getting data (to be implemented based on existing patterns)
   */
  private async getEventsForDateRange(userId: string, start: Date, end: Date): Promise<CalendarEvent[]> {
    // Implementation using firebaseService to get events
    const allEvents = await firebaseService.getEvents();
    return allEvents.filter(event => 
      event.startTime >= start && event.startTime <= end
    );
  }

  private async getKidById(userId: string, kidId: string): Promise<Kid | null> {
    const kids = await firebaseService.getKids();
    return kids.find(kid => kid.id === kidId) || null;
  }

  /**
   * Public methods for external use
   */
  public async getAllSyncStatus(): Promise<DeviceSyncStatus[]> {
    return Array.from(this.syncStatusCache.values());
  }

  public async getSyncStatusForDevice(deviceId: string, kidId: string): Promise<DeviceSyncStatus> {
    return this.getSyncStatus(deviceId, kidId);
  }

  public async forceSyncAll(): Promise<void> {
    const user = firebaseService.getCurrentUser();
    if (!user) return;

    const kids = await firebaseService.getKids();
    const devicesWithKids = kids.filter(kid => kid.deviceId);

    console.log(`🔄 Force syncing ${devicesWithKids.length} devices...`);

    for (const kid of devicesWithKids) {
      if (kid.deviceId) {
        await this.syncDeviceEvents(kid.id, kid.deviceId);
      }
    }
  }

  public async clearSyncHistory(): Promise<void> {
    try {
      this.syncStatusCache.clear();
      
      const keys = await AsyncStorage.getAllKeys();
      const syncKeys = keys.filter(key => 
        key.startsWith(SYNC_STATUS_KEY) || 
        key.startsWith(SYNC_METADATA_KEY) || 
        key.startsWith(RETRY_QUEUE_KEY)
      );
      
      await AsyncStorage.multiRemove(syncKeys);
      console.log('🗑️ Sync history cleared');
    } catch (error) {
      console.error('Failed to clear sync history:', error);
    }
  }

  /**
   * Cleanup method
   */
  public destroy(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription?.remove();
    }
    
    if (this.backgroundSyncInterval) {
      clearInterval(this.backgroundSyncInterval);
    }
    
    this.syncStatusCache.clear();
    this.isInitialized = false;
    console.log('🧹 Event Sync Service destroyed');
  }
}

export const eventSyncService = EventSyncService.getInstance();
export default eventSyncService;