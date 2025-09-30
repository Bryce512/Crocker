import React, {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useState,
  useCallback,
} from "react";
import { AppState } from "react-native";
import {
  calendarService,
  CalendarEvent,
  Kid,
  AlertBatch,
} from "../services/calendarService";
import { useBluetooth } from "./BluetoothContext";
import { useAuth } from "./AuthContext";
import firebaseService from "../services/firebaseService";

// Define the shape of our calendar context
interface CalendarContextType {
  // State
  events: CalendarEvent[];
  kids: Kid[];
  isImporting: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;

  // Calendar management
  importCalendarEvents: () => Promise<CalendarEvent[]>;
  addEvent: (
    event: Omit<CalendarEvent, "id" | "lastModified">
  ) => Promise<CalendarEvent>;
  updateEvent: (
    eventId: string,
    updates: Partial<CalendarEvent>
  ) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;

  // Kid management
  addKid: (kid: Omit<Kid, "id">) => Promise<Kid>;
  updateKid: (kidId: string, updates: Partial<Kid>) => Promise<void>;
  deleteKid: (kidId: string) => Promise<void>;

  // Alert management
  sendAlertBatch: (kidId: string) => Promise<boolean>;
  sendImmediateAlert: (
    kidId: string,
    title: string,
    minutesUntil: number
  ) => Promise<boolean>;
  markKidForResync: (kidId: string) => Promise<void>;

  // Utility
  getEventsForKid: (kidId: string) => CalendarEvent[];
  getUpcomingEvents: (hours?: number) => CalendarEvent[];
  refreshData: () => Promise<void>;
}

// Create the context
const CalendarContext = createContext<CalendarContextType | undefined>(
  undefined
);

