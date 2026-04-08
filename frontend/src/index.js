import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './global.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Suppress noisy extension errors (e.g. MetaMask / other in-page scripts)
// These often cause unhandled promise rejections like:
// "Could not establish connection. Receiving end does not exist."
// We only suppress known-extension messages so real app errors still surface.
window.addEventListener('unhandledrejection', (e) => {
  const reason = e.reason;
  const msg = reason && (reason.message || (typeof reason === 'string' ? reason : String(reason)));
  if (msg && (msg.includes('Could not establish connection') || msg.includes('Receiving end does not exist') || msg.includes('in-page.js'))) {
    e.preventDefault();
    // keep a lightweight log for debugging
    // eslint-disable-next-line no-console
    console.warn('Suppressed extension unhandled rejection:', msg);
  }
});

window.addEventListener('error', (e) => {
  const src = e.filename || '';
  if (src.includes('in-page.js') || src.includes('enum.') || src.includes('index.DRTaNfek.js')) {
    e.preventDefault();
    // eslint-disable-next-line no-console
    console.warn('Suppressed extension error from', src, e.message);
  }
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
