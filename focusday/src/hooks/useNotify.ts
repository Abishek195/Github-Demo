/** Local-only alerts: a soft WebAudio chime + a browser Notification (if permitted). */

export function requestNotificationPermission(): void {
  if ('Notification' in window && Notification.permission === 'default') {
    void Notification.requestPermission();
  }
}

export function playChime(): void {
  try {
    const Ctx = window.AudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.15, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 1);
    });
    setTimeout(() => void ctx.close(), 1600);
  } catch {
    // Audio is a nicety; ignore failures (autoplay policies etc.).
  }
}

export function notify(title: string, body: string): void {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, { body, silent: true });
    } catch {
      // Some browsers disallow the constructor (e.g. Android Chrome); the in-app prompt still shows.
    }
  }
}
