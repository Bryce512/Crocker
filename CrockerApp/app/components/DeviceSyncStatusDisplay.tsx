/**
 * Device Sync Status Component
 *
 * Displays sync status for all registered devices and provides controls for syncing.
 * Shows which devices need sync and allows manual sync triggers.
 */

import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useBluetooth } from "../contexts/BluetoothContext";
import { DeviceSyncStatus } from "../services/eventSyncService";

interface DeviceSyncStatusDisplayProps {
  showDetails?: boolean;
  onSyncDevice?: (deviceId: string, kidId: string) => void;
}

export const DeviceSyncStatusDisplay: React.FC<
  DeviceSyncStatusDisplayProps
> = ({ showDetails = true, onSyncDevice }) => {
  const {
    syncStatus,
    devicesNeedingSync,
    isSyncing,
    syncDeviceEvents,
    markAllDevicesForResync,
    forceSyncAll,
    refreshSyncStatus,
  } = useBluetooth();

  const handleSyncDevice = async (deviceStatus: DeviceSyncStatus) => {
    try {
      const success = await syncDeviceEvents(
        deviceStatus.kidId,
        deviceStatus.deviceId
      );

      if (onSyncDevice) {
        onSyncDevice(deviceStatus.deviceId, deviceStatus.kidId);
      }
    } catch (error) {
      console.log(
        "Sync Error",
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    }
  };

  const handleMarkAllForResync = async () => {
    try {
      await markAllDevicesForResync();
    } catch (error) {
      console.log(
        "Error",
        error instanceof Error
          ? error.message
          : "Failed to mark devices for resync"
      );
    }
  };

  const handleForceSyncAll = async () => {
    Alert.alert(
      "Force Sync All Devices",
      "This will sync events to all registered devices. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sync All",
          style: "default",
          onPress: async () => {
            try {
              await forceSyncAll();
            } catch (error) {
              console.log(
                "Error",
                error instanceof Error
                  ? error.message
                  : "Failed to sync all devices"
              );
            }
          },
        },
      ]
    );
  };

  const formatLastSync = (date: Date | null): string => {
    if (!date) return "Never";

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getSyncStatusColor = (status: DeviceSyncStatus): string => {
    if (!status.lastSuccessfulSync) return "#ff6b6b"; // Red for never synced
    if (!status.isDataCurrent) return "#ffa726"; // Orange for stale data
    if (status.pendingRetries > 0) return "#ffa726"; // Orange for pending retries
    return "#4caf50"; // Green for up to date
  };

  const getSyncStatusText = (status: DeviceSyncStatus): string => {
    if (!status.lastSuccessfulSync) return "Never Synced";
    if (!status.isDataCurrent) return "Data Stale";
    if (status.pendingRetries > 0) return `Retrying (${status.pendingRetries})`;
    return "Up to Date";
  };

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 16 }}>
        Device Sync Status
      </Text>

      {/* Summary Stats */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-around",
          marginBottom: 20,
          padding: 12,
          backgroundColor: "#f5f5f5",
          borderRadius: 8,
        }}
      >
        <View style={{ alignItems: "center" }}>
          <Text style={{ fontSize: 16, fontWeight: "bold", color: "#333" }}>
            {syncStatus.length}
          </Text>
          <Text style={{ fontSize: 12, color: "#666" }}>Total Devices</Text>
        </View>
        <View style={{ alignItems: "center" }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "bold",
              color: devicesNeedingSync.length > 0 ? "#ff6b6b" : "#4caf50",
            }}
          >
            {devicesNeedingSync.length}
          </Text>
          <Text style={{ fontSize: 12, color: "#666" }}>Need Sync</Text>
        </View>
        <View style={{ alignItems: "center" }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "bold",
              color: isSyncing ? "#2196f3" : "#333",
            }}
          >
            {isSyncing ? "Syncing..." : "Ready"}
          </Text>
          <Text style={{ fontSize: 12, color: "#666" }}>Status</Text>
        </View>
      </View>

      {/* Control Buttons */}
      <View style={{ flexDirection: "row", marginBottom: 20, gap: 10 }}>
        <TouchableOpacity
          onPress={refreshSyncStatus}
          style={{
            flex: 1,
            backgroundColor: "#2196f3",
            padding: 12,
            borderRadius: 6,
            alignItems: "center",
          }}
          disabled={isSyncing}
        >
          <Text style={{ color: "white", fontWeight: "600" }}>Refresh</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleMarkAllForResync}
          style={{
            flex: 1,
            backgroundColor: "#ff9800",
            padding: 12,
            borderRadius: 6,
            alignItems: "center",
          }}
          disabled={isSyncing}
        >
          <Text style={{ color: "white", fontWeight: "600" }}>Mark All</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleForceSyncAll}
          style={{
            flex: 1,
            backgroundColor: "#4caf50",
            padding: 12,
            borderRadius: 6,
            alignItems: "center",
          }}
          disabled={isSyncing || syncStatus.length === 0}
        >
          <Text style={{ color: "white", fontWeight: "600" }}>Sync All</Text>
        </TouchableOpacity>
      </View>

      {/* Device List */}
      <ScrollView style={{ maxHeight: 400 }}>
        {syncStatus.length === 0 ? (
          <View
            style={{
              padding: 20,
              alignItems: "center",
              backgroundColor: "#f9f9f9",
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "#666", fontSize: 16 }}>
              No registered devices found
            </Text>
            <Text style={{ color: "#999", fontSize: 14, marginTop: 4 }}>
              Connect and register devices to see sync status
            </Text>
          </View>
        ) : (
          syncStatus.map((deviceStatus) => (
            <View
              key={`${deviceStatus.deviceId}_${deviceStatus.kidId}`}
              style={{
                backgroundColor: "white",
                borderRadius: 8,
                padding: 16,
                marginBottom: 12,
                borderLeftWidth: 4,
                borderLeftColor: getSyncStatusColor(deviceStatus),
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ fontSize: 16, fontWeight: "600", marginBottom: 4 }}
                  >
                    Device: {deviceStatus.deviceId.substring(0, 8)}...
                  </Text>
                  <Text
                    style={{ fontSize: 14, color: "#666", marginBottom: 2 }}
                  >
                    Kid ID: {deviceStatus.kidId}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: getSyncStatusColor(deviceStatus),
                      fontWeight: "500",
                    }}
                  >
                    {getSyncStatusText(deviceStatus)}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => handleSyncDevice(deviceStatus)}
                  style={{
                    backgroundColor: getSyncStatusColor(deviceStatus),
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 6,
                  }}
                  disabled={isSyncing}
                >
                  <Text style={{ color: "white", fontWeight: "600" }}>
                    {isSyncing ? "Syncing..." : "Sync"}
                  </Text>
                </TouchableOpacity>
              </View>

              {showDetails && (
                <View
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: "#eee",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <View>
                      <Text style={{ fontSize: 12, color: "#999" }}>
                        Last Sync
                      </Text>
                      <Text style={{ fontSize: 14, color: "#333" }}>
                        {formatLastSync(deviceStatus.lastSuccessfulSync)}
                      </Text>
                    </View>
                    <View>
                      <Text style={{ fontSize: 12, color: "#999" }}>
                        Events Synced
                      </Text>
                      <Text style={{ fontSize: 14, color: "#333" }}>
                        {deviceStatus.syncedEventCount}
                      </Text>
                    </View>
                    <View>
                      <Text style={{ fontSize: 12, color: "#999" }}>
                        Retries
                      </Text>
                      <Text style={{ fontSize: 14, color: "#333" }}>
                        {deviceStatus.pendingRetries}/{deviceStatus.maxRetries}
                      </Text>
                    </View>
                  </View>

                  {deviceStatus.failureReason && (
                    <View style={{ marginTop: 8 }}>
                      <Text style={{ fontSize: 12, color: "#999" }}>
                        Last Error
                      </Text>
                      <Text style={{ fontSize: 12, color: "#ff6b6b" }}>
                        {deviceStatus.failureReason}
                      </Text>
                    </View>
                  )}

                  {deviceStatus.nextRetryAt && (
                    <View style={{ marginTop: 4 }}>
                      <Text style={{ fontSize: 12, color: "#999" }}>
                        Next Retry
                      </Text>
                      <Text style={{ fontSize: 12, color: "#ff9800" }}>
                        {formatLastSync(deviceStatus.nextRetryAt)}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

export default DeviceSyncStatusDisplay;
