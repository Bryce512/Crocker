/**
 * Basic Event Scheduler with localStorage persistence and efficient setTimeout-based scheduling
 * This class avoids continuous polling by calculating exact delays to the next event
 */

export interface ScheduledEvent {
  name: string;
  image: string;
  created: number;
}

export interface EventNotification {
  timestamp: number;
  events: ScheduledEvent[];
}

export type EventCallback = (event: ScheduledEvent, timestamp: number) => void;

export class BasicEventScheduler {
  private events: Record<number, ScheduledEvent[]> = {};
  private activeTimeout: NodeJS.Timeout | null = null;
  private onEventTriggered?: EventCallback;
  private storageKey = "scheduledEvents";

  constructor(onEventTriggered?: EventCallback) {
    this.onEventTriggered = onEventTriggered;
    this.events = this.loadEventsFromStorage();
    this.scheduleNextEvent();

    // Listen for page visibility changes to reschedule when page becomes active
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        this.scheduleNextEvent();
      }
    });

    // Request notification permission
    this.requestNotificationPermission();
  }

  /**
   * Load events from localStorage (persists through page refreshes)
   */
  private loadEventsFromStorage(): Record<number, ScheduledEvent[]> {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error("Error loading events from storage:", error);
      return {};
    }
  }

  /**
   * Save events to localStorage
   */
  private saveEventsToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.events));
    } catch (error) {
      console.error("Error saving events to storage:", error);
    }
  }

  /**
   * Request notification permission for browser notifications
   */
  private async requestNotificationPermission(): Promise<void> {
    if ("Notification" in window && Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch (error) {
        console.warn("Notification permission request failed:", error);
      }
    }
  }

  /**
   * Add a new scheduled event
   * @param dateTime - Date/time when event should trigger
   * @param eventName - Name of the event
   * @param imagePath - Path to the event image
   */
  public addEvent(
    dateTime: Date | string | number,
    eventName: string,
    imagePath: string
  ): void {
    const timestamp = new Date(dateTime).getTime();

    if (timestamp <= Date.now()) {
      console.warn("Cannot schedule event in the past:", new Date(timestamp));
      return;
    }

    if (!this.events[timestamp]) {
      this.events[timestamp] = [];
    }

    this.events[timestamp].push({
      name: eventName,
      image: imagePath,
      created: Date.now(),
    });

    this.saveEventsToStorage();
    this.scheduleNextEvent(); // Reschedule to include new event

    console.log(
      `Event scheduled for ${new Date(timestamp).toLocaleString()}: ${eventName}`
    );
  }

  /**
   * This is the KEY method - it schedules ONE timeout, not continuous checking
   * This approach is battery-efficient and doesn't drain resources
   */
  private scheduleNextEvent(): void {
    // Clear any existing timeout first
    if (this.activeTimeout) {
      clearTimeout(this.activeTimeout);
      this.activeTimeout = null;
    }

    const now = Date.now();

    // Find the next event that hasn't happened yet
    const upcomingTimes = Object.keys(this.events)
      .map(Number)
      .filter((timestamp) => timestamp > now)
      .sort((a, b) => a - b);

    if (upcomingTimes.length === 0) {
      console.log("No upcoming events scheduled");
      return;
    }

    const nextEventTime = upcomingTimes[0];
    const millisecondsUntilEvent = nextEventTime - now;

    console.log(
      `Next event in ${Math.round(millisecondsUntilEvent / 1000)} seconds`
    );

    // Schedule ONLY the next event - this is efficient!
    this.activeTimeout = setTimeout(() => {
      this.triggerEvents(nextEventTime);
      this.scheduleNextEvent(); // After triggering, schedule the next one
    }, millisecondsUntilEvent);
  }

  /**
   * Trigger all events at a specific time
   */
  private triggerEvents(timestamp: number): void {
    const eventsAtTime = this.events[timestamp];

    if (!eventsAtTime) return;

    eventsAtTime.forEach((event) => {
      this.displayEvent(event, timestamp);

      // Call custom callback if provided
      if (this.onEventTriggered) {
        this.onEventTriggered(event, timestamp);
      }
    });

    // Remove triggered events
    delete this.events[timestamp];
    this.saveEventsToStorage();
  }

  /**
   * Display the event (customize this for your UI)
   */
  private displayEvent(event: ScheduledEvent, timestamp: number): void {
    console.log(
      `🔔 EVENT TRIGGERED: ${event.name} at ${new Date(timestamp).toLocaleString()}`
    );

    // Create browser notification
    this.showBrowserNotification(event.name, event.image);

    // Create custom UI notification
    this.createCustomNotification(event.name, event.image);
  }

  /**
   * Show browser notification
   */
  private showBrowserNotification(eventName: string, imagePath: string): void {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(eventName, {
        body: "Scheduled event is happening now!",
        icon: imagePath,
        tag: `event-${Date.now()}`,
        requireInteraction: true,
      });
    }
  }

  /**
   * Create custom in-app notification
   */
  private createCustomNotification(eventName: string, imagePath: string): void {
    // Remove any existing notifications first
    const existingNotifications = document.querySelectorAll(
      ".event-notification"
    );
    existingNotifications.forEach((notification) => notification.remove());

    const notification = document.createElement("div");
    notification.className = "event-notification";
    notification.innerHTML = `
      <div class="notification-content">
        <img src="${imagePath}" alt="${eventName}" class="event-image" />
        <h3>${eventName}</h3>
        <p>Scheduled event is happening now!</p>
        <button onclick="this.parentElement.parentElement.remove()">Dismiss</button>
      </div>
    `;

    // Add styles
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      border: 2px solid #73C3EB;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 10000;
      max-width: 300px;
      animation: slideIn 0.3s ease-out;
    `;

    // Add CSS animation if not already added
    if (!document.querySelector("#event-notification-styles")) {
      const style = document.createElement("style");
      style.id = "event-notification-styles";
      style.textContent = `
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .event-notification .notification-content {
          text-align: center;
        }
        .event-notification .event-image {
          width: 60px;
          height: 60px;
          object-fit: cover;
          border-radius: 8px;
          margin-bottom: 10px;
        }
        .event-notification h3 {
          margin: 10px 0;
          color: #2B335E;
          font-size: 18px;
        }
        .event-notification p {
          margin: 10px 0;
          color: #666;
          font-size: 14px;
        }
        .event-notification button {
          background: #73C3EB;
          color: #2B335E;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: bold;
        }
        .event-notification button:hover {
          background: #5AB3DB;
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    // Auto-remove after 15 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 15000);
  }

  /**
   * Get all scheduled events for display
   */
  public getAllEvents(): EventNotification[] {
    return Object.entries(this.events)
      .map(([timestamp, events]) => ({
        timestamp: Number(timestamp),
        events: events,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get upcoming events (future events only)
   */
  public getUpcomingEvents(): EventNotification[] {
    const now = Date.now();
    return this.getAllEvents().filter((event) => event.timestamp > now);
  }

  /**
   * Remove a specific event
   */
  public removeEvent(timestamp: number, eventIndex?: number): void {
    if (!this.events[timestamp]) return;

    if (eventIndex !== undefined && this.events[timestamp][eventIndex]) {
      this.events[timestamp].splice(eventIndex, 1);

      if (this.events[timestamp].length === 0) {
        delete this.events[timestamp];
      }
    } else {
      // Remove all events at this timestamp
      delete this.events[timestamp];
    }

    this.saveEventsToStorage();
    this.scheduleNextEvent(); // Reschedule
  }

  /**
   * Clear all events
   */
  public clearAllEvents(): void {
    this.events = {};
    this.saveEventsToStorage();

    if (this.activeTimeout) {
      clearTimeout(this.activeTimeout);
      this.activeTimeout = null;
    }
  }

  /**
   * Get time until next event
   */
  public getTimeUntilNextEvent(): number | null {
    const upcoming = this.getUpcomingEvents();
    return upcoming.length > 0 ? upcoming[0].timestamp - Date.now() : null;
  }

  /**
   * Cleanup method - call when component unmounts
   */
  public destroy(): void {
    if (this.activeTimeout) {
      clearTimeout(this.activeTimeout);
      this.activeTimeout = null;
    }
  }
}
