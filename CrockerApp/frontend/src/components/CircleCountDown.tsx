import { useEffect, useState, FC, useRef } from "react";
import "../styles/CircleCountDown.css";

interface CircleCountDownProps {
  time: number;
  size: number;
  stroke: string;
  strokeWidth: number;
  onComplete?: VoidFunction;
  strokeLinecap?: "butt" | "round" | "square" | "inherit" | undefined;
  imageUrl?: string;
  isPaused?: boolean;
}

const CircleCountDown: FC<CircleCountDownProps> = ({
  time,
  size,
  stroke,
  onComplete,
  strokeWidth,
  strokeLinecap = "round",
  imageUrl,
  isPaused = false,
}) => {
  const radius = size / 2;
  const milliseconds = time * 1000;
  const circumference = size * Math.PI;

  // Store initial time for circle calculation
  const [initialTime] = useState(time);

  // Keep track of the end time
  const [endTime, setEndTime] = useState(Date.now() + milliseconds);

  // Keep track of remaining time
  const [remaining, setRemaining] = useState(milliseconds);

  // Store paused remaining time
  const [pausedRemaining, setPausedRemaining] = useState<number | null>(null);

  // Keep track of the interval
  const intervalRef = useRef<number | null>(null);

  // Calculate the stroke dash offset based on remaining time
  const getStrokeDashoffset = () => {
    // If paused, use the stored paused remaining time
    const timeToUse =
      isPaused && pausedRemaining !== null
        ? pausedRemaining / 1000
        : remaining / 1000;

    // Calculate percentage completed
    const percentComplete = timeToUse / initialTime;

    // Return the stroke dash offset
    return circumference - percentComplete * circumference;
  };

  const strokeDashoffset = getStrokeDashoffset();

  // Handle pausing and resuming
  useEffect(() => {
    if (isPaused) {
      // Store current remaining time
      setPausedRemaining(remaining);

      // Clear the interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    } else {
      // If we have a paused value, use it to recalculate the end time
      if (pausedRemaining !== null) {
        setEndTime(Date.now() + pausedRemaining);
        setPausedRemaining(null);
      }

      // Start a new interval if one isn't running
      if (!intervalRef.current) {
        intervalRef.current = window.setInterval(() => {
          const now = Date.now();
          const newRemaining = Math.max(0, endTime - now);

          setRemaining(newRemaining);

          if (newRemaining <= 0) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            if (onComplete) {
              onComplete();
            }
          }
        }, 10);
      }
    }

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPaused, endTime, onComplete, pausedRemaining]);

  return (
    <div className="root">
      {imageUrl && (
        <div className="image-container">
          <img src={imageUrl} alt="Timer" className="timer-image" />
        </div>
      )}
      <div className="countDownContainer">
        <svg className="svg" width={size} height={size}>
          <circle
            fill="none"
            r={radius}
            cx={radius}
            cy={radius}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap={strokeLinecap}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
      </div>
    </div>
  );
};

export default CircleCountDown;
