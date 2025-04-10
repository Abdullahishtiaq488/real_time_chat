export function log(...args: any[]) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}]`, ...args);
} 