// React
import React, { useRef, useEffect, useState } from "react";

// State/Context
import { useInputDispatch } from "@/state/inputs/InputContext";
import { setInputs } from "@/state/inputs/inputActions";
import { generateId } from "@/domain/qr/utils/id";

// External Libraries
import jsQR from "jsqr";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Camera, RefreshCw } from "lucide-react";

export function ScannerCard() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [scanning, setScanning] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useInputDispatch();

  const startScanning = async () => {
    setError(null);
    setIsLoading(true);
    setScanning(true);
    
    try {
      // First check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          "Camera access is not supported in this browser. Please use a modern browser with camera support."
        );
      }

      // Try to enumerate devices first to ensure we have camera access
      let devices;
      try {
        devices = await navigator.mediaDevices.enumerateDevices();
      } catch (enumError) {
        // If enumeration fails, we might still be able to access the camera
        console.warn("Device enumeration failed, attempting direct camera access:", enumError);
      }
      
      const hasCamera = devices 
        ? devices.some(device => device.kind === 'videoinput')
        : true; // Assume camera exists if enumeration fails

      if (devices && !hasCamera) {
        throw new Error("No camera found on this device. Please connect a camera and try again.");
      }

      // Request camera access with more specific constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
        }
      });
      
      const video = videoRef.current;
      if (!video) {
        throw new Error("Video element not found");
      }

      video.srcObject = stream;
      video.setAttribute("playsinline", true);
      
      // Wait for video to be ready
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Video stream timeout - camera may be in use by another application"));
        }, 10000); // 10 second timeout

        video.onloadedmetadata = () => {
          clearTimeout(timeout);
          video.play()
            .then(() => {
              setIsLoading(false);
              resolve(undefined);
            })
            .catch(reject);
        };
        video.onerror = () => {
          clearTimeout(timeout);
          reject(new Error("Failed to load video stream"));
        };
      });

      setRetryCount(0); // Reset retry count on success
      requestAnimationFrame(scanQR);
    } catch (err) {
      console.error("Camera access error:", err);
      setIsLoading(false);
      
      // Provide more helpful error messages
      let errorMessage = err.message || "Failed to access camera.";
      
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        errorMessage = "Camera permission denied. Please allow camera access in your browser settings and try again.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        errorMessage = "No camera found. Please ensure a camera is connected and try again.";
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        errorMessage = "Camera is already in use by another application. Please close other applications using the camera and try again.";
      } else if (err.name === "OverconstrainedError" || err.name === "ConstraintNotSatisfiedError") {
        errorMessage = "Camera does not support the required settings. Please try a different camera.";
      } else if (err.name === "AbortError") {
        errorMessage = "Camera access was aborted. Please try again.";
      }
      
      setError(errorMessage);
      setScanning(false);
    }
  };

  const handleRetry = () => {
    if (retryCount < 3) {
      setRetryCount(prev => prev + 1);
      startScanning();
    } else {
      setError("Maximum retry attempts reached. Please refresh the page and check your camera permissions.");
    }
  };

  useEffect(() => {
    if (!scanning) return;
    startScanning();

    return () => {
      const video = videoRef.current;
      if (video?.srcObject) {
        video.srcObject.getTracks().forEach((track) => track.stop());
      }
      setScanning(false);
    };
  }, [scanning]);

  function scanQR() {
    const video = videoRef.current;
    const canvasElement = canvasRef.current;
    const canvas = canvasElement.getContext("2d");

    if (video.readyState === video.HAVE_ENOUGH_DATA && scanning) {
      canvasElement.height = video.videoHeight;
      canvasElement.width = video.videoWidth;
      canvas.drawImage(
        video,
        0,
        0,
        canvasElement.width,
        canvasElement.height
      );
      const imageData = canvas.getImageData(
        0,
        0,
        canvasElement.width,
        canvasElement.height
      );
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code && code.data !== "") {
        setScanning(false);
        // QR code scanned successfully - data is processed below
        
        // Extract the relevant information from the QR code
        const { formatInfo, chunks, version } = code;
        
        // Create inputs from chunks
        const inputs = chunks.map(chunk => ({
          id: generateId(),
          data: chunk.text,
          mode: chunk.type,
        }));
        
        // Structure the data for the state
        const inputData = {
          formatInfo: {
            errorCorrectionLevel: formatInfo.errorCorrectionLevel,
            dataMask: formatInfo.dataMask,
            version
          },
          inputs
        };
        
        dispatch(setInputs(inputData));
      } else {
        requestAnimationFrame(scanQR);
      }
    } else {
      requestAnimationFrame(scanQR);
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          QR Code Scanner
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="flex flex-col items-center gap-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p>{error}</p>
                  {retryCount > 0 && (
                    <p className="text-sm opacity-90">
                      Retry attempt: {retryCount} of 3
                    </p>
                  )}
                  <div className="text-sm mt-2 space-y-1">
                    <p className="font-semibold">Troubleshooting tips:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Check browser permissions for camera access</li>
                      <li>Ensure no other applications are using the camera</li>
                      <li>Try refreshing the page</li>
                      <li>Use a device with a working camera</li>
                    </ul>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
            <Button 
              onClick={handleRetry} 
              className="gap-2"
              disabled={retryCount >= 3}
            >
              <RefreshCw className="h-4 w-4" />
              {retryCount >= 3 ? "Max Retries Reached" : "Retry"}
            </Button>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center gap-4 p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Initializing camera...</p>
          </div>
        ) : (
          <div className="relative aspect-square w-full max-w-md mx-auto">
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover rounded-lg"
              playsInline
            />
            <canvas ref={canvasRef} className="hidden" />
            {scanning && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-primary rounded-lg animate-pulse" />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}