/**
 * Service Worker Scheduler Service
 * This service handles registering the service worker and communicating with it for background tasks
 */

export interface ServiceWorkerEvent {
  id?: number;
  name: string;
  timestamp: number;
  image?: string;
  created?: number;
}

export type ServiceWorkerEventCallback = (event: ServiceWorkerEvent) => void;

export class ServiceWorkerScheduler {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private onEventTriggered?: ServiceWorkerEventCallback;
  private isInitialized = false;

  /**
   * Constructor for the ServiceWorkerScheduler
   * @param onEventTriggered Callback for when an event is triggered
   */
  constructor(onEventTriggered?: ServiceWorkerEventCallback) {
    this.onEventTriggered = onEventTriggered;
    this.init();
  }

  /**
   * Initialize the service worker and set up event listeners
   */
  private async init(): Promise<void> {
    if (!("serviceWorker" in navigator)) {
      console.warn("Service workers not supported in this browser");
      return;
    }

    try {
      // Register the service worker
      this.swRegistration =
        await navigator.serviceWorker.register("/scheduler-sw.js");
      console.log("Service Worker registered:", this.swRegistration);

      // Set up message listener
      this.setupMessageListener();

      // Sync events when page loads
      this.syncEvents();

      this.isInitialized = true;
    } catch (error) {
      console.error("Service Worker registration failed:", error);
    }
  }

  /**
   * Wait until initialization is complete
   */
  private async waitForInit(): Promise<void> {
    if (this.isInitialized) return;

    let attempts = 0;
    while (!this.isInitialized && attempts < 50) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }

    if (!this.isInitialized) {
      throw new Error("Service Worker initialization timed out");
    }
  }

  /**
   * Set up listener for messages from the service worker
   */
  private setupMessageListener(): void {
    navigator.serviceWorker.addEventListener("message", (event) => {
      const message = event.data;

      if (!message || !message.type) return;

      switch (message.type) {
        case "EVENT_TRIGGERED":
          this.handleEventTriggered(message.event);
          break;
        case "EVENT_SCHEDULED":
          console.log(
            "Event scheduled:",
            message.event,
            "ID:",
            message.eventId
          );
          break;
        case "EVENTS_LIST":
          console.log("Events list received:", message.events);
          break;
        case "ERROR":
          console.error("Service Worker error:", message.error);
          break;
      }
    });
  }

  /**
   * Handle event triggered notification from service worker
   */
  private handleEventTriggered(event: ServiceWorkerEvent): void {
    console.log("Event triggered via service worker:", event);

    if (this.onEventTriggered) {
      this.onEventTriggered(event);
    }

    // You can also create a visual notification here if the app is open
  }

  /**
   * Sync events with the service worker
   */
  private syncEvents(): void {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "SYNC_EVENTS",
      });
    }
  }

  /**
   * Get all scheduled events from the service worker
   */
  public async getEvents(): Promise<void> {
    await this.waitForInit();

    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "GET_EVENTS",
      });
    }
  }

  /**
   * Schedule a new event
   * @param dateTime When the event should trigger
   * @param eventName Name of the event
   * @param imagePath Path to the event image
   */
  public async scheduleEvent(
    dateTime: Date | string | number,
    eventName: string,
    imagePath: string
  ): Promise<void> {
    await this.waitForInit();

    if (!navigator.serviceWorker.controller) {
      throw new Error("Service worker not active");
    }

    const timestamp = new Date(dateTime).getTime();

    if (timestamp <= Date.now()) {
      console.warn("Cannot schedule event in the past:", new Date(timestamp));
      return;
    }

    navigator.serviceWorker.controller.postMessage({
      type: "SCHEDULE_EVENT",
      event: {
        name: eventName,
        timestamp,
        image: imagePath,
        created: Date.now(),
      },
    });
  }

  /**
   * Cancel a scheduled event
   * @param eventId ID of the event to cancel
   */
  public async cancelEvent(eventId: number): Promise<void> {
    await this.waitForInit();

    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "CANCEL_EVENT",
        eventId,
      });
    }
  }

  /**
   * Request notification permission
   */
  public async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!("Notification" in window)) {
      console.warn("Notifications not supported in this browser");
      return "denied";
    }

    // Check if permission is already granted
    if (Notification.permission === "granted") {
      return Notification.permission;
    }

    // Request permission
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return "denied";
    }
  }

  /**
   * Clean up the service worker scheduler
   */
  public destroy(): void {
    // Nothing to explicitly clean up
    // Service worker will continue running in the background
  }
}
