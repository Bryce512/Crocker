import RNCalendarEvents from "react-native-calendar-events";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import firebaseService from "./firebaseService";

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  alertIntervals: number[]; // minutes before event [15, 10, 5]
  isActive: boolean;
  assignedKidId?: string | null;
  assignedDeviceIds?: string[]; // Track which devices this event is assigned to
  source: "native" | "manual" | "imported";
  lastModified: Date;
  imageStoragePath?: string; // Firebase Storage path: user_uploads/{userId}/{eventId}.png
}

export interface Kid {
  id: string;
  name: string;
  deviceId: string; // Bluetooth MAC/UUID of ESP32 device
  alertPreferences: {
    defaultIntervals: number[];
    quietHours: { start: string; end: string };
    alertStyle: "gentle" | "persistent";
  };
  needsResync: boolean;
}

export interface AlertBatch {
  kidId: string;
  generatedAt: Date;
  validUntil: Date;
  alerts: Alert[];
  checksum: string;
}

export interface Alert {
  eventId: string;
  eventTitle: string;
  alertTime: Date; // Exact time to trigger alert
  minutesUntilEvent: number;
  alertType: "transition_warning" | "final_warning";
  vibrationPattern?: number[]; // For ESP32 vibration motor
}

class CalendarService {
  private static instance: CalendarService;

  constructor() {
    this.initializeBackgroundTasks();
  }

  static getInstance(): CalendarService {
    if (!CalendarService.instance) {
      CalendarService.instance = new CalendarService();
    }
    return CalendarService.instance;
  }

  // Check current calendar permission status
  async checkCalendarPermissions(): Promise<string> {
    try {
      // For react-native-calendar-events, we need to check by attempting a request
      const status = await RNCalendarEvents.requestPermissions();
      return status;
    } catch (error) {
      console.error("Error checking calendar permissions:", error);
      return "unknown";
    }
  }

  // Import from device calendar following your existing patterns
  async importNativeEvents(): Promise<CalendarEvent[]> {
    try {
      console.log("Requesting calendar permissions...");

      // Request permissions first
      let status = await RNCalendarEvents.requestPermissions();
      console.log("Permission status:", status);

      if (status !== "authorized") {
        // Try requesting again - sometimes iOS needs multiple requests
        console.log("Permission not granted, requesting again...");
        status = await RNCalendarEvents.requestPermissions();

        if (status !== "authorized") {
          throw new Error(
            `Calendar permission denied. Status: ${status}. Please enable calendar access in Settings.`
          );
        }
      }

      console.log("Calendar permissions granted, fetching calendars...");

      // Get calendars
      const calendars = await RNCalendarEvents.findCalendars();
      console.log("Available calendars:", calendars.length);

      if (calendars.length === 0) {
        console.log("No calendars found");
        return [];
      }

      // Get events for next 7 days
      const startDate = new Date();
      const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      console.log(
        `Fetching events from ${startDate.toISOString()} to ${endDate.toISOString()}`
      );

      const events = await RNCalendarEvents.fetchAllEvents(
        startDate.toISOString(),
        endDate.toISOString()
      );

      console.log(`Found ${events.length} calendar events`);

      if (events.length > 0) {
        console.log("🔍 DEBUG: First raw calendar event:", events[0]);
      }

      const mappedEvents = events.map((event) => {
        console.log("🔍 DEBUG: Raw event:", event.title);
        console.log(
          "🔍 DEBUG: Raw event.startDate:",
          event.startDate,
          typeof event.startDate
        );
        console.log(
          "🔍 DEBUG: Raw event.endDate:",
          event.endDate,
          typeof event.endDate
        );
        console.log("🔍 DEBUG: Raw event object keys:", Object.keys(event));

        // Use startDate and endDate from the event object
        const startDate = event.startDate;
        const endDate = event.endDate || event.startDate;

        console.log("🔍 DEBUG: Using startDate:", startDate);
        console.log("🔍 DEBUG: Using endDate:", endDate);

        if (!startDate) {
          console.warn("⚠️ Event has no start date:", event.title);
        }

        const mappedEvent = {
          id: event.id,
          title: event.title || "Untitled Event",
          startTime: startDate ? new Date(startDate) : new Date(),
          endTime: endDate ? new Date(endDate) : new Date(),
          alertIntervals: [15, 10, 5], // Default intervals
          isActive: true,
          assignedKidId: null, // Imported events have no kid assigned by default
          assignedDeviceIds: [], // Imported events have no devices assigned by default
          source: "native" as const,
          lastModified: new Date(),
        };

        console.log("🔍 DEBUG: Mapped event startTime:", mappedEvent.startTime);
        console.log("🔍 DEBUG: Mapped event endTime:", mappedEvent.endTime);
        return mappedEvent;
      });

      console.log("🔍 DEBUG: All mapped events:", mappedEvents);
      return mappedEvents;
    } catch (error) {
      console.error("Error importing calendar events:", error);
      // Provide more specific error messages
      if (error instanceof Error) {
        if (
          error.message.includes("denied") ||
          error.message.includes("not authorized")
        ) {
          throw new Error(
            "Calendar access denied. Please enable calendar permissions in your device settings and try again."
          );
        } else if (error.message.includes("not found")) {
          throw new Error(
            "No calendars found on your device. Please add a calendar first."
          );
        }
      }
      throw error;
    }
  }

