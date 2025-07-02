/**
 * Advanced Event Scheduler with IndexedDB for robust storage and local image handling
 * This scheduler can store images locally and provides more advanced persistence
 */

export interface StoredEvent {
  id?: number;
  timestamp: number;
  name: string;
  imagePath: string;
  triggered: boolean;
  created: number;
  triggeredAt?: number;
}

export interface StoredImage {
  path: string;
  data: string; // Base64 encoded image data
  timestamp: number;
  size?: number;
}

export type AdvancedEventCallback = (event: StoredEvent) => void;

export class AdvancedEventScheduler {
  private dbName = "EventSchedulerDB";
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private scheduledTimeouts: Map<number, NodeJS.Timeout> = new Map();
  private onEventTriggered?: AdvancedEventCallback;
  private isInitialized = false;

  constructor(onEventTriggered?: AdvancedEventCallback) {
    this.onEventTriggered = onEventTriggered;
    this.init();
  }

  /**
   * Initialize the database and load existing events
   */
  private async init(): Promise<void> {
    try {
      console.log("Starting AdvancedEventScheduler initialization...");
      await this.initDatabase();
      console.log("Database initialized, loading existing events...");
      await this.loadAndScheduleEvents();
      this.isInitialized = true;
      console.log("Advanced Event Scheduler initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Advanced Event Scheduler:", error);
      // Set initialized to true even if there's an error to prevent infinite waiting
      this.isInitialized = true;
      // Don't throw error to prevent blocking the UI
    }
  }

  /**
   * Initialize IndexedDB
   */
  private initDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Add a timeout to prevent hanging
      const timeout = setTimeout(() => {
        console.error("Database initialization timeout");
        reject(new Error("Database initialization timeout"));
      }, 10000); // 10 second timeout

      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        clearTimeout(timeout);
        console.error("Database error:", request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        clearTimeout(timeout);
        this.db = request.result;
        console.log("Database opened successfully");
        resolve();
      };

