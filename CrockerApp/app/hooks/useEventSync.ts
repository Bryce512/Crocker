/**
 * Event Sync Hook
 * 
 * Provides easy access to event synchronization functionality across the app.
 * Manages sync status monitoring and provides methods for triggering syncs.
 */

import { useState, useEffect, useCallback } from 'react';
import eventSyncService, { DeviceSyncStatus } from '../services/eventSyncService';
import firebaseService from '../services/firebaseService';

export interface UseEventSyncReturn {
  // Sync status for all devices
  allSyncStatus: DeviceSyncStatus[];
  
  // Loading states
  isSyncing: boolean;
  isLoadingSyncStatus: boolean;
  
  // Methods
  syncDeviceEvents: (kidId: string, deviceId?: string) => Promise<boolean>;
  markAllDevicesForResync: () => Promise<void>;
  forceSyncAll: () => Promise<void>;
  getSyncStatusForDevice: (deviceId: string, kidId: string) => Promise<DeviceSyncStatus>;
  refreshSyncStatus: () => Promise<void>;
  clearSyncHistory: () => Promise<void>;
  
  // Computed properties
  devicesNeedingSync: DeviceSyncStatus[];
  lastSyncCheck: Date | null;
}

export const useEventSync = (): UseEventSyncReturn => {
  const [allSyncStatus, setAllSyncStatus] = useState<DeviceSyncStatus[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingSyncStatus, setIsLoadingSyncStatus] = useState(true);
  const [lastSyncCheck, setLastSyncCheck] = useState<Date | null>(null);

  // Load initial sync status
  useEffect(() => {
    refreshSyncStatus();
  }, []);

  // Refresh sync status every 30 seconds
  useEffect(() => {
    const interval = setInterval(refreshSyncStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  /**
   * Refresh sync status from the service
   */
  const refreshSyncStatus = useCallback(async (): Promise<void> => {
    try {
      setIsLoadingSyncStatus(true);
      const status = await eventSyncService.getAllSyncStatus();
      setAllSyncStatus(status);
      setLastSyncCheck(new Date());
    } catch (error) {
      console.error('Failed to refresh sync status:', error);
    } finally {
      setIsLoadingSyncStatus(false);
    }
  }, []);

  /**
   * Sync events for a specific device
   */
  const syncDeviceEvents = useCallback(async (kidId: string, deviceId?: string): Promise<boolean> => {
    try {
      setIsSyncing(true);
      console.log(`🔄 Syncing events for kid ${kidId}${deviceId ? ` on device ${deviceId}` : ''}`);
      
      const success = await eventSyncService.syncDeviceEvents(kidId, deviceId);
      
      if (success) {
        console.log(`✅ Successfully synced events for kid ${kidId}`);
      } else {
        console.log(`❌ Failed to sync events for kid ${kidId}`);
      }
      
      // Refresh status after sync attempt
      await refreshSyncStatus();
      
      return success;
    } catch (error) {
      console.error(`Error syncing device events for kid ${kidId}:`, error);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [refreshSyncStatus]);

  /**
   * Mark all devices for resync
   */
  const markAllDevicesForResync = useCallback(async (): Promise<void> => {
    try {
      console.log('🔄 Marking all devices for resync...');
      await eventSyncService.markAllDevicesForResync();
      await refreshSyncStatus();
      console.log('✅ All devices marked for resync');
    } catch (error) {
      console.error('Error marking devices for resync:', error);
    }
  }, [refreshSyncStatus]);

  /**
   * Force sync all devices
   */
  const forceSyncAll = useCallback(async (): Promise<void> => {
    try {
      setIsSyncing(true);
      console.log('🔄 Force syncing all devices...');
      await eventSyncService.forceSyncAll();
      await refreshSyncStatus();
      console.log('✅ Force sync completed for all devices');
    } catch (error) {
      console.error('Error force syncing all devices:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [refreshSyncStatus]);

  /**
   * Get sync status for a specific device
   */
  const getSyncStatusForDevice = useCallback(async (deviceId: string, kidId: string): Promise<DeviceSyncStatus> => {
    try {
      const status = await eventSyncService.getSyncStatusForDevice(deviceId, kidId);
      
      // Update the local cache
      setAllSyncStatus(prev => {
        const filtered = prev.filter(s => !(s.deviceId === deviceId && s.kidId === kidId));
        return [...filtered, status];
      });
      
      return status;
    } catch (error) {
      console.error('Error getting sync status for device:', error);
      throw error;
    }
  }, []);

  /**
   * Clear sync history
   */
  const clearSyncHistory = useCallback(async (): Promise<void> => {
    try {
      console.log('🗑️ Clearing sync history...');
      await eventSyncService.clearSyncHistory();
      await refreshSyncStatus();
      console.log('✅ Sync history cleared');
    } catch (error) {
      console.error('Error clearing sync history:', error);
    }
  }, [refreshSyncStatus]);

  // Computed properties
  const devicesNeedingSync = allSyncStatus.filter(status => {
    const now = new Date();
    
    // Device needs sync if:
    // 1. Never synced
    if (!status.lastSuccessfulSync) return true;
    
    // 2. Data is not current
    if (!status.isDataCurrent) return true;
    
    // 3. Has pending retries scheduled for now or past
    if (status.nextRetryAt && status.nextRetryAt <= now) return true;
    
    // 4. Last sync was more than 12 hours ago (configurable)
    const syncIntervalMs = 12 * 60 * 60 * 1000; // 12 hours
    if (now.getTime() - status.lastSuccessfulSync.getTime() > syncIntervalMs) return true;
    
    return false;
  });

  return {
    // Status
    allSyncStatus,
    isSyncing,
    isLoadingSyncStatus,
    
    // Methods
    syncDeviceEvents,
    markAllDevicesForResync,
    forceSyncAll,
    getSyncStatusForDevice,
    refreshSyncStatus,
    clearSyncHistory,
    
    // Computed
    devicesNeedingSync,
    lastSyncCheck,
  };
};