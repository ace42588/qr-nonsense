import React from 'react';
import ReactDOM from 'react-dom';
import App from './app/App';
import "./index.css";
import { createRoot } from 'react-dom/client';
import sodium from "libsodium-wrappers-sumo";

async function main() {
  await sodium.ready;

  const root = createRoot(document.getElementById("root"));
  root.render(<App />);
}

main();
