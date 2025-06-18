import React, { useEffect, useState } from "react";

const StatusBarSpacer: React.FC = () => {
  const [statusBarHeight, setStatusBarHeight] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect if user is on mobile
    const userAgent =
      navigator.userAgent || navigator.vendor || (window as typeof window & { opera?: string }).opera;
    const mobileRegex =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    const isMobileDevice = mobileRegex.test(userAgent || "");

    setIsMobile(isMobileDevice);

    if (isMobileDevice) {
      if ((userAgent ?? "").includes("iPhone")) {
        // Check for notch-based iPhones
        if (window.screen.height >= 812 || window.screen.width >= 812) {
          setStatusBarHeight(47);
        } else {
          setStatusBarHeight(44);
        }
      } else if ((userAgent ?? "").includes("Android")) {
        setStatusBarHeight(24);
      } else {
        setStatusBarHeight(20); // Fallback for other mobile devices
      }
    } else {
      setStatusBarHeight(0); // No extra space needed for desktop
    }
  }, []);

  // Only render the spacer on mobile devices
  if (!isMobile) return null;

  return (
    <div
      style={{
        height: `${statusBarHeight}px`,
        width: "100%",
        backgroundColor: "#BBE8FF", // Match your app background
        position: "relative", // Changed from fixed to relative
        zIndex: 999,
      }}
    />
  );
};

export default StatusBarSpacer;