      request.onupgradeneeded = (event) => {
        try {
          const db = (event.target as IDBOpenDBRequest).result;

          // Create events store
          if (!db.objectStoreNames.contains("events")) {
            const eventStore = db.createObjectStore("events", {
              keyPath: "id",
              autoIncrement: true,
            });
            eventStore.createIndex("timestamp", "timestamp", { unique: false });
            eventStore.createIndex("triggered", "triggered", { unique: false });
            eventStore.createIndex("name", "name", { unique: false });
          }

          // Create images store for local image storage
          if (!db.objectStoreNames.contains("images")) {
            const imageStore = db.createObjectStore("images", {
              keyPath: "path",
            });
            imageStore.createIndex("timestamp", "timestamp", { unique: false });
          }
        } catch (error) {
          clearTimeout(timeout);
          console.error("Error during database upgrade:", error);
          reject(error);
        }
      };
    });
  }

  /**
   * Wait for initialization to complete
   */
  private async waitForInit(): Promise<void> {
    let attempts = 0;
    const maxAttempts = 30; // 3 seconds max wait time

    while (!this.isInitialized && attempts < maxAttempts) {
      console.log(
        `Waiting for AdvancedEventScheduler init... attempt ${attempts + 1}/${maxAttempts}`
      );
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }

    if (!this.isInitialized) {
      console.error(
        "AdvancedEventScheduler failed to initialize within timeout period"
      );
      throw new Error(
        "AdvancedEventScheduler failed to initialize within timeout period"
      );
    }

    console.log("AdvancedEventScheduler initialization complete");
  }

  /**
   * Store image locally in IndexedDB as base64
   */
  public async storeImageLocally(
    imagePath: string,
    imageFile: File | Blob
  ): Promise<string> {
    await this.waitForInit();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        if (!this.db) {
          reject(new Error("Database not initialized"));
          return;
        }

        const transaction = this.db.transaction(["images"], "readwrite");
        const store = transaction.objectStore("images");

        const imageData: StoredImage = {
          path: imagePath,
          data: reader.result as string,
          timestamp: Date.now(),
          size: imageFile.size,
        };

        const request = store.put(imageData);

        request.onsuccess = () => {
          console.log(`Image stored locally: ${imagePath}`);
          resolve(imagePath);
        };

        request.onerror = () => reject(request.error);
      };

      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(imageFile);
    });
  }

  /**
   * Store image from URL (downloads and stores locally)
   */
  public async storeImageFromUrl(
    imagePath: string,
    imageUrl: string
  ): Promise<string> {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      return await this.storeImageLocally(imagePath, blob);
    } catch (error) {
      console.error("Failed to store image from URL:", error);
      throw error;
    }
  }

  /**
   * Get stored image data
   */
  public async getStoredImage(imagePath: string): Promise<string | null> {
    await this.waitForInit();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"));
        return;
      }

      const transaction = this.db.transaction(["images"], "readonly");
      const store = transaction.objectStore("images");
      const request = store.get(imagePath);

      request.onsuccess = () => {
        const result = request.result as StoredImage | undefined;
        resolve(result ? result.data : null);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Add event to database
   */
  private async addEventToDB(
    timestamp: number,
    eventName: string,
    imagePath: string
  ): Promise<number> {
    await this.waitForInit();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"));
        return;
      }

      const transaction = this.db.transaction(["events"], "readwrite");
      const store = transaction.objectStore("events");

      const event: StoredEvent = {
        timestamp: timestamp,
        name: eventName,
        imagePath: imagePath,
        triggered: false,
        created: Date.now(),
      };

      const request = store.add(event);

      request.onsuccess = () => {
        console.log("Event added to database:", event);
        resolve(request.result as number);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Load all untriggered events and schedule them
   */
  private async loadAndScheduleEvents(): Promise<StoredEvent[]> {
    console.log("Loading and scheduling existing events...");
    return new Promise((resolve) => {
      if (!this.db) {
        console.error("Database not initialized in loadAndScheduleEvents");
        // Don't reject, just resolve with empty array to allow initialization to continue
        resolve([]);
        return;
      }

      try {
        const transaction = this.db.transaction(["events"], "readonly");
        const store = transaction.objectStore("events");

        // Instead of using the index with IDBKeyRange.only(false),
        // get all events and filter them in memory
        const request = store.getAll();

        request.onsuccess = () => {
          try {
            const events = (request.result as StoredEvent[]).filter(
              (event) => event.triggered === false
            );
            const now = Date.now();

            events.forEach((event) => {
              if (event.timestamp > now) {
                this.scheduleIndividualEvent(event);
              }
            });

            console.log(
              `Loaded and scheduled ${events.filter((e) => e.timestamp > now).length} events`
            );
            resolve(events);
          } catch (error) {
            console.error("Error processing events:", error);
            resolve([]); // Don't let errors prevent initialization
          }
        };

        request.onerror = () => {
          console.error("Error loading events:", request.error);
          resolve([]); // Don't let errors prevent initialization
        };

        transaction.onerror = () => {
          console.error("Transaction error:", transaction.error);
          resolve([]); // Don't let errors prevent initialization
        };
      } catch (error) {
        console.error("Error creating transaction:", error);
        resolve([]); // Don't let errors prevent initialization
      }
    });
  }

  /**
   * Schedule individual event with efficient timeout
   */
  private scheduleIndividualEvent(event: StoredEvent): void {
    const delay = event.timestamp - Date.now();

    if (delay > 0 && event.id) {
      const timeout = setTimeout(async () => {
        await this.triggerEvent(event);
        this.scheduledTimeouts.delete(event.id!);
      }, delay);

      this.scheduledTimeouts.set(event.id, timeout);
      console.log(
        `Event scheduled: ${event.name} in ${Math.round(delay / 1000)} seconds`
      );
    }
  }

  /**
   * Trigger event and mark as triggered
   */
  private async triggerEvent(event: StoredEvent): Promise<void> {
    console.log("Triggering event:", event.name);

    try {
      // Get stored image
      const imageData = await this.getStoredImage(event.imagePath);

      // Display event with local image
      this.displayEventWithImage(event.name, imageData || event.imagePath);

      // Call custom callback if provided
      if (this.onEventTriggered) {
        this.onEventTriggered(event);
      }

      // Mark as triggered in database
      if (event.id) {
        await this.markEventAsTriggered(event.id);
      }
    } catch (error) {
      console.error("Error triggering event:", error);
    }
  }

  /**
   * Display event with image
   */
  private displayEventWithImage(eventName: string, imageData: string): void {
    // Remove any existing notifications first
    const existingNotifications = document.querySelectorAll(
      ".advanced-event-notification"
    );
    existingNotifications.forEach((notification) => notification.remove());

    const notification = document.createElement("div");
    notification.className = "advanced-event-notification";
    notification.innerHTML = `
      <div class="notification-content">
        ${imageData ? `<img src="${imageData}" alt="${eventName}" class="event-image" />` : ""}
        <h3>${eventName}</h3>
        <p>Your scheduled event is happening now!</p>
        <div class="notification-buttons">
          <button onclick="this.parentElement.parentElement.parentElement.remove()" class="dismiss-btn">Dismiss</button>
        </div>
      </div>
    `;

    // Enhanced styles for advanced notification
    notification.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 20px;
      padding: 30px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
      z-index: 10001;
      max-width: 400px;
      min-width: 300px;
      text-align: center;
      animation: bounceIn 0.6s ease-out;
    `;

    // Add enhanced CSS animation if not already added
    if (!document.querySelector("#advanced-event-notification-styles")) {
      const style = document.createElement("style");
      style.id = "advanced-event-notification-styles";
      style.textContent = `
        @keyframes bounceIn {
          0% {
            transform: translate(-50%, -50%) scale(0.3);
            opacity: 0;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.05);
          }
          70% {
            transform: translate(-50%, -50%) scale(0.9);
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
        }
        .advanced-event-notification .notification-content {
          text-align: center;
        }
        .advanced-event-notification .event-image {
          width: 80px;
          height: 80px;
          object-fit: cover;
          border-radius: 50%;
          margin-bottom: 15px;
          border: 3px solid rgba(255,255,255,0.3);
        }
        .advanced-event-notification h3 {
          margin: 15px 0;
          color: white;
          font-size: 24px;
          font-weight: bold;
        }
        .advanced-event-notification p {
          margin: 15px 0;
          color: rgba(255,255,255,0.9);
          font-size: 16px;
        }
        .advanced-event-notification .notification-buttons {
          margin-top: 20px;
        }
        .advanced-event-notification .dismiss-btn {
          background: rgba(255,255,255,0.2);
          color: white;
          border: 2px solid rgba(255,255,255,0.3);
          padding: 12px 24px;
          border-radius: 25px;
          cursor: pointer;
          font-weight: bold;
          font-size: 14px;
          transition: all 0.3s ease;
        }
        .advanced-event-notification .dismiss-btn:hover {
          background: rgba(255,255,255,0.3);
          border-color: rgba(255,255,255,0.5);
          transform: translateY(-2px);
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    // Auto-remove after 20 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 20000);

    // Show browser notification as well
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(eventName, {
        body: "Your scheduled event is happening now!",
        icon: imageData,
        tag: `advanced-event-${Date.now()}`,
        requireInteraction: true,
      });
    }
  }

  /**
   * Mark event as triggered in database
   */
  private async markEventAsTriggered(eventId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"));
        return;
      }

      const transaction = this.db.transaction(["events"], "readwrite");
      const store = transaction.objectStore("events");
      const request = store.get(eventId);

      request.onsuccess = () => {
        const event = request.result as StoredEvent;
        if (event) {
          event.triggered = true;
          event.triggeredAt = Date.now();

          const updateRequest = store.put(event);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve(); // Event doesn't exist, nothing to update
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Public method to add new event with image file
   */
  public async addEvent(
    dateTime: Date | string | number,
    eventName: string,
    imageFile?: File | Blob,
    imageUrl?: string
  ): Promise<number | null> {
    console.log("AdvancedEventScheduler.addEvent called, waiting for init...");
    await this.waitForInit();
    console.log("AdvancedEventScheduler.addEvent init complete, proceeding...");

    const timestamp = new Date(dateTime).getTime();

    if (timestamp <= Date.now()) {
      console.warn("Cannot schedule event in the past:", new Date(timestamp));
      return null;
    }

    try {
      // Generate unique image path
      const imagePath = `event-${timestamp}-${eventName.replace(/\s+/g, "-")}`;
      console.log("Generated image path:", imagePath);

      // Store image locally if provided
      if (imageFile) {
        console.log("Storing image locally...");
        await this.storeImageLocally(imagePath, imageFile);
        console.log("Image stored successfully");
      } else if (imageUrl) {
        console.log("Storing image from URL...");
        await this.storeImageFromUrl(imagePath, imageUrl);
        console.log("Image from URL stored successfully");
      } else {
        console.log("No image provided");
      }

      // Add event to database
      console.log("Adding event to database...");
      const eventId = await this.addEventToDB(timestamp, eventName, imagePath);
      console.log("Event added to database with ID:", eventId);

      // Schedule the event
      console.log("Scheduling individual event...");
      this.scheduleIndividualEvent({
        id: eventId,
        timestamp,
        name: eventName,
        imagePath,
        triggered: false,
        created: Date.now(),
      });

      console.log(
        `Advanced event scheduled: ${eventName} for ${new Date(timestamp).toLocaleString()}`
      );
      return eventId;
    } catch (error) {
      console.error("Failed to add event:", error);
      return null;
    }
  }

  /**
   * Get all events from database
   */
  public async getAllEvents(): Promise<StoredEvent[]> {
    await this.waitForInit();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"));
        return;
      }

      const transaction = this.db.transaction(["events"], "readonly");
      const store = transaction.objectStore("events");
      const request = store.getAll();

      request.onsuccess = () => {
        const events = request.result as StoredEvent[];
        resolve(events.sort((a, b) => a.timestamp - b.timestamp));
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get upcoming events only
   */
  public async getUpcomingEvents(): Promise<StoredEvent[]> {
    const allEvents = await this.getAllEvents();
    const now = Date.now();
    return allEvents.filter(
      (event) => !event.triggered && event.timestamp > now
    );
  }

  /**
   * Get recently completed events (within the last 30 seconds)
   */
  public async getRecentlyCompletedEvents(): Promise<StoredEvent[]> {
    const allEvents = await this.getAllEvents();
    const now = Date.now();
    const thirtySecondsAgo = now - 30000; // 30 seconds ago

    return allEvents.filter(
      (event) =>
        event.triggered &&
        event.triggeredAt &&
        event.triggeredAt > thirtySecondsAgo
    );
  }

  /**
   * Get all events (past and future) for comprehensive display
   */
  public async getAllEventsForDisplay(): Promise<{
    past: StoredEvent[];
    future: StoredEvent[];
  }> {
    const allEvents = await this.getAllEvents();
    const now = Date.now();

    const past = allEvents
      .filter((event) => event.timestamp < now)
      .sort((a, b) => b.timestamp - a.timestamp); // Sort newest first

    const future = allEvents
      .filter((event) => event.timestamp > now && !event.triggered)
      .sort((a, b) => a.timestamp - b.timestamp); // Sort earliest first

    return { past, future };
  }

  /**
   * Remove event by ID
   */
  public async removeEvent(eventId: number): Promise<void> {
    await this.waitForInit();

    // Cancel scheduled timeout
    if (this.scheduledTimeouts.has(eventId)) {
      clearTimeout(this.scheduledTimeouts.get(eventId)!);
      this.scheduledTimeouts.delete(eventId);
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"));
        return;
      }

      const transaction = this.db.transaction(["events"], "readwrite");
      const store = transaction.objectStore("events");
      const request = store.delete(eventId);

      request.onsuccess = () => {
        console.log(`Event ${eventId} removed`);
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all events
   */
  public async clearAllEvents(): Promise<void> {
    await this.waitForInit();

    // Cancel all scheduled timeouts
    this.scheduledTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.scheduledTimeouts.clear();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"));
        return;
      }

      const transaction = this.db.transaction(
        ["events", "images"],
        "readwrite"
      );

      const eventStore = transaction.objectStore("events");
      const imageStore = transaction.objectStore("images");

      Promise.all([
        new Promise((res) => {
          const req = eventStore.clear();
          req.onsuccess = () => res(void 0);
        }),
        new Promise((res) => {
          const req = imageStore.clear();
          req.onsuccess = () => res(void 0);
        }),
      ])
        .then(() => {
          console.log("All events and images cleared");
          resolve();
        })
        .catch(reject);
    });
  }

  /**
   * Get time until next event
   */
  public async getTimeUntilNextEvent(): Promise<number | null> {
    const upcoming = await this.getUpcomingEvents();
    return upcoming.length > 0 ? upcoming[0].timestamp - Date.now() : null;
  }

  /**
   * Cleanup method - call when component unmounts
   */
  public destroy(): void {
    // Cancel all scheduled timeouts
    this.scheduledTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.scheduledTimeouts.clear();

    // Close database connection
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
