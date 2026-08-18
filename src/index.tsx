import React from 'react';
import { createRoot } from 'react-dom/client';
import sodium from 'libsodium-wrappers-sumo';
import App from './app/App';
import { log } from './lib/logger';
import { installBrowserPipelineRunner } from './adapters/browser/workers';
import './index.css';

async function main(): Promise<void> {
  await sodium.ready;
  installBrowserPipelineRunner();

  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Root element not found');

  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

main().catch((error) => {
  log.error('Failed to initialize application', error);
}); 