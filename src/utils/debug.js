/**
 * VMU Debug Logger
 * Utility to track application state and diagnose crashes during development.
 */

const DEBUG_ENABLED = true; // Set to false to silence all logs

export const log = (category, message, data = null) => {
  if (!DEBUG_ENABLED) return;
  const timestamp = new Date().toLocaleTimeString();
  const prefix = `[VMU-${category.toUpperCase()}] ${timestamp}:`;
  
  if (data) {
    console.log(`%c${prefix}`, 'color: #00e5ff; font-weight: bold;', message, data);
  } else {
    console.log(`%c${prefix}`, 'color: #00e5ff; font-weight: bold;', message);
  }
};

export const warn = (category, message, data = null) => {
  if (!DEBUG_ENABLED) return;
  const timestamp = new Date().toLocaleTimeString();
  const prefix = `[VMU-WARN-${category.toUpperCase()}] ${timestamp}:`;
  console.warn(prefix, message, data || '');
};

export const error = (category, message, err = null) => {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = `[VMU-ERROR-${category.toUpperCase()}] ${timestamp}:`;
  console.error(prefix, message, err || '');
};
