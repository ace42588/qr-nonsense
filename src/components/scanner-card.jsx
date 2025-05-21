import { useRef, useState } from "react";

import jsQR from "jsqr";


export function ScannerCard() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [scanning, setScanning] = useState(false);
}
