// React
import React, { useRef, useEffect, useState } from "react";

// State/Context
import { useInputDispatch } from "@/state/inputs/InputContext";
import { setInputs } from "@/state/inputs/inputActions";
import { inputsFromScan } from "@/domain/input/scanToInputs";

import { decodeScanFrameOffthread } from "@/adapters/browser/workers/jobs";
import { ScanFrameGate } from "@/adapters/browser/workers/latestWins";

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Camera, RefreshCw } from "lucide-react";

function cameraErrorMessage(err) {
  if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
    return "Camera permission denied. Please allow camera access in your browser settings and try again.";
  }
  if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
    return "No camera found. Please ensure a camera is connected and try again.";
  }
  if (err.name === "NotReadableError" || err.name === "TrackStartError") {
    return "Camera is already in use by another application. Please close other applications using the camera and try again.";
  }
  if (err.name === "OverconstrainedError" || err.name === "ConstraintNotSatisfiedError") {
    return "Camera does not support the required settings. Please try a different camera.";
  }
  if (err.name === "AbortError") {
    return "Camera access was aborted. Please try again.";
  }
  return err.message || "Failed to access camera.";
}

export function ScannerCard() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const scanningRef = useRef(true);
  const startIdRef = useRef(0);
  const decodeGateRef = useRef(new ScanFrameGate());

  const [scanning, setScanning] = useState(true);
  const [error, setError] = useState(null);
  const [scanComplete, setScanComplete] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const dispatch = useInputDispatch();

  const stopStream = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
    }
  };

  const scanQR = () => {
    if (!scanningRef.current) return;

    const video = videoRef.current;
    const canvasElement = canvasRef.current;
    if (!video || !canvasElement) {
      rafRef.current = requestAnimationFrame(scanQR);
      return;
    }

    const canvas = canvasElement.getContext("2d", { willReadFrequently: true });
    if (!canvas) {
      rafRef.current = requestAnimationFrame(scanQR);
      return;
    }

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      if (!decodeGateRef.current.tryBegin()) {
        rafRef.current = requestAnimationFrame(scanQR);
        return;
      }
      canvasElement.height = video.videoHeight;
      canvasElement.width = video.videoWidth;
      canvas.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
      const imageData = canvas.getImageData(
        0,
        0,
        canvasElement.width,
        canvasElement.height
      );
      void decodeScanFrameOffthread(imageData)
        .then((code) => {
          if (!scanningRef.current) return;
          if (code && code.data !== "") {
            scanningRef.current = false;
            setScanning(false);
            stopStream();

            const inputs = inputsFromScan(code);
            if (inputs.length === 0) {
              setError("QR code detected but contained no usable data.");
              return;
            }

            const formatInfo = code.formatInfo || {};
            dispatch(
              setInputs({
                formatInfo: {
                  errorCorrectionLevel: formatInfo.errorCorrectionLevel ?? 0,
                  dataMask: formatInfo.dataMask ?? -1,
                  version: code.version ?? -1,
                },
                inputs,
                activeInputID: inputs[0].id,
              })
            );
            setScanComplete(true);
          }
        })
        .catch(() => {
          /* keep scanning */
        })
        .finally(() => {
          decodeGateRef.current.end();
        });
    }

    rafRef.current = requestAnimationFrame(scanQR);
  };

  const startScanning = async () => {
    const startId = ++startIdRef.current;
    setError(null);
    setScanComplete(false);
    setIsLoading(true);
    scanningRef.current = true;
    setScanning(true);
    stopStream();

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Camera access is not supported in this browser. Please use a modern browser with camera support."
        );
      }

      let devices;
      try {
        devices = await navigator.mediaDevices.enumerateDevices();
      } catch (enumError) {
        console.warn("Device enumeration failed, attempting direct camera access:", enumError);
      }

      if (
        devices &&
        !devices.some((device) => device.kind === "videoinput")
      ) {
        throw new Error("No camera found on this device. Please connect a camera and try again.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
        },
      });

      // Strict Mode remount / newer start superseded this attempt
      if (startId !== startIdRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      // Wait briefly if the video node has not committed yet
      let video = videoRef.current;
      if (!video) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        video = videoRef.current;
      }
      if (startId !== startIdRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      if (!video) {
        throw new Error("Video element not found. Please refresh the page.");
      }

      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      video.muted = true;

      const waitForPlayback = () =>
        new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(
              new Error(
                "Video stream timeout - camera may be in use by another application"
              )
            );
          }, 10000);

          const finish = () => {
            clearTimeout(timeout);
            video.play().then(resolve).catch(reject);
          };

          if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
            finish();
            return;
          }

          video.onloadedmetadata = finish;
          video.onerror = () => {
            clearTimeout(timeout);
            reject(new Error("Failed to load video stream"));
          };
        });

      await waitForPlayback();

      if (startId !== startIdRef.current) return;

      setIsLoading(false);
      setRetryCount(0);
      rafRef.current = requestAnimationFrame(scanQR);
    } catch (err) {
      if (startId !== startIdRef.current) return;
      console.error("Camera access error:", err);
      setIsLoading(false);
      setError(cameraErrorMessage(err));
      scanningRef.current = false;
      setScanning(false);
      stopStream();
    }
  };

  const handleRetry = () => {
    if (retryCount >= 3) {
      setError(
        "Maximum retry attempts reached. Please refresh the page and check your camera permissions."
      );
      return;
    }
    setRetryCount((prev) => prev + 1);
    startScanning();
  };

  const handleScanAgain = () => {
    setRetryCount(0);
    startScanning();
  };

  useEffect(() => {
    startScanning();
    return () => {
      // Invalidate in-flight starts (React Strict Mode remount)
      startIdRef.current += 1;
      scanningRef.current = false;
      stopStream();
    };
    // Mount/unmount only — retries call startScanning directly
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          QR Code Scanner
        </CardTitle>
        <CardDescription>
          Camera frames stay in your browser and are never uploaded.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative aspect-square w-full max-w-md mx-auto">
          <video
            ref={videoRef}
            className={`absolute inset-0 w-full h-full object-cover rounded-lg ${
              error || scanComplete || isLoading ? "opacity-0" : "opacity-100"
            }`}
            playsInline
            muted
            aria-label="Live camera preview for QR scanning"
          />
          <canvas ref={canvasRef} className="hidden" />

          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-4">
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
          ) : scanComplete ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-4">
              <p className="text-sm text-muted-foreground text-center">
                QR code scanned. Inputs are updated in the sidebar — switch to
                manual input to edit them.
              </p>
              <Button onClick={handleScanAgain} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Scan again
              </Button>
            </div>
          ) : (
            <>
              {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="text-sm text-muted-foreground">Initializing camera...</p>
                </div>
              )}
              {scanning && !isLoading && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-2 border-primary rounded-lg animate-pulse" />
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