  // Generate 24-hour alert batch for ESP32
  async generateAlertBatch(kidId: string): Promise<AlertBatch> {
    try {
      const user = firebaseService.getCurrentUser();
      if (!user) throw new Error("User not authenticated");

      // Get events for next 24 hours
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const events = await this.getEventsForDateRange(user.uid, now, tomorrow);
      const kid = await this.getKid(user.uid, kidId);

      if (!kid) throw new Error("Kid not found");

      const alerts: Alert[] = [];

      // Generate alerts for each event
      events.forEach((event) => {
        if (!event.isActive || event.assignedKidId !== kidId) return;

        event.alertIntervals.forEach((interval) => {
          const alertTime = new Date(
            event.startTime.getTime() - interval * 60 * 1000
          );

          // Only include alerts that are in the future and within 24 hours
          if (alertTime > now && alertTime <= tomorrow) {
            alerts.push({
              eventId: event.id,
              eventTitle: event.title,
              alertTime,
              minutesUntilEvent: interval,
              alertType: interval <= 5 ? "final_warning" : "transition_warning",
              vibrationPattern: this.getVibrationPattern(
                interval,
                kid.alertPreferences.alertStyle
              ),
            });
          }
        });
      });

      // Sort alerts by time
      alerts.sort((a, b) => a.alertTime.getTime() - b.alertTime.getTime());

      const batch: AlertBatch = {
        kidId,
        generatedAt: now,
        validUntil: tomorrow,
        alerts,
        checksum: this.generateChecksum(alerts),
      };

      // Cache batch locally
      await this.cacheBatch(batch);

      return batch;
    } catch (error) {
      console.error("Error generating alert batch:", error);
      throw error;
    }
  }

  // Convert alert batch to JSON for ESP32
  alertBatchToJSON(batch: AlertBatch): string {
    // Create ESP32-friendly format
    const esp32Payload = {
      kid_id: batch.kidId,
      generated_at: Math.floor(batch.generatedAt.getTime() / 1000), // Unix timestamp
      valid_until: Math.floor(batch.validUntil.getTime() / 1000),
      checksum: batch.checksum,
      alert_count: batch.alerts.length,
      alerts: batch.alerts.map((alert) => ({
        event_id: alert.eventId,
        event_title: alert.eventTitle.substring(0, 50), // Limit title length for ESP32
        alert_time: Math.floor(alert.alertTime.getTime() / 1000), // Unix timestamp
        minutes_until: alert.minutesUntilEvent,
        type: alert.alertType === "final_warning" ? 1 : 0, // Binary for ESP32
        vibration: alert.vibrationPattern || [200, 100, 200], // Default pattern
      })),
    };

    return JSON.stringify(esp32Payload);
  }

  // Send JSON batch via Bluetooth - now delegates to EventSyncService
  async sendAlertBatchToBluetooth(kidId: string): Promise<boolean> {
    try {
      console.log(
        `🔄 Delegating alert batch sync to EventSyncService for kid ${kidId}`
      );

      // Import and use the new EventSyncService
      const { eventSyncService } = await import("./eventSyncService");
      return await eventSyncService.syncDeviceEvents(kidId);
    } catch (error) {
      console.error("Error sending alert batch:", error);
      return false;
    }
  }

