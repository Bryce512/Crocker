import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  BasicEventScheduler,
  EventNotification,
  ScheduledEvent,
} from "../services/EventScheduler";
import { AdvancedEventScheduler } from "../services/AdvancedEventScheduler";
import { ServiceWorkerScheduler } from "../services/ServiceWorkerScheduler";
import { AudioAlert } from "../utils/audioUtils";
import CameraCapture from "./CameraCapture";
import "../styles/EventScheduler.css";

// Types for event form
interface EventFormData {
  name: string;
  date: string;
  time: string;
}

// Props for the scheduler component
interface SchedulerComponentProps {
  onEventTriggered?: (eventName: string, imagePath: string) => void;
  onUpcomingEvent?: (name: string, image: string, timestamp: number) => void;
  onEventsUpdated?: (events: EventNotification[]) => void;
  onAllEventsUpdated?: (
    pastEvents: EventNotification[],
    futureEvents: EventNotification[]
  ) => void;
  useAdvancedScheduler?: boolean;
  useServiceWorker?: boolean;
  showScheduler?: boolean;
  onHideScheduler?: () => void;
}

const EventSchedulerComponent: React.FC<SchedulerComponentProps> = ({
  onEventTriggered,
  onUpcomingEvent,
  onEventsUpdated,
  onAllEventsUpdated,
  useAdvancedScheduler = false,
  useServiceWorker = true,
  showScheduler = false,
  onHideScheduler,
}) => {
  // State
  const [showSchedulerInternal, setShowSchedulerInternal] =
    useState<boolean>(false);
  const [formData, setFormData] = useState<EventFormData>({
    name: "",
    date: new Date().toISOString().split("T")[0], // Today's date
    time: new Date().toTimeString().slice(0, 5), // Current time
  });
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<boolean>(
    "Notification" in window && Notification.permission === "granted"
  );
  const [isScheduling, setIsScheduling] = useState<boolean>(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState<boolean>(false);

  // Refs for schedulers
  const basicSchedulerRef = useRef<BasicEventScheduler | null>(null);
  const advancedSchedulerRef = useRef<AdvancedEventScheduler | null>(null);
  const serviceWorkerSchedulerRef = useRef<ServiceWorkerScheduler | null>(null);
  const schedulersInitializedRef = useRef<boolean>(false);

  // Store the callbacks in refs to avoid dependency issues
  const onUpcomingEventRef = useRef(onUpcomingEvent);
  const onEventsUpdatedRef = useRef(onEventsUpdated);
  const onAllEventsUpdatedRef = useRef(onAllEventsUpdated);
  onUpcomingEventRef.current = onUpcomingEvent;
  onEventsUpdatedRef.current = onEventsUpdated;
  onAllEventsUpdatedRef.current = onAllEventsUpdated;

  // Load events from the appropriate scheduler - memoized to avoid excessive DB calls
  const loadEvents = useCallback(
    async (isInitialLoad = false) => {
      // Don't load events if schedulers aren't initialized yet
      if (!schedulersInitializedRef.current) {
        console.log("Schedulers not initialized yet, skipping loadEvents");
        return;
      }

      // Prevent unnecessary reloads on every render
      if (!isInitialLoad && !hasLoadedOnce) {
        console.log("Skipping loadEvents - initial load not completed yet");
        return;
      }

      if (useAdvancedScheduler && advancedSchedulerRef.current) {
        try {
          // Wait for AdvancedEventScheduler to be ready
          let attempts = 0;
          const maxAttempts = 20; // 2 seconds max wait
          while (
            !advancedSchedulerRef.current.isReady() &&
            attempts < maxAttempts
          ) {
            console.log(
              `Waiting for AdvancedEventScheduler to be ready... attempt ${attempts + 1}`
            );
            await new Promise((resolve) => setTimeout(resolve, 100));
            attempts++;
          }

          // Check if the scheduler is ready
          const status = advancedSchedulerRef.current.getStatus();
          console.log("AdvancedEventScheduler status:", status);

          if (!status.canStore) {
            console.warn(
              "AdvancedEventScheduler not ready after waiting, falling back to basic scheduler"
            );
            // Fall back to basic scheduler behavior
            if (basicSchedulerRef.current) {
              const eventNotifications =
                basicSchedulerRef.current.getUpcomingEvents();

              if (onEventsUpdatedRef.current) {
                onEventsUpdatedRef.current(eventNotifications);
              }

              if (onAllEventsUpdatedRef.current) {
                // For basic scheduler, just show upcoming events as future, empty past
                onAllEventsUpdatedRef.current([], eventNotifications);
              }
            }
            return;
          }

          const upcomingEvents =
            await advancedSchedulerRef.current.getUpcomingEvents();

          // Check for recently completed events to restore current event
          const recentlyCompleted =
            await advancedSchedulerRef.current.getRecentlyCompletedEvents();

          // If there's a recently completed event and no current event stored, trigger it as current
          if (recentlyCompleted.length > 0 && onEventTriggered) {
            const mostRecent = recentlyCompleted.sort(
              (a, b) => (b.triggeredAt || 0) - (a.triggeredAt || 0)
            )[0];
            // Only trigger if it's been less than 30 seconds since completion
            const timeSinceCompletion =
              Date.now() - (mostRecent.triggeredAt || 0);
            if (timeSinceCompletion < 30000) {
              onEventTriggered(mostRecent.name, mostRecent.imagePath);
            }
          }

          // Notify parent component about all events with actual image data
          const eventNotifications = await Promise.all(
            upcomingEvents.map(async (event) => {
              let imageData = "";
              if (event.imagePath && advancedSchedulerRef.current) {
                try {
                  const storedImage =
                    await advancedSchedulerRef.current.getStoredImage(
                      event.imagePath
                    );
                  imageData = storedImage || "";
                } catch (error) {
                  console.warn(
                    "Failed to load image for event:",
                    event.name,
                    error
                  );
                }
              }

              return {
                timestamp: event.timestamp,
                events: [
                  {
                    name: event.name,
                    image: imageData,
                    created: event.created,
                  },
                ],
              };
            })
          );

          if (onEventsUpdatedRef.current) {
            onEventsUpdatedRef.current(eventNotifications);
          }

          // Get all events for comprehensive display (past and future)
          if (onAllEventsUpdatedRef.current) {
            const { past, future } =
              await advancedSchedulerRef.current.getAllEventsForDisplay();

            console.log("Loading all events:", {
              pastCount: past.length,
              futureCount: future.length,
              pastEvents: past.map((e) => ({
                name: e.name,
                timestamp: e.timestamp,
                triggered: e.triggered,
              })),
              futureEvents: future.map((e) => ({
                name: e.name,
                timestamp: e.timestamp,
                triggered: e.triggered,
              })),
            });

            // Convert past events to EventNotification format
            const pastEventNotifications = await Promise.all(
              past.map(async (event) => {
                let imageData = "";
                if (event.imagePath && advancedSchedulerRef.current) {
                  try {
                    const storedImage =
                      await advancedSchedulerRef.current.getStoredImage(
                        event.imagePath
                      );
                    imageData = storedImage || "";
                  } catch (error) {
                    console.warn(
                      "Failed to load image for past event:",
                      event.name,
                      error
                    );
                  }
                }

                return {
                  timestamp: event.timestamp,
                  events: [
                    {
                      name: event.name,
                      image: imageData,
                      created: event.created,
                    },
                  ],
                };
              })
            );

            // Convert future events to EventNotification format
            const futureEventNotifications = await Promise.all(
              future.map(async (event) => {
                let imageData = "";
                if (event.imagePath && advancedSchedulerRef.current) {
                  try {
                    const storedImage =
                      await advancedSchedulerRef.current.getStoredImage(
                        event.imagePath
                      );
                    imageData = storedImage || "";
                  } catch (error) {
                    console.warn(
                      "Failed to load image for future event:",
                      event.name,
                      error
                    );
                  }
                }

                return {
                  timestamp: event.timestamp,
                  events: [
                    {
                      name: event.name,
                      image: imageData,
                      created: event.created,
                    },
                  ],
                };
              })
            );

            onAllEventsUpdatedRef.current(
              pastEventNotifications,
              futureEventNotifications
            );

            console.log("Called onAllEventsUpdated with:", {
              pastCount: pastEventNotifications.length,
              futureCount: futureEventNotifications.length,
            });
          }

          // Notify parent component about the next upcoming event with actual image
          if (onUpcomingEventRef.current && upcomingEvents.length > 0) {
            // Sort events by timestamp to find the earliest one
            const sortedEvents = [...upcomingEvents].sort(
              (a, b) => a.timestamp - b.timestamp
            );
            const nextEvent = sortedEvents[0];

            if (nextEvent && nextEvent.timestamp > Date.now()) {
              let nextEventImageData = "";
              if (nextEvent.imagePath && advancedSchedulerRef.current) {
                try {
                  const storedImage =
                    await advancedSchedulerRef.current.getStoredImage(
                      nextEvent.imagePath
                    );
                  nextEventImageData = storedImage || "";
                } catch (error) {
                  console.warn(
                    "Failed to load image for next event:",
                    nextEvent.name,
                    error
                  );
                }
              }

              onUpcomingEventRef.current(
                nextEvent.name,
                nextEventImageData,
                nextEvent.timestamp
              );
            }
          }
        } catch (error) {
          console.error("Error loading advanced events:", error);
        }
      } else if (basicSchedulerRef.current) {
        const allEvents = basicSchedulerRef.current.getUpcomingEvents();

        // Notify parent component about all events
        if (onEventsUpdatedRef.current) {
          onEventsUpdatedRef.current(allEvents);
        }

        // Notify parent component about the next upcoming event
        if (onUpcomingEventRef.current && allEvents.length > 0) {
          // Find earliest timestamp
          const earliestEvent = [...allEvents].sort(
            (a, b) => a.timestamp - b.timestamp
          )[0];

          if (
            earliestEvent &&
            earliestEvent.timestamp > Date.now() &&
            earliestEvent.events.length > 0
          ) {
            const nextEvent = earliestEvent.events[0];
            onUpcomingEventRef.current(
              nextEvent.name,
              nextEvent.image,
              earliestEvent.timestamp
            );
          }
        }
      }

      // Mark that we've completed at least one load
      if (isInitialLoad) {
        setHasLoadedOnce(true);
      }
    },
    [useAdvancedScheduler, onEventTriggered, hasLoadedOnce, setHasLoadedOnce]
  ); // Include all dependencies

  // Create stable event handlers to avoid re-initializing schedulers
  const handleBasicEventTriggered = useCallback(
    (event: ScheduledEvent) => {
      if (onEventTriggered) {
        onEventTriggered(event.name, event.image);
      }
    },
    [onEventTriggered]
  );

  const handleAdvancedEventTriggered = useCallback(
    (event: {
      id?: number;
      timestamp: number;
      name: string;
      imagePath: string;
      triggered: boolean;
      created: number;
      triggeredAt?: number;
    }) => {
      if (onEventTriggered) {
        onEventTriggered(event.name, event.imagePath);
      }
    },
    [onEventTriggered]
  );

  const handleServiceWorkerEventTriggered = useCallback(
    (event: {
      id?: number;
      name: string;
      timestamp: number;
      image?: string;
      created?: number;
    }) => {
      if (onEventTriggered) {
        onEventTriggered(event.name, event.image || "");
      }
    },
    [onEventTriggered]
  );

  // Initialize schedulers (only when scheduler type changes)
  useEffect(() => {
    // Cleanup previous schedulers
    if (basicSchedulerRef.current) {
      basicSchedulerRef.current.destroy();
      basicSchedulerRef.current = null;
    }
    if (advancedSchedulerRef.current) {
      advancedSchedulerRef.current.destroy();
      advancedSchedulerRef.current = null;
    }
    if (serviceWorkerSchedulerRef.current) {
      serviceWorkerSchedulerRef.current.destroy();
      serviceWorkerSchedulerRef.current = null;
    }

    // Mark as not initialized during setup
    schedulersInitializedRef.current = false;

    // Initialize the schedulers
    if (!useAdvancedScheduler) {
      console.log("Initializing BasicEventScheduler...");
      basicSchedulerRef.current = new BasicEventScheduler(
        handleBasicEventTriggered
      );
      console.log("BasicEventScheduler initialized");
    } else {
      console.log("Initializing AdvancedEventScheduler...");
      advancedSchedulerRef.current = new AdvancedEventScheduler(
        handleAdvancedEventTriggered
      );
      console.log(
        "AdvancedEventScheduler created (initialization may still be in progress)"
      );
    }

    if (useServiceWorker) {
      serviceWorkerSchedulerRef.current = new ServiceWorkerScheduler(
        handleServiceWorkerEventTriggered
      );
    }

    // Request notification permission
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission().then((permission) => {
        setNotifications(permission === "granted");
      });
    }

    // Mark schedulers as initialized
    schedulersInitializedRef.current = true;

    console.log("EventScheduler initialized with:", {
      useAdvancedScheduler,
      useServiceWorker,
      hasOnAllEventsUpdated: !!onAllEventsUpdated,
    });

    // Cleanup function
    return () => {
      schedulersInitializedRef.current = false;
      if (basicSchedulerRef.current) {
        basicSchedulerRef.current.destroy();
      }
      if (advancedSchedulerRef.current) {
        advancedSchedulerRef.current.destroy();
      }
      if (serviceWorkerSchedulerRef.current) {
        serviceWorkerSchedulerRef.current.destroy();
      }
    };
  }, [
    useAdvancedScheduler,
    useServiceWorker,
    handleBasicEventTriggered,
    handleAdvancedEventTriggered,
    handleServiceWorkerEventTriggered,
    onAllEventsUpdated,
  ]); // Don't include loadEvents to avoid circular deps

  // Load events after initialization
  useEffect(() => {
    if (schedulersInitializedRef.current) {
      loadEvents(true); // Mark as initial load
    }
  }, [loadEvents]); // This effect only triggers when loadEvents changes

  // Load events and set up refresh (separate from initialization)
  useEffect(() => {
    // Create stable references to loadEvents to avoid recreating interval
    const handleRefreshEvents = () => {
      console.log("Refreshing events after timer completion");
      if (schedulersInitializedRef.current) {
        loadEvents(false); // Not an initial load
      }
    };

    // Set up periodic refresh to keep events current
    const refreshInterval = setInterval(() => {
      if (schedulersInitializedRef.current) {
        loadEvents(false); // Not an initial load
      }
    }, 30000); // Refresh every 30 seconds

    window.addEventListener("refreshScheduledEvents", handleRefreshEvents);

    // Cleanup
    return () => {
      window.removeEventListener("refreshScheduledEvents", handleRefreshEvents);
      clearInterval(refreshInterval);
    };
  }, [loadEvents]); // Include loadEvents dependency

  // Handle form submit
  const handleScheduleEvent = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission

    // Initialize audio on first user interaction
    await AudioAlert.initializeAudio();

    if (!formData.name.trim()) {
      alert("Please enter an event name");
      return;
    }

    if (!formData.date || !formData.time) {
      alert("Please select a date and time");
      return;
    }

    // Images are now optional - no validation required

    try {
      const dateTime = new Date(`${formData.date}T${formData.time}`);

      if (dateTime <= new Date()) {
        alert("Please select a future date and time");
        return;
      }

      console.log("Scheduling event:", {
        name: formData.name,
        timestamp: dateTime.getTime(),
        image: capturedImage ? "captured" : "none",
      });

      setIsScheduling(true);

      // Convert base64 to blob for the scheduler
      const imageBlob = capturedImage
        ? await base64ToBlob(capturedImage)
        : undefined;

      if (useAdvancedScheduler && advancedSchedulerRef.current) {
        console.log("Adding event to AdvancedEventScheduler...");
        try {
          // Use advanced scheduler with IndexedDB
          // Add the event with the image blob (if available) - let the scheduler handle image storage internally
          await advancedSchedulerRef.current.addEvent(
            dateTime,
            formData.name,
            imageBlob
          );
          console.log("Event added to AdvancedEventScheduler successfully");
        } catch (error) {
          console.error(
            "Failed to add event to AdvancedEventScheduler:",
            error
          );
          // Fallback to basic scheduler
          if (basicSchedulerRef.current) {
            console.log("Falling back to BasicEventScheduler...");
            basicSchedulerRef.current.addEvent(
              dateTime,
              formData.name,
              capturedImage || ""
            );
            console.log("Event added to BasicEventScheduler as fallback");
          } else {
            alert("Failed to schedule event. Please try again.");
            setIsScheduling(false);
            return;
          }
        }
      } else if (basicSchedulerRef.current) {
        console.log("Adding event to BasicEventScheduler...");
        // Use basic scheduler with localStorage
        basicSchedulerRef.current.addEvent(
          dateTime,
          formData.name,
          capturedImage || ""
        );
        console.log("Event added to BasicEventScheduler successfully");
      }

      // Also schedule with service worker if enabled
      if (useServiceWorker && serviceWorkerSchedulerRef.current) {
        await serviceWorkerSchedulerRef.current.scheduleEvent(
          dateTime,
          formData.name,
          capturedImage || ""
        );
      }

      // Reset form
      setFormData({
        name: "",
        date: new Date().toISOString().split("T")[0],
        time: new Date().toTimeString().slice(0, 5),
      });
      setCapturedImage(null);
      setShowCamera(false); // Refresh events list
      console.log("Calling loadEvents after scheduling...");
      await loadEvents(false);
      console.log("loadEvents completed after scheduling");

      // Immediately notify about the upcoming event without waiting for loadEvents to complete
      if (onUpcomingEventRef.current && dateTime.getTime() > Date.now()) {
        onUpcomingEventRef.current(
          formData.name,
          capturedImage || "",
          dateTime.getTime()
        );
      }

      // Hide scheduler
      if (onHideScheduler) {
        onHideScheduler();
      } else {
        setShowSchedulerInternal(false);
      }

      alert(
        `Event "${formData.name}" scheduled for ${dateTime.toLocaleString()}`
      );
    } catch (error) {
      console.error("Error scheduling event:", error);
      alert("Failed to schedule event. Please try again.");
    } finally {
      setIsScheduling(false);
    }
  };

  // Helper function to convert base64 to blob
  const base64ToBlob = async (base64: string): Promise<Blob> => {
    const response = await fetch(base64);
    return response.blob();
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle image capture from camera
  const handleImageCapture = (imageSrc: string) => {
    setCapturedImage(imageSrc);
    setShowCamera(false);
  };

  // Listen for refresh events request
  const schedulerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleRefreshEvents = () => {
      loadEvents(false);
    };

    const element = schedulerRef.current;
    if (element) {
      element.addEventListener("refreshEvents", handleRefreshEvents);

      return () => {
        element.removeEventListener("refreshEvents", handleRefreshEvents);
      };
    }
  }, [loadEvents]);

  return (
    <div className="event-scheduler" ref={schedulerRef}>
      {/* Toggle scheduler button - only show when not controlled externally */}
      {onHideScheduler === undefined && (
        <button
          className="toggle-scheduler-btn"
          onClick={() => setShowSchedulerInternal(!showSchedulerInternal)}
        >
          {showSchedulerInternal ? "Hide Scheduler" : "Schedule Events"}
        </button>
      )}

      {/* Scheduler modal - use external or internal state */}
      {(showScheduler || showSchedulerInternal) && (
        <div
          className="scheduler-modal-backdrop"
          onClick={(e) => {
            // Only close if clicked on backdrop, not modal content
            if (e.target === e.currentTarget) {
              if (onHideScheduler) {
                onHideScheduler();
              } else {
                setShowSchedulerInternal(false);
              }
              setCapturedImage(null);
            }
          }}
        >
          <div className="scheduler-modal">
            {/* Camera modal inside scheduler modal */}
            {showCamera && (
              <div className="camera-overlay">
                <CameraCapture
                  onCapture={handleImageCapture}
                  onClose={() => setShowCamera(false)}
                />
              </div>
            )}

            <div className="scheduler-modal-header">
              <h3>Schedule a New Event</h3>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => {
                  if (onHideScheduler) {
                    onHideScheduler();
                  } else {
                    setShowSchedulerInternal(false);
                  }
                  setCapturedImage(null);
                }}
              >
                ×
              </button>
            </div>

            <div className="scheduler-panel">
              <form onSubmit={handleScheduleEvent}>
                <div className="form-group">
                  <label htmlFor="event-name">Event Name:</label>
                  <input
                    id="event-name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., School Time, Bedtime"
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="event-date">Date:</label>
                    <input
                      id="event-date"
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="event-time">Time:</label>
                    <input
                      id="event-time"
                      type="time"
                      name="time"
                      value={formData.time}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Event Image (Optional):</label>
                  <button
                    type="button"
                    className="camera-btn"
                    onClick={() => setShowCamera(true)}
                  >
                    {capturedImage ? "Retake Photo" : "Take Photo (Optional)"}
                  </button>
                </div>

                {capturedImage && (
                  <div className="image-preview">
                    <img src={capturedImage} alt="Captured" />
                    <button
                      type="button"
                      className="retake-photo-btn"
                      onClick={() => setShowCamera(true)}
                    >
                      Retake Photo
                    </button>
                    <button
                      type="button"
                      className="remove-photo-btn"
                      onClick={() => setCapturedImage(null)}
                    >
                      Remove Photo
                    </button>
                  </div>
                )}

                <div className="form-actions">
                  <div className="audio-controls">
                    <label className="audio-checkbox">
                      <input
                        type="checkbox"
                        checked={AudioAlert.isEnabled()}
                        onChange={(e) =>
                          AudioAlert.setAudioEnabled(e.target.checked)
                        }
                      />
                      Enable Alert Sound
                    </label>
                    <button
                      type="button"
                      className="test-audio-btn"
                      onClick={async () => {
                        await AudioAlert.initializeAudio();
                        await AudioAlert.playNotificationSound();
                      }}
                    >
                      Test Alert
                    </button>
                  </div>
                  <button
                    type="submit"
                    className="schedule-btn"
                    disabled={
                      !formData.name.trim() ||
                      !formData.date ||
                      !formData.time ||
                      isScheduling
                    }
                  >
                    {isScheduling ? "Scheduling..." : "Schedule Event"}
                  </button>
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => {
                      if (onHideScheduler) {
                        onHideScheduler();
                      } else {
                        setShowSchedulerInternal(false);
                      }
                      setCapturedImage(null);
                    }}
                  >
                    Cancel
                  </button>{" "}
                </div>
              </form>

              {/* Notification permission */}
              {!notifications && (
                <div className="notification-permission">
                  <p>
                    Enable notifications to receive alerts for scheduled events.
                  </p>
                  <button
                    onClick={() => {
                      Notification.requestPermission().then((permission) => {
                        setNotifications(permission === "granted");
                      });
                    }}
                  >
                    Enable Notifications
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventSchedulerComponent;
