import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Import service worker registration utility
import { register as registerServiceWorker } from './utils/serviceWorkerRegistration';

// Dynamic import of key2svg.js for avatar generation
const loadExternalDependencies = async () => {
  try {
    // Load key2svg.js for avatar generation if not already loaded
    if (!window.generateSVG) {
      try {
        const svgScript = document.createElement('script');
        svgScript.src = '/static/key2svg.js';
        svgScript.type = 'module';
        document.body.appendChild(svgScript);
        
        // Wait for script to load
        await new Promise(resolve => {
          svgScript.onload = resolve;
        });
        
        console.log('key2svg.js script loaded');
      } catch (error) {
        console.warn('Failed to load key2svg.js:', error);
      }
    }
  } catch (error) {
    console.error('Error loading external dependencies:', error);
  }
};

// Load external dependencies before rendering the app
loadExternalDependencies().then(() => {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

// Register service worker for offline support and caching
registerServiceWorker();