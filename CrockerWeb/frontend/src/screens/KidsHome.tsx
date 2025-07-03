import { useState, useEffect, useRef, useCallback } from "react";
import CircleCountDown from "../components/CircleCountDown";
import StatusBarSpacer from "../components/statusBarSpacer";
import PWAInstallPrompt from "../components/PWAInstallPrompt";
import EventSchedulerComponent from "../components/EventSchedulerComponent";
import { EventNotification } from "../services/EventScheduler";
import "../styles/KidsHome.css";

function KidsHome() {
  // Add audio reference
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isMobile, setIsMobile] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);

  // New state for next scheduled event
  const [nextEvent, setNextEvent] = useState<{
    name: string;
    image: string;
    timestamp: number;
  } | null>(null);

  // State for all events (past, current, future)
  const [allEvents, setAllEvents] = useState<{
    past: EventNotification[];
    future: EventNotification[];
  }>({ past: [], future: [] });

  // State for current active event (when timer goes off)
  const [currentEvent, setCurrentEvent] = useState<{
    name: string;
    image: string;
    timestamp: number;
  } | null>(null);

  // Get window width for responsive size
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    // Initialize audio object
    audioRef.current = new Audio("/sounds/Drops_Sound.mp3");

    // Restore current active event from localStorage if it exists and is recent
    const storedCurrentEvent = localStorage.getItem("currentActiveEvent");
    if (storedCurrentEvent) {
      try {
        const parsed = JSON.parse(storedCurrentEvent);
        const timeSinceStart = Date.now() - parsed.startTime;
        // Only restore if it's been less than 30 seconds since the event started
        if (timeSinceStart < 30000) {
          setCurrentEvent({
            name: parsed.name,
            image: parsed.image,
            timestamp: parsed.timestamp,
          });

          // Set up auto-clear for remaining time
          const remainingTime = 30000 - timeSinceStart;
          setTimeout(() => {
            setCurrentEvent(null);
            localStorage.removeItem("currentActiveEvent");
          }, remainingTime);
        } else {
          // Remove expired event
          localStorage.removeItem("currentActiveEvent");
        }
      } catch (error) {
        console.error("Error parsing stored current event:", error);
        localStorage.removeItem("currentActiveEvent");
      }
    }

    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    // Check if user is on mobile
    const userAgent =
      navigator.userAgent ||
      navigator.vendor ||
      ("opera" in window ? (window as { opera?: string }).opera : undefined);
    const mobileRegex =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    setIsMobile(mobileRegex.test(userAgent || ""));

    window.addEventListener("resize", handleResize);

    return () => {
      // Clean up the audio when component unmounts
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Add this to ensure iOS can play audio
  useEffect(() => {
    // Enable audio for iOS
    const enableIOSAudio = () => {
      // Create and play a silent audio when user interacts
      const silentAudio = new Audio("/sounds/silent.mp3");
      silentAudio
        .play()
        .catch((error) => console.log("Silent audio error:", error));

      // Remove event listener after first interaction
      document.removeEventListener("touchstart", enableIOSAudio);
    };

    document.addEventListener("touchstart", enableIOSAudio);

    return () => {
      document.removeEventListener("touchstart", enableIOSAudio);
    };
  }, []);

  const toggleMute = () => {
    setIsMuted((prevMuted) => !prevMuted);
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
  };

  const playCompleteSound = useCallback(() => {
    if (audioRef.current && !isMuted) {
      audioRef.current.currentTime = 0; // Reset to beginning

      // Try to play and handle potential errors (like autoplay restrictions)
      const playPromise = audioRef.current.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // Audio started playing successfully
            console.log("Alarm sound started playing");

            // Add event listener for when audio ends
            const handleAudioEnd = () => {
              console.log("Alarm sound finished playing, refreshing page...");
              // Remove the event listener
              audioRef.current?.removeEventListener("ended", handleAudioEnd);

              // Refresh the page after audio finishes
              setTimeout(() => {
                window.location.reload();
              }, 500); // Small delay to ensure cleanup
            };

            audioRef.current?.addEventListener("ended", handleAudioEnd);
          })
          .catch((error) => {
            console.log("Audio play error:", error);
            // If audio fails, still refresh after a delay
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          });
      } else {
        // Fallback: if no promise returned, refresh after estimated audio duration
        setTimeout(() => {
          window.location.reload();
        }, 3000); // Adjust based on your audio file length
      }
    } else {
      // If muted or no audio, still refresh the page
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  }, [isMuted]);

  // Calculate circle size based on screen width (70% of width, max 300px)
  const circleSize = Math.min(windowWidth * 0.7, 300);

  // const buttonStyles = {
  //   padding: "12px 25px",
  //   fontSize: "16px",
  //   backgroundColor: "#73C3EB",
  //   color: "#2B335E",
  //   border: "none",
  //   borderRadius: "8px",
  //   cursor: "pointer",
  //   fontWeight: "bold",
  //   marginBottom: "30px",
  // };

  // Add this function to determine which image to show:
  // const getImageForEvent = (name: string) => {
  //   const lowerCaseName = name.toLowerCase();

  //   if (lowerCaseName.includes("school") || lowerCaseName.includes("class")) {
  //     return "https://cdn-icons-png.flaticon.com/512/8074/8074794.png";
  //   } else if (
  //     lowerCaseName.includes("bed") ||
  //     lowerCaseName.includes("sleep")
  //   ) {
  //     return "https://cdn-icons-png.flaticon.com/512/3094/3094837.png";
  //   } else if (
  //     lowerCaseName.includes("play") ||
  //     lowerCaseName.includes("toy")
  //   ) {
  //     return "https://cdn-icons-png.flaticon.com/512/2163/2163318.png";
  //   } else {
  //     return "https://cdn-icons-png.flaticon.com/512/3239/3239945.png"; // Default clock icon
  //   }
  // };

  // Scheduled events handler - memoized to avoid re-renders
  const handleScheduledEvent = useCallback(
    (eventName: string, imagePath: string) => {
      // Set the current event when timer goes off or when restoring from DB
      const newCurrentEvent = {
        name: eventName,
        image: imagePath,
        timestamp: Date.now(),
      };

      setCurrentEvent(newCurrentEvent);

      // Store current event in localStorage for persistence across reloads
      localStorage.setItem(
        "currentActiveEvent",
        JSON.stringify({
          ...newCurrentEvent,
          startTime: Date.now(),
        })
      );

      // Clear the next event since it's now current
      setNextEvent(null);

      // Auto-clear current event after 30 seconds
      setTimeout(() => {
        setCurrentEvent(null);
        localStorage.removeItem("currentActiveEvent");
      }, 30000);

      // Play sound when a scheduled event is triggered (but not when restoring)
      if (nextEvent && nextEvent.name === eventName) {
        playCompleteSound();
      }

      // Refresh events list immediately after completion
      setTimeout(() => {
        // Trigger a refresh of the events
        window.dispatchEvent(new CustomEvent("refreshScheduledEvents"));
      }, 1000);
    },
    [playCompleteSound, nextEvent]
  );

  // Handle upcoming events from scheduler - memoized to avoid re-renders
  const handleUpcomingEvent = useCallback(
    (name: string, image: string, timestamp: number) => {
      // Only update if the timestamp is in the future
      if (timestamp > Date.now()) {
        // Always update the next event, even if a current task is showing
        setNextEvent({
          name,
          image,
          timestamp,
        });
      }
    },
    []
  );

  // Handle all events update from scheduler (past and future)
  const handleAllEventsUpdate = useCallback(
    (pastEvents: EventNotification[], futureEvents: EventNotification[]) => {
      console.log("KidsHome received all events update:", {
        pastCount: pastEvents.length,
        futureCount: futureEvents.length,
        pastEvents: pastEvents.map((e) => ({
          timestamp: e.timestamp,
          events: e.events.map((ev) => ev.name),
        })),
        futureEvents: futureEvents.map((e) => ({
          timestamp: e.timestamp,
          events: e.events.map((ev) => ev.name),
        })),
      });
      setAllEvents({ past: pastEvents, future: futureEvents });
    },
    []
  );

  // Handle upcoming events update from scheduler - memoized to avoid re-renders (kept for compatibility)
  const handleEventsUpdate = useCallback((events: EventNotification[]) => {
    // This is kept for compatibility but we now primarily use allEvents
    console.log("Legacy upcoming events updated:", events.length);
  }, []);

  // Format event time for display
  const formatEventTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow =
      date.toDateString() ===
      new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();

    if (isToday) {
      return `Today at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    } else if (isTomorrow) {
      return `Tomorrow at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    } else {
      return date.toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  };

  return (
    <div className="page-container">
      {isMobile && <StatusBarSpacer />}
      <PWAInstallPrompt />
      <div
        className="kids-home-container"
        style={{
          paddingTop: isMobile
            ? "calc(env(safe-area-inset-top, 44px) + 20px)"
            : "20px", // Regular padding for desktop/laptop
        }}
      >
        {/* Header with sound and add event buttons */}
        <div className="header-buttons">
          <button onClick={toggleMute} className="sound-button">
            {isMuted ? "🔇" : "🔊"}
          </button>
          <button
            className="add-event-btn"
            onClick={() => setShowScheduler(true)}
            title="Add Event"
          >
            +
          </button>
        </div>

        {/* Main content with scrollable sections */}
        <div className="main-content">
          {/* Past Events Section */}
          {allEvents.past.length > 0 && (
            <div className="past-events-section">
              <div className="events-list">
                {allEvents.past
                  // Filter out notifications more than 24 hours in the future (if that's the intent)
                  .filter(
                    (notification) =>
                      notification.timestamp >= Date.now() - 24 * 60 * 60 * 1000
                  )
                  .map((notification) => (
                    <div
                      key={`past-notification-${notification.timestamp}`}
                      className="event-item past-event"
                    >
                      <div className="event-time">
                        {formatEventTime(notification.timestamp)}
                      </div>
                      {notification.events.map((event, eventIndex) => (
                        <div
                          key={`past-event-${notification.timestamp}-${eventIndex}`}
                          className="event-details"
                        >
                          {event.image ? (
                            <img
                              src={event.image}
                              alt={event.name}
                              className="event-image"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                              }}
                            />
                          ) : (
                            <div className="event-no-image">
                              <span className="event-icon">✅</span>
                            </div>
                          )}
                          <div className="event-name">{event.name}</div>
                        </div>
                      ))}
                    </div>
                  ))}
              </div>
              <h3>Past Events</h3>
            </div>
          )}

          {/* Current Event Section - Prominent Display */}
          {currentEvent && (
            <div className="current-event-section-main">
              <h2 className="current-event-title">🎉 Current Activity</h2>
              <div className="current-event-content">
                <p className="current-event-name">{currentEvent.name}</p>
                {currentEvent.image && (
                  <div className="current-event-image">
                    <img
                      src={currentEvent.image}
                      alt={currentEvent.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Next Event Timer Section - Prominent Display */}
          {nextEvent && nextEvent.timestamp > Date.now() && (
            <div className="next-event-section-main">
              <h2 className="next-event-title">Next Up</h2>
              <div className="next-event-content">
                <p className="next-event-name">{nextEvent.name}</p>
                <div className="next-event-time">
                  {new Date(nextEvent.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                <div className="next-event-countdown">
                  <CircleCountDown
                    time={(nextEvent.timestamp - Date.now()) / 1000}
                    size={circleSize}
                    stroke={"#61C9A8"}
                    strokeWidth={Math.max(8, circleSize * 0.08)}
                    imageUrl={nextEvent.image}
                    isPaused={false}
                    onComplete={() =>
                      handleScheduledEvent(nextEvent.name, nextEvent.image)
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {!nextEvent && !currentEvent && (
            <div className="no-events-message">
              <h2>No scheduled events</h2>
              <p>Tap the + button to schedule your first event</p>
            </div>
          )}

          {/* Future Events Section */}
          {allEvents.future.length > 0 && (
            <div className="future-events-section">
              <h3>Upcoming Events</h3>
              <div className="events-list">
                {allEvents.future.map((notification) => (
                  <div
                    key={`future-notification-${notification.timestamp}`}
                    className="event-item future-event"
                  >
                    <div className="event-time">
                      {formatEventTime(notification.timestamp)}
                    </div>
                    {notification.events.map((event, eventIndex) => (
                      <div
                        key={`future-event-${notification.timestamp}-${eventIndex}`}
                        className="event-details"
                      >
                        {event.image ? (
                          <img
                            src={event.image}
                            alt={event.name}
                            className="event-image"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        ) : (
                          <div className="event-no-image">
                            <span className="event-icon">📅</span>
                          </div>
                        )}
                        <div className="event-name">{event.name}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Event Scheduler Component */}
        <EventSchedulerComponent
          onEventTriggered={handleScheduledEvent}
          onUpcomingEvent={handleUpcomingEvent}
          onEventsUpdated={handleEventsUpdate}
          onAllEventsUpdated={handleAllEventsUpdate}
          useAdvancedScheduler={true}
          useServiceWorker={true}
          showScheduler={showScheduler}
          onHideScheduler={() => setShowScheduler(false)}
        />
      </div>
    </div>
  );
}

export default KidsHome;
