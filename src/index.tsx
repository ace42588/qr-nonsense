import React from 'react';
import { createRoot } from 'react-dom/client';
import sodium from 'libsodium-wrappers-sumo';
import App from './app/App';
import './index.css';

async function main(): Promise<void> {
  await sodium.ready;

  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Root element not found');

  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

main().catch(console.error); 