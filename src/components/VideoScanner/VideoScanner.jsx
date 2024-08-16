import React, { useRef, useEffect, useState } from "react";
import jsQR from "jsqr";
import "./VideoScanner.css";

function VideoScanner({ onQRCodeScanned }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    if (!scanning) return;

    const video = videoRef.current;
    const canvasElement = canvasRef.current;
    const canvas = canvasElement.getContext("2d");

    // Set up the video stream
    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: "environment",
        },
      })
      .then((stream) => {
        video.srcObject = stream;
        video.setAttribute("playsinline", true);
        video.play();
        requestAnimationFrame(scanQR);
      });

    function scanQR() {
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
          setScanning(false); // Stop scanning when a QR code is found
          onQRCodeScanned(code);
        } else {
          requestAnimationFrame(scanQR);
        }
      } else {
        requestAnimationFrame(scanQR);
      }
    }

    return () => {
      // Clean up: stop the video stream and animation frame
      const stream = video.srcObject;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      setScanning(false);
    };
  }, [scanning, onQRCodeScanned]);

  return (
    <div
      id="scanner"
      style={{
        display: scanning ? "flex" : "none",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        height: "100vh",
      }}
    >
      {scanning && (
        <>
          <video ref={videoRef} width="640" height="480" />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </>
      )}
    </div>
  );
}

export default VideoScanner;
