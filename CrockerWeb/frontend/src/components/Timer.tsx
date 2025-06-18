import { FC, useEffect, useState } from "react";
import Countdown, { zeroPad } from "react-countdown";
import "../styles/Timer.css";

interface CountDownProps {
  date: number | Date;
  onComplete?: () => void;
  isPaused?: boolean;
}

// Completion component
const Completionist = () => <span className="timer-display">Complete!</span>;

const CountDown: FC<CountDownProps> = ({
  date,
  onComplete,
  isPaused = false,
}) => {
  // Store the time remaining when paused
  const [pausedAt, setPausedAt] = useState<number | null>(null);

  // When isPaused changes, store or use the paused time
  useEffect(() => {
    if (isPaused && !pausedAt) {
      // Store the current remaining time
      setPausedAt((date as number) - Date.now());
    } else if (!isPaused && pausedAt) {
      // Clear the paused time
      setPausedAt(null);
    }
  }, [isPaused, date, pausedAt]);

  // Renderer callback with condition
  const renderer = ({
    hours,
    minutes,
    seconds,
    completed,
  }: {
    hours: number;
    minutes: number;
    seconds: number;
    completed: boolean;
  }) => {
    if (completed) {
      // Render a completed state
      if (onComplete) onComplete();
      return <Completionist />;
    } else {
      // Render a countdown
      return (
        <div className="timer-container">
          <div className="timer-display">
            {zeroPad(hours)}:{zeroPad(minutes)}:{zeroPad(seconds)}
          </div>
        </div>
      );
    }
  };

  // If paused, we render with fixed values
  if (isPaused && pausedAt) {
    const totalSeconds = Math.floor(pausedAt / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return renderer({
      hours,
      minutes,
      seconds,
      completed: false,
    });
  }

  // Otherwise, use the normal countdown
  return <Countdown date={date} renderer={renderer} />;
};

export default CountDown;