// Provider component following your BluetoothContext pattern
export const CalendarProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { isConnected } = useBluetooth();

  // State variables following BluetoothContext pattern
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [kids, setKids] = useState<Kid[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Load data on mount and user change
  useEffect(() => {
    if (user) {
      refreshData();
    } else {
      // Clear data when user logs out
      setEvents([]);
      setKids([]);
      setLastSyncTime(null);
    }
  }, [user]);

  // Monitor app state for auto-sync following BluetoothContext pattern
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active" && user) {
        // Check for resync needs when app becomes active
        checkForResyncNeeds();
      }
    });

    return () => subscription.remove();
  }, [user]);

  // Auto-sync every 5 minutes when app is active
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      if (AppState.currentState === "active") {
        checkForResyncNeeds();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [user]);

  // Refresh all data from Firebase
  const refreshData = useCallback(async (): Promise<void> => {
    if (!user) {
      console.log("🔍 DEBUG: refreshData - No user, returning early");
      return;
    }

    try {
      console.log(
        "🔍 DEBUG: refreshData - Starting refresh for user:",
        user.uid
      );

      // Load events and kids from Firebase
      console.log(
        "🔍 DEBUG: refreshData - Calling firebaseService.getEvents..."
      );
      const eventsData = await firebaseService.getEvents();
      console.log("🔍 DEBUG: refreshData - getEvents returned:", eventsData);
      console.log(
        "🔍 DEBUG: refreshData - eventsData type:",
        typeof eventsData
      );
      console.log(
        "🔍 DEBUG: refreshData - eventsData isArray:",
        Array.isArray(eventsData)
      );
      if (eventsData && eventsData.length > 0) {
        console.log("🔍 DEBUG: refreshData - First event:", eventsData[0]);
        console.log(
          "🔍 DEBUG: refreshData - First event startTime type:",
          typeof eventsData[0].startTime
        );
        console.log(
          "🔍 DEBUG: refreshData - First event startTime value:",
          eventsData[0].startTime
        );
      }

      console.log("🔍 DEBUG: refreshData - Calling firebaseService.getKids...");
      const kidsData = await firebaseService.getKids();
      console.log("🔍 DEBUG: refreshData - getKids returned:", kidsData);

      console.log("🔍 DEBUG: refreshData - Setting events state...");
      setEvents(Array.isArray(eventsData) ? eventsData : []);
      console.log("🔍 DEBUG: refreshData - Setting kids state...");
      setKids(Array.isArray(kidsData) ? kidsData : []);

      console.log(
        `✅ DEBUG: refreshData - Loaded ${eventsData?.length || 0} events and ${
          kidsData?.length || 0
        } kids`
      );
    } catch (error) {
      console.error(
        "❌ DEBUG: refreshData - Error refreshing calendar data:",
        error
      );
    }
  }, [user]);

  // Import calendar events from device
  const importCalendarEvents = useCallback(async (): Promise<
    CalendarEvent[]
  > => {
    setIsImporting(true);
    try {
      console.log("Importing calendar events from device...");
      const importedEvents = await calendarService.importNativeEvents();

      console.log(
        "🔍 DEBUG: importedEvents from calendarService:",
        importedEvents.length
      );
      console.log("🔍 DEBUG: First imported event:", importedEvents[0]);

      // Check for duplicates in imported events
      const importedEventIds = importedEvents.map((e) => e.id);
      const uniqueImportedIds = [...new Set(importedEventIds)];
      console.log("🔍 DEBUG: Total imported events:", importedEvents.length);
      console.log(
        "🔍 DEBUG: Unique imported event IDs:",
        uniqueImportedIds.length
      );
      if (importedEvents.length !== uniqueImportedIds.length) {
        console.log(
          "⚠️ WARNING: Duplicate event IDs found in imported events!"
        );
        console.log(
          "🔍 DEBUG: Duplicate IDs:",
          importedEventIds.filter(
            (id, index) => importedEventIds.indexOf(id) !== index
          )
        );
      }

      if (user && importedEvents.length > 0) {
        // Remove duplicates from imported events first
        const uniqueImportedEvents = importedEvents.filter(
          (event, index, array) =>
            array.findIndex((e) => e.id === event.id) === index
        );

        if (uniqueImportedEvents.length !== importedEvents.length) {
          console.log(
            `🔧 Removed ${
              importedEvents.length - uniqueImportedEvents.length
            } duplicate events from import`
          );
        }

        // Get existing events
        const existingEvents = await firebaseService.getEvents();
        console.log("🔍 DEBUG: existingEvents from Firebase:", existingEvents);

        // Create a map of existing events by ID for efficient lookup
        const existingEventsMap = new Map(
          existingEvents.map((e: any) => [e.id, e])
        );

        // Merge imported events with existing ones, preferring imported data if more complete
        const mergedEvents: any[] = [];
        const newEventIds: string[] = [];

        uniqueImportedEvents.forEach((importedEvent) => {
          const existingEvent = existingEventsMap.get(importedEvent.id);

          if (!existingEvent) {
            // Completely new event
            mergedEvents.push(importedEvent);
            newEventIds.push(importedEvent.id);
          } else {
            // Event exists, check if imported version is more complete
            const importedHasTime =
              importedEvent.startTime && importedEvent.endTime;
            const existingHasTime =
              existingEvent.startTime && existingEvent.endTime;

            if (importedHasTime && !existingHasTime) {
              // Imported version has time data, existing doesn't - use imported
              mergedEvents.push(importedEvent);
              newEventIds.push(importedEvent.id);
            } else if (
              importedEvent.lastModified &&
              existingEvent.lastModified &&
              new Date(importedEvent.lastModified) >
                new Date(existingEvent.lastModified)
            ) {
              // Imported version is newer - use imported
              mergedEvents.push(importedEvent);
              newEventIds.push(importedEvent.id);
            } else {
              // Keep existing version
              mergedEvents.push(existingEvent);
            }
          }
        });

        // Add any existing events that weren't in the imported list
        existingEvents.forEach((existingEvent: any) => {
          if (
            !uniqueImportedEvents.find(
              (imported) => imported.id === existingEvent.id
            )
          ) {
            mergedEvents.push(existingEvent);
          }
        });

        console.log(
          `🔍 DEBUG: Merged ${mergedEvents.length} total events, ${newEventIds.length} new/updated`
        );
        console.log("🔍 DEBUG: New/updated event IDs:", newEventIds);

        // Always save all merged events to Firebase to ensure consistency
        console.log("🔍 DEBUG: Saving merged events to Firebase...");
        
        // Count events without assigned kids
        const eventsWithoutKids = mergedEvents.filter(event => !event.assignedKidId);
        if (eventsWithoutKids.length > 0) {
          console.warn(`⚠️ ${eventsWithoutKids.length} events have no assigned kid for alerts`);
        }
        
        await firebaseService.setEvents(mergedEvents);

        // Update local state
        setEvents(mergedEvents);

        console.log(
          `Imported ${newEventIds.length} new events (${uniqueImportedEvents.length} total found), saved ${mergedEvents.length} total events to Firebase`
        );

        setIsImporting(false);
        return uniqueImportedEvents;
      }

      setIsImporting(false);
      return importedEvents;
    } catch (error) {
      console.error("Error importing calendar events:", error);
      setIsImporting(false);
      throw error;
    }
  }, [user]);

  // Add new event
  const addEvent = useCallback(
    async (
      eventData: Omit<CalendarEvent, "id" | "lastModified">
    ): Promise<CalendarEvent> => {
      if (!user) throw new Error("User not authenticated");

      try {
        const newEvent = await calendarService.addEvent(eventData);

        // Warn if no kid is assigned
        if (!newEvent.assignedKidId) {
          console.warn("⚠️ Event saved without assigned kid:", newEvent.title);
        }

        // Save to Firebase immediately
        await firebaseService.addEvent(newEvent);

        // Update local state
        setEvents((prev) => [...prev, newEvent]);

        // Mark assigned kid for resync
        if (newEvent.assignedKidId) {
          await markKidForResync(newEvent.assignedKidId);
        }

        console.log("✅ Event added and saved to Firebase:", newEvent.id);
        return newEvent;
      } catch (error) {
        console.error("Error adding event:", error);
        throw error;
      }
    },
    [user]
  );

  // Update existing event
  const updateEvent = useCallback(
    async (eventId: string, updates: Partial<CalendarEvent>): Promise<void> => {
      if (!user) return;

      try {
        // Find the existing event
        const existingEvent = events.find((e) => e.id === eventId);
        if (!existingEvent) {
          throw new Error(`Event with id ${eventId} not found`);
        }

        // Create the complete updated event
        const updatedEvent = {
          ...existingEvent,
          ...updates,
          lastModified: new Date(),
        };

        // Update in Firebase using the new updateEvent function
        await firebaseService.updateEvent(eventId, updatedEvent);

        // Update local state
        setEvents((prev) =>
          prev.map((event) => (event.id === eventId ? updatedEvent : event))
        );

        // Mark affected kid for resync
        if (updatedEvent.assignedKidId) {
          await markKidForResync(updatedEvent.assignedKidId);
        }

        console.log(
          "✅ Event updated using individual object approach:",
          eventId
        );
      } catch (error) {
        console.error("Error updating event:", error);
        throw error;
      }
    },
    [user, events]
  );

  // Delete event
  const deleteEvent = useCallback(
    async (eventId: string): Promise<void> => {
      if (!user) return;

      try {
        const event = events.find((e) => e.id === eventId);

        // Remove from Firebase
        await firebaseService.deleteEvent(eventId);

        // Remove from local state
        setEvents((prev) => prev.filter((e) => e.id !== eventId));

        // Mark affected kid for resync
        if (event?.assignedKidId) {
          await markKidForResync(event.assignedKidId);
        }

        console.log("✅ Event deleted from Firebase and local state:", eventId);
      } catch (error) {
        console.error("Error deleting event:", error);
        throw error;
      }
    },
    [user, events]
  );

  // Add new kid
  const addKid = useCallback(
    async (kidData: Omit<Kid, "id">): Promise<Kid> => {
      if (!user) throw new Error("User not authenticated");

      try {
        const newKid: Kid = {
          ...kidData,
          id: `kid_${Date.now()}`,
          needsResync: true,
        };

        // Save to Firebase
        await firebaseService.addKid(newKid);

        // Update local state
        setKids((prev) => [...prev, newKid]);

        return newKid;
      } catch (error) {
        console.error("Error adding kid:", error);
        throw error;
      }
    },
    [user]
  );

  // Update kid
  const updateKid = useCallback(
    async (kidId: string, updates: Partial<Kid>): Promise<void> => {
      if (!user) return;

      try {
        // Update local state
        setKids((prev) =>
          prev.map((kid) => (kid.id === kidId ? { ...kid, ...updates } : kid))
        );

        // Update in Firebase
        const updatedKids = kids.map((kid) =>
          kid.id === kidId ? { ...kid, ...updates } : kid
        );
        await firebaseService.addKid(updatedKids);
      } catch (error) {
        console.error("Error updating kid:", error);
        throw error;
      }
    },
    [user, kids]
  );

  // Delete kid
  const deleteKid = useCallback(
    async (kidId: string): Promise<void> => {
      if (!user) return;

      try {
        // Remove from local state
        setKids((prev) => prev.filter((k) => k.id !== kidId));

        // Also remove events assigned to this kid
        setEvents((prev) =>
          prev.map((event) =>
            event.assignedKidId === kidId
              ? { ...event, assignedKidId: undefined, isActive: false }
              : event
          )
        );
      } catch (error) {
        console.error("Error deleting kid:", error);
        throw error;
      }
    },
    [user]
  );

  // Send 24-hour alert batch to kid's device
  const sendAlertBatch = useCallback(
    async (kidId: string): Promise<boolean> => {
      if (!isConnected) {
        console.log("Not connected to Bluetooth device");
        return false;
      }

      setIsSyncing(true);
      try {
        const success = await calendarService.sendAlertBatchToBluetooth(kidId);

        if (success) {
          // Mark kid as synced
          await updateKid(kidId, { needsResync: false });
          setLastSyncTime(new Date());
        }

        setIsSyncing(false);
        return success;
      } catch (error) {
        console.error("Error sending alert batch:", error);
        setIsSyncing(false);
        return false;
      }
    },
    [isConnected, updateKid]
  );

  // Send immediate alert
  const sendImmediateAlertToKid = useCallback(
    async (
      kidId: string,
      title: string,
      minutesUntil: number
    ): Promise<boolean> => {
      if (!isConnected) {
        console.log("Not connected to Bluetooth device");
        return false;
      }

      try {
        const kid = kids.find((k) => k.id === kidId);
        if (!kid) return false;

        // Use the calendar service's immediate alert function
        return await calendarService.sendAlertBatchToBluetooth(kidId);
      } catch (error) {
        console.error("Error sending immediate alert:", error);
        return false;
      }
    },
    [isConnected, kids]
  );

  // Mark kid for resync
  const markKidForResync = useCallback(
    async (kidId: string): Promise<void> => {
      await updateKid(kidId, { needsResync: true });
      await calendarService.markKidNeedsResync(kidId);
    },
    [updateKid]
  );

  // Check for kids that need resync
  const checkForResyncNeeds = useCallback(async (): Promise<void> => {
    if (!isConnected || !user) return;

    try {
      const kidsNeedingSync = kids.filter((kid) => kid.needsResync);

      for (const kid of kidsNeedingSync) {
        console.log(`Kid ${kid.name} needs resync, sending alert batch...`);
        await sendAlertBatch(kid.id);
      }
    } catch (error) {
      console.error("Error checking resync needs:", error);
    }
  }, [isConnected, user, kids, sendAlertBatch]);

  // Utility functions
  const getEventsForKid = useCallback(
    (kidId: string): CalendarEvent[] => {
      return events.filter(
        (event) => event.assignedKidId === kidId && event.isActive
      );
    },
    [events]
  );

  const getUpcomingEvents = useCallback(
    (hours: number = 24): CalendarEvent[] => {
      const now = new Date();
      const futureTime = new Date(now.getTime() + hours * 60 * 60 * 1000);

      return events
        .filter(
          (event) =>
            event.isActive &&
            event.startTime > now &&
            event.startTime <= futureTime
        )
        .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    },
    [events]
  );

  // Context value following BluetoothContext pattern
  const contextValue: CalendarContextType = {
    // State
    events,
    kids,
    isImporting,
    isSyncing,
    lastSyncTime,

    // Calendar management
    importCalendarEvents,
    addEvent,
    updateEvent,
    deleteEvent,

    // Kid management
    addKid,
    updateKid,
    deleteKid,

    // Alert management
    sendAlertBatch,
    sendImmediateAlert: sendImmediateAlertToKid,
    markKidForResync,

    // Utility
    getEventsForKid,
    getUpcomingEvents,
    refreshData,
  };

  return (
    <CalendarContext.Provider value={contextValue}>
      {children}
    </CalendarContext.Provider>
  );
};

// Hook to use calendar context following your pattern
export const useCalendar = () => {
  const context = useContext(CalendarContext);

  if (context === undefined) {
    throw new Error("useCalendar must be used within a CalendarProvider");
  }

  return context;
};
