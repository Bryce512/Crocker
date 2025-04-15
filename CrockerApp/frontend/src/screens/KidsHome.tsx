import { useState, useEffect, useRef } from "react";
import CircleCountDown from "../components/CircleCountDown";
import CountDown from "../components/Timer";
import CameraCapture from "../components/CameraCapture";
import "../styles/KidsHome.css";

function KidsHome() {
  const [showCompleted, setShowCompleted] = useState(false);
  const [eventName, setEventName] = useState("");
  const [timerDuration, setTimerDuration] = useState(3); // Default 3 minutes
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [pausedTimeRemaining, setPausedTimeRemaining] = useState<number | null>(
    null
  );
  const [showDropdown, setShowDropdown] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  // Calculate endTime only when timer is running
  const endTime = startTime
    ? isPaused && pausedTimeRemaining
      ? Date.now() + pausedTimeRemaining
      : startTime + timerDuration * 60 * 1000
    : null;

  // Get window width for responsive size
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Ref for dropdown menu (to detect clicks outside)
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    window.addEventListener("resize", handleResize);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleComplete = () => {
    setShowCompleted(true);
    setIsTimerRunning(false);
    setIsPaused(false);
  };

  const startTimer = () => {
    setStartTime(Date.now());
    setShowCompleted(false);
    setIsTimerRunning(true);
    setIsPaused(false);
    setShowDropdown(false);
  };

  const pauseTimer = () => {
    if (endTime) {
      setPausedTimeRemaining(endTime - Date.now());
      setIsPaused(true);
      setShowDropdown(false);
    }
  };

  const resumeTimer = () => {
    if (pausedTimeRemaining) {
      setStartTime(
        Date.now() - (timerDuration * 60 * 1000 - pausedTimeRemaining)
      );
      setIsPaused(false);
      setPausedTimeRemaining(null);
      setShowDropdown(false);
    }
  };

  const stopTimer = () => {
    setIsTimerRunning(false);
    setIsPaused(false);
    setStartTime(null);
    setPausedTimeRemaining(null);
    setShowDropdown(false);
  };

  // Calculate circle size based on screen width (70% of width, max 300px)
  const circleSize = Math.min(windowWidth * 0.7, 300);

  const buttonStyles = {
    padding: "12px 25px",
    fontSize: "16px",
    backgroundColor: "#73C3EB",
    color: "#2B335E",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
    marginBottom: "30px",
  };

  // Add this function to determine which image to show:
  const getImageForEvent = (name: string) => {
    const lowerCaseName = name.toLowerCase();

    if (lowerCaseName.includes("school") || lowerCaseName.includes("class")) {
      return "https://cdn-icons-png.flaticon.com/512/8074/8074794.png";
    } else if (
      lowerCaseName.includes("bed") ||
      lowerCaseName.includes("sleep")
    ) {
      return "https://cdn-icons-png.flaticon.com/512/3094/3094837.png";
    } else if (
      lowerCaseName.includes("play") ||
      lowerCaseName.includes("toy")
    ) {
      return "https://cdn-icons-png.flaticon.com/512/2163/2163318.png";
    } else {
      return "https://cdn-icons-png.flaticon.com/512/3239/3239945.png"; // Default clock icon
    }
  };

  // Handle image capture
  const handleImageCapture = (imageSrc: string) => {
    setCapturedImage(imageSrc);
    setShowCamera(false);
  };

  // Function to get image (prioritize captured image)
  const getImageForTimer = () => {
    if (capturedImage) {
      return capturedImage;
    }
    return getImageForEvent(eventName);
  };

  return (
    <div className="kids-home-container">
      {showCamera && (
        <CameraCapture
          onCapture={handleImageCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      {showCompleted ? (
        <div style={{ marginTop: "40px" }}>
          <h1
            style={{ fontSize: "36px", marginBottom: "20px", color: "#2B335E" }}
          >
            Time for...
          </h1>
          <p style={{ fontSize: "48px", fontWeight: "bold", color: "#2B335E" }}>
            {eventName || "All Done!"}
          </p>
          <button
            onClick={() => {
              setShowCompleted(false);
              setIsTimerRunning(false);
              setStartTime(null);
              setIsPaused(false);
            }}
            style={{ ...buttonStyles, marginTop: "30px" }}
          >
            New Timer
          </button>
        </div>
      ) : (
        <>
          {/* Only show input fields when timer is NOT running */}
          {!isTimerRunning ? (
            <div className="setup-container">
              <input
                type="text"
                placeholder="Time for... (eg. School, Play)"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                className="input-field"
              />

              <select
                value={timerDuration}
                onChange={(e) => setTimerDuration(Number(e.target.value))}
                className="select-field"
              >
                <option value={0.0833}>5 sec</option>
                <option value={3}>3 min</option>
                <option value={5}>5 min</option>
                <option value={10}>10 min</option>
              </select>

              {/* Start button is now always visible */}
              <button onClick={startTimer} className="start-button">
                Start Timer
              </button>

              {/* Show preview if image is captured */}
              {capturedImage && (
                <div className="image-preview">
                  <img src={capturedImage} alt="Captured" />
                </div>
              )}

              {/* Camera button now appears after start button */}
              <button
                onClick={() => setShowCamera(true)}
                className="camera-button"
              >
                {capturedImage ? "Change Photo" : "Take Photo"}
              </button>
            </div>
          ) : (
            <div className="timer-control" ref={dropdownRef}>
              <button
                className="control-button"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                {isPaused ? "Timer Paused" : "Timer Controls"}
              </button>

              {showDropdown && (
                <div className="dropdown-menu">
                  {isPaused ? (
                    <div className="dropdown-item start" onClick={resumeTimer}>
                      Resume
                    </div>
                  ) : (
                    <div className="dropdown-item pause" onClick={pauseTimer}>
                      Pause
                    </div>
                  )}
                  <div className="dropdown-item stop" onClick={stopTimer}>
                    Stop
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Display event name when timer is running */}
          {isTimerRunning && eventName && (
            <h2
              style={{
                fontSize: "32px",
                marginBottom: "20px",
                color: "#2B335E",
              }}
            >
              {eventName}
            </h2>
          )}

          {/* Only render timers when timer is running */}
          {isTimerRunning && endTime && (
            <>
              <div>
                <CountDown
                  date={endTime}
                  onComplete={handleComplete}
                  isPaused={isPaused}
                />
              </div>
              <br />
              <div>
                <CircleCountDown
                  time={(endTime - Date.now()) / 1000}
                  size={circleSize}
                  stroke={"#61C9A8"}
                  strokeWidth={Math.max(8, circleSize * 0.08)}
                  onComplete={handleComplete}
                  imageUrl={getImageForTimer()} // Use the new function here
                  isPaused={isPaused}
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default KidsHome;
