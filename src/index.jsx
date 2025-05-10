import React from 'react';
import ReactDOM from 'react-dom';
import App from './app/App';
import "./assets/styles/index.css";
import { createRoot } from 'react-dom/client';
import sodium from "libsodium-wrappers";

await sodium.ready;

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
