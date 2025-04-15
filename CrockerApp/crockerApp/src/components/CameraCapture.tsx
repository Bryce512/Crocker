import { useState, useRef, useEffect } from "react";
import "../styles/CameraCapture.css";

interface CameraCaptureProps {
  onCapture: (imageSrc: string) => void;
  onClose: () => void;
}

const CameraCapture = ({ onCapture, onClose }: CameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsStreaming(true);
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setErrorMessage("Unable to access camera. Please allow camera access.");
      }
    };

    startCamera();

    return () => {
      // Clean up: stop all video streams when component unmounts
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        const tracks = stream.getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, []);

  const capturePhoto = () => {
    if (canvasRef.current && videoRef.current && isStreaming) {
      const canvas = canvasRef.current;
      const video = videoRef.current;

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw the current video frame on the canvas
      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert canvas to data URL
        const imageDataUrl = canvas.toDataURL("image/png");

        // Send the image back to parent component
        onCapture(imageDataUrl);

        // Stop all video streams
        const stream = video.srcObject as MediaStream;
        const tracks = stream.getTracks();
        tracks.forEach((track) => track.stop());
      }
    }
  };

  return (
    <div className="camera-modal">
      <div className="camera-container">
        <button className="close-button" onClick={onClose}>
          &times;
        </button>

        {errorMessage ? (
          <div className="error-message">{errorMessage}</div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="camera-preview"
              onCanPlay={() => setIsStreaming(true)}
            />

            <canvas ref={canvasRef} style={{ display: "none" }} />

            <div className="camera-controls">
              <button
                className="capture-button"
                onClick={capturePhoto}
                disabled={!isStreaming}
              >
                Take Photo
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CameraCapture;
