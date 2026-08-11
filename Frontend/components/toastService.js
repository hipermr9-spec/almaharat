const listeners = new Set();

export function notify(type, title, message, duration = 5000) {
  const payload = { type, title, message, duration };
  listeners.forEach((listener) => listener(payload));
}

export function subscribeToToast(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