  // Background task to check for changes and resync using AppState
  private initializeBackgroundTasks(): void {
    // Use AppState to monitor app lifecycle instead of background timer
    AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        this.checkForResyncNeeds();
      }
    });

    // Check every 5 minutes when app is active
    setInterval(() => {
      if (AppState.currentState === "active") {
        this.checkForResyncNeeds();
      }
    }, 5 * 60 * 1000);
  }

  private async checkForResyncNeeds(): Promise<void> {
    try {
      const user = firebaseService.getCurrentUser();
      if (!user) return;

      const kids = await this.getKids(user.uid);

      for (const kid of kids) {
        if (kid.needsResync) {
          console.log(
            `Kid ${kid.name} needs resync, sending fresh alert batch`
          );
          await this.sendAlertBatchToBluetooth(kid.id);
        }
      }
    } catch (error) {
      console.error("Background resync check failed:", error);
    }
  }

  // Helper methods following your Firebase patterns
  private async getEventsForDateRange(
    userId: string,
    start: Date,
    end: Date
  ): Promise<CalendarEvent[]> {
    // Implementation will use firebaseService to get events
    // This follows your existing Firebase patterns
    return [];
  }

  private async getKids(userId: string): Promise<Kid[]> {
    // Implementation will use firebaseService
    return [];
  }

  private async getKid(userId: string, kidId: string): Promise<Kid | null> {
    // Implementation will use firebaseService
    return null;
  }

  private async markKidSynced(kidId: string): Promise<void> {
    // Set needsResync = false in Firebase
  }

  // Legacy method - now handled by EventSyncService
  private async sendJSONViaBluetooth(
    jsonPayload: string,
    kidId: string
  ): Promise<boolean> {
    console.log(
      "⚠️ sendJSONViaBluetooth is deprecated. Use EventSyncService instead."
    );

    // Import and delegate to EventSyncService
    const { eventSyncService } = await import("./eventSyncService");
    return await eventSyncService.syncDeviceEvents(kidId);
  }

  private async cacheBatch(batch: AlertBatch): Promise<void> {
    try {
      await AsyncStorage.setItem(
        `alert_batch_${batch.kidId}`,
        JSON.stringify(batch)
      );
    } catch (error) {
      console.error("Error caching alert batch:", error);
    }
  }

  private generateChecksum(alerts: Alert[]): string {
    // Simple checksum for ESP32 to verify data integrity
    const data = alerts
      .map((a) => `${a.eventId}${a.alertTime.getTime()}`)
      .join("");
    return Buffer.from(data).toString("base64").substring(0, 8);
  }

  private getVibrationPattern(
    minutesUntil: number,
    style: "gentle" | "persistent"
  ): number[] {
    // Define vibration patterns for ESP32
    if (style === "gentle") {
      return minutesUntil <= 5 ? [300, 200, 300] : [200, 100, 200];
    } else {
      return minutesUntil <= 5 ? [500, 200, 500, 200, 500] : [300, 150, 300];
    }
  }

  // Public methods for screens to use
  async addEvent(
    event: Omit<CalendarEvent, "id" | "lastModified">
  ): Promise<CalendarEvent> {
    const newEvent: CalendarEvent = {
      ...event,
      id: `manual_${Date.now()}`,
      lastModified: new Date(),
      assignedDeviceIds: event.assignedDeviceIds || [],
    };

    const user = firebaseService.getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    // Save to Firebase using individual object structure
    await firebaseService.addEvent(newEvent);

    // Mark all devices for resync using the new EventSyncService
    await this.markAllDevicesForResync();

    return newEvent;
  }

  async checkPermissions(): Promise<string> {
    return await this.checkCalendarPermissions();
  }

  async markKidNeedsResync(kidId: string): Promise<void> {
    console.log(
      "⚠️ markKidNeedsResync is deprecated. Use EventSyncService instead."
    );
    await this.markAllDevicesForResync();
  }

  // Mark all devices for resync - delegates to EventSyncService
  async markAllDevicesForResync(): Promise<void> {
    try {
      // Import and delegate to EventSyncService
      const { eventSyncService } = await import("./eventSyncService");
      await eventSyncService.markAllDevicesForResync();
    } catch (error) {
      console.error("Error marking devices for resync:", error);
    }
  }

  // Cleanup on app close
  destroy(): void {
    // AppState listeners are automatically cleaned up
    console.log("Calendar service destroyed");
  }
}

export const calendarService = CalendarService.getInstance();
export default calendarService;
