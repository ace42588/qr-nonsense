import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import "./styles/index.css";
import { createRoot } from 'react-dom/client';
const container = document.getElementById('root');
const root = createRoot(container);

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
