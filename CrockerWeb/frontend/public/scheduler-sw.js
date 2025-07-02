// Service worker for background event scheduling
// This enables the app to trigger events even when the browser tab is closed

const CACHE_NAME = "scheduler-cache-v1";
const DB_VERSION = 1;
const DB_NAME = "ServiceWorkerEventDB";

// Install service worker
self.addEventListener("install", (event) => {
  self.skipWaiting();

  // Pre-cache app assets using a more robust approach
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Define the assets to cache
      const assetsToCache = ["./", "./index.html", "./favicon.ico"];

      // Try to cache what we can, ignoring failures for missing files
      return Promise.all(
        assetsToCache.map((url) => {
          // Use fetch with catch to handle missing files gracefully
          return fetch(url)
            .then((response) => {
              if (!response.ok) {
                throw new Error(`Failed to fetch ${url}`);
              }
              return cache.put(url, response);
            })
            .catch((err) => {
              console.warn(`Caching failed for ${url}:`, err);
              // Just continue with other files
              return Promise.resolve();
            });
        })
      );
    })
  );
});

// Activate and claim clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Handle fetch requests
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Initialize the IndexedDB
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      const db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains("events")) {
        const store = db.createObjectStore("events", {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("timestamp", "timestamp");
        store.createIndex("scheduled", "scheduled");
        store.createIndex("triggered", "triggered");
      }
    };
  });
}

// Store event in database
async function storeEvent(event) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["events"], "readwrite");
    const store = transaction.objectStore("events");

    const request = store.put({
      ...event,
      scheduled: true,
      triggered: false,
      scheduledAt: Date.now(),
    });

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Mark event as triggered
async function markEventTriggered(id) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["events"], "readwrite");
    const store = transaction.objectStore("events");

    const request = store.get(id);

    request.onsuccess = () => {
      const event = request.result;
      if (event) {
        event.triggered = true;
        event.triggeredAt = Date.now();
        const updateRequest = store.put(event);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error);
      } else {
        resolve();
      }
    };

    request.onerror = () => reject(request.error);
  });
}

// Get all pending events
async function getPendingEvents() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["events"], "readonly");
    const store = transaction.objectStore("events");

    // Get all events and filter in memory instead of using IDBKeyRange.only(false)
    const request = store.getAll();

    request.onsuccess = () => {
      const events = request.result.filter(
        (event) => event.triggered === false
      );
      resolve(events);
    };
    request.onerror = () => reject(request.error);
  });
}

// Schedule all pending events
async function scheduleAllEvents() {
  const events = await getPendingEvents();

  events.forEach((event) => {
    const now = Date.now();
    if (event.timestamp > now) {
      const delay = event.timestamp - now;

      if ("Notification" in self && "showNotification" in self.registration) {
        const notificationTimeout = setTimeout(async () => {
          try {
            await self.registration.showNotification(event.name, {
              body: "Your scheduled event is happening now!",
              icon: event.image || "/favicon.ico",
              tag: `event-${event.id}`,
              requireInteraction: true,
              data: { eventId: event.id },
              actions: [
                { action: "view", title: "View" },
                { action: "dismiss", title: "Dismiss" },
              ],
            });

            await markEventTriggered(event.id);

            // Notify any open clients
            const clients = await self.clients.matchAll();
            clients.forEach((client) => {
              client.postMessage({
                type: "EVENT_TRIGGERED",
                event: event,
              });
            });
          } catch (error) {
            console.error("Error showing notification:", error);
          }
        }, delay);

        // Store timeout in global scope to be able to cancel it if needed
        self[`eventTimeout_${event.id}`] = notificationTimeout;
      }
    }
  });
}

// Handle messages from clients
self.addEventListener("message", (event) => {
  const message = event.data;

  if (!message || !message.type) return;

  switch (message.type) {
    case "SCHEDULE_EVENT":
      handleScheduleEvent(message.event, event.source);
      break;
    case "CANCEL_EVENT":
      handleCancelEvent(message.eventId);
      break;
    case "GET_EVENTS":
      handleGetEvents(event.source);
      break;
    case "SYNC_EVENTS":
      scheduleAllEvents();
      break;
  }
});

// Handle scheduling a new event
async function handleScheduleEvent(event, client) {
  try {
    const eventId = await storeEvent(event);

    // Schedule the event
    const now = Date.now();
    if (event.timestamp > now) {
      const delay = event.timestamp - now;

      if ("Notification" in self && "showNotification" in self.registration) {
        const notificationTimeout = setTimeout(async () => {
          try {
            await self.registration.showNotification(event.name, {
              body: "Your scheduled event is happening now!",
              icon: event.image || "/favicon.ico",
              tag: `event-${eventId}`,
              requireInteraction: true,
              data: { eventId },
              actions: [
                { action: "view", title: "View" },
                { action: "dismiss", title: "Dismiss" },
              ],
            });

            await markEventTriggered(eventId);

            // Notify any open clients
            const clients = await self.clients.matchAll();
            clients.forEach((client) => {
              client.postMessage({
                type: "EVENT_TRIGGERED",
                event: { ...event, id: eventId },
              });
            });
          } catch (error) {
            console.error("Error showing notification:", error);
          }
        }, delay);

        // Store timeout in global scope to be able to cancel it if needed
        self[`eventTimeout_${eventId}`] = notificationTimeout;
      }
    }

    // Respond to the client
    if (client) {
      client.postMessage({
        type: "EVENT_SCHEDULED",
        eventId,
        event,
      });
    }
  } catch (error) {
    console.error("Error scheduling event:", error);
    if (client) {
      client.postMessage({
        type: "ERROR",
        error: error.toString(),
      });
    }
  }
}

// Handle canceling an event
async function handleCancelEvent(eventId) {
  try {
    // Clear the timeout
    const timeoutKey = `eventTimeout_${eventId}`;
    if (self[timeoutKey]) {
      clearTimeout(self[timeoutKey]);
      delete self[timeoutKey];
    }

    // Mark as triggered in the database (we use this as a "canceled" state)
    await markEventTriggered(eventId);
  } catch (error) {
    console.error("Error canceling event:", error);
  }
}

// Handle getting all events
async function handleGetEvents(client) {
  if (!client) return;

  try {
    const events = await getPendingEvents();

    client.postMessage({
      type: "EVENTS_LIST",
      events,
    });
  } catch (error) {
    console.error("Error getting events:", error);
    client.postMessage({
      type: "ERROR",
      error: error.toString(),
    });
  }
}

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const eventId = event.notification.data?.eventId;

  if (event.action === "view" || !event.action) {
    // Open the app when notification is clicked
    event.waitUntil(
      self.clients.matchAll({ type: "window" }).then((clients) => {
        // If a tab is already open, focus it
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            return client.focus();
          }
        }

        // Otherwise open a new tab
        return self.clients.openWindow("/");
      })
    );
  }
});

// Initial scheduling of events when service worker starts
scheduleAllEvents();
