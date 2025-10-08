/**
 * Event Sync Demo Screen
 * 
 * Demonstrates the new event synchronization functionality.
 * Shows sync status, allows testing sync operations, and displays sync history.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Switch,
} from 'react-native';
import { useBluetooth } from '../contexts/BluetoothContext';
import { useEventSync } from '../hooks/useEventSync';
import DeviceSyncStatusDisplay from '../components/DeviceSyncStatusDisplay';
import firebaseService from '../services/firebaseService';

export const EventSyncDemoScreen: React.FC = () => {
  const { 
    connectionState, 
    registeredDevices, 
    loadRegisteredDevices,
  } = useBluetooth();
  
  const {
    allSyncStatus,
    devicesNeedingSync,
    isSyncing,
    syncDeviceEvents,
    markAllDevicesForResync,
    forceSyncAll,
    refreshSyncStatus,
    clearSyncHistory,
    lastSyncCheck,
  } = useEventSync();

  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [kids, setKids] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await loadRegisteredDevices();
      await loadKids();
      await refreshSyncStatus();
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadKids = async () => {
    try {
      const kidsData = await firebaseService.getKids();
      setKids(kidsData);
    } catch (error) {
      console.error('Error loading kids:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTestSync = async () => {
    if (kids.length === 0) {
      Alert.alert('No Kids', 'Please add kids first to test syncing');
      return;
    }

    const kidOptions = kids.map(kid => ({
      text: kid.name,
      onPress: () => testSyncForKid(kid),
    }));
    
    kidOptions.push({ 
      text: 'Cancel', 
      onPress: async () => {}, // Cancel doesn't need an action
    });

    Alert.alert(
      'Test Sync',
      'Select a kid to sync their events to their device',
      kidOptions
    );
  };

  const testSyncForKid = async (kid: any) => {
    if (!kid.deviceId) {
      Alert.alert('No Device', `${kid.name} doesn't have a device assigned`);
      return;
    }

    try {
      const success = await syncDeviceEvents(kid.id, kid.deviceId);
      
      if (success) {
        Alert.alert(
          'Sync Successful',
          `Events for ${kid.name} have been synced to device ${kid.deviceId.substring(0, 8)}...`
        );
      } else {
        Alert.alert(
          'Sync Failed',
          `Failed to sync events for ${kid.name}. Check device connection.`
        );
      }
    } catch (error) {
      Alert.alert(
        'Sync Error',
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  };

  const handleClearHistory = async () => {
    Alert.alert(
      'Clear Sync History',
      'This will clear all sync history and status. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearSyncHistory();
              Alert.alert('Success', 'Sync history cleared');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear sync history');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#f5f5f5' }}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header */}
      <View style={{ 
        backgroundColor: 'white', 
        padding: 20, 
        borderBottomWidth: 1, 
        borderBottomColor: '#eee' 
      }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>
          Event Sync Management
        </Text>
        <Text style={{ fontSize: 16, color: '#666' }}>
          Manage 24-hour event synchronization with connected devices
        </Text>
      </View>

      {/* Connection Status */}
      <View style={{ 
        backgroundColor: 'white', 
        margin: 16, 
        padding: 16, 
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      }}>
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}>
          Connection Status
        </Text>
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ color: '#666' }}>Bluetooth:</Text>
          <Text style={{ 
            color: connectionState.isConnected ? '#4caf50' : '#ff6b6b',
            fontWeight: '500',
          }}>
            {connectionState.isConnected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>

        {connectionState.isConnected && connectionState.deviceId && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ color: '#666' }}>Device:</Text>
            <Text style={{ color: '#333' }}>
              {connectionState.deviceId.substring(0, 12)}...
            </Text>
          </View>
        )}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ color: '#666' }}>Registered Devices:</Text>
          <Text style={{ color: '#333', fontWeight: '500' }}>
            {registeredDevices.length}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: '#666' }}>Kids with Devices:</Text>
          <Text style={{ color: '#333', fontWeight: '500' }}>
            {kids.filter(kid => kid.deviceId).length}
          </Text>
        </View>
      </View>

      {/* Auto Sync Settings */}
      <View style={{ 
        backgroundColor: 'white', 
        marginHorizontal: 16, 
        marginBottom: 16,
        padding: 16, 
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      }}>
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}>
          Sync Settings
        </Text>
        
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 12,
        }}>
          <View>
            <Text style={{ fontSize: 16, color: '#333' }}>Auto Sync</Text>
            <Text style={{ fontSize: 12, color: '#666' }}>
              Automatically sync when events change
            </Text>
          </View>
          <Switch
            value={autoSyncEnabled}
            onValueChange={setAutoSyncEnabled}
          />
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: '#666' }}>Last Check:</Text>
          <Text style={{ color: '#333' }}>
            {lastSyncCheck ? lastSyncCheck.toLocaleTimeString() : 'Never'}
          </Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={{ 
        backgroundColor: 'white', 
        marginHorizontal: 16, 
        marginBottom: 16,
        padding: 16, 
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      }}>
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}>
          Quick Actions
        </Text>
        
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <TouchableOpacity
            onPress={handleTestSync}
            style={{
              flex: 1,
              backgroundColor: '#2196f3',
              padding: 12,
              borderRadius: 6,
              alignItems: 'center',
            }}
            disabled={isSyncing || kids.length === 0}
          >
            <Text style={{ color: 'white', fontWeight: '600' }}>
              Test Sync
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => markAllDevicesForResync()}
            style={{
              flex: 1,
              backgroundColor: '#ff9800',
              padding: 12,
              borderRadius: 6,
              alignItems: 'center',
            }}
            disabled={isSyncing}
          >
            <Text style={{ color: 'white', fontWeight: '600' }}>
              Mark All
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => forceSyncAll()}
            style={{
              flex: 1,
              backgroundColor: '#4caf50',
              padding: 12,
              borderRadius: 6,
              alignItems: 'center',
            }}
            disabled={isSyncing || allSyncStatus.length === 0}
          >
            <Text style={{ color: 'white', fontWeight: '600' }}>
              Force Sync All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleClearHistory}
            style={{
              flex: 1,
              backgroundColor: '#f44336',
              padding: 12,
              borderRadius: 6,
              alignItems: 'center',
            }}
            disabled={isSyncing}
          >
            <Text style={{ color: 'white', fontWeight: '600' }}>
              Clear History
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sync Status Display */}
      <View style={{ 
        backgroundColor: 'white', 
        marginHorizontal: 16, 
        marginBottom: 32,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      }}>
        <DeviceSyncStatusDisplay
          showDetails={true}
          onSyncDevice={(deviceId, kidId) => {
            console.log(`Sync completed for device ${deviceId}, kid ${kidId}`);
          }}
        />
      </View>

      {/* Information Panel */}
      <View style={{ 
        backgroundColor: '#e3f2fd', 
        marginHorizontal: 16, 
        marginBottom: 32,
        padding: 16, 
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#2196f3',
      }}>
        <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8, color: '#1976d2' }}>
          How Event Sync Works
        </Text>
        <Text style={{ fontSize: 14, color: '#333', lineHeight: 20 }}>
          • Events are automatically synced to devices every 12 hours{'\n'}
          • When events are added/modified, all devices are marked for resync{'\n'}
          • Each device stores up to 24 hours of upcoming events{'\n'}
          • Failed syncs are automatically retried with exponential backoff{'\n'}
          • Sync status persists across app restarts using AsyncStorage
        </Text>
      </View>
    </ScrollView>
  );
};

export default EventSyncDemoScreen;