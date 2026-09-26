// Registro del service worker y utilidades PWA.

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

let waitingWorker: ServiceWorker | null = null;

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  if (!import.meta.env.PROD) return; // en dev no interferimos con HMR

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // Detecta un SW en espera y ofrece recargar para actualizar.
        if (registration.waiting) {
          waitingWorker = registration.waiting;
        }
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              waitingWorker = installing;
              window.dispatchEvent(new CustomEvent('simplepos:pwa-update'));
            }
          });
        });
      })
      .catch(() => {
        /* sin SW la app funciona online igualmente */
      });
  });
}

/** Aplica la versión en espera del SW (recarga la página). */
export function applyPwaUpdate(): void {
  waitingWorker?.postMessage({ type: 'SKIP_WAITING' });
  window.location.reload();
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

export function initInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new CustomEvent('simplepos:pwa-installable'));
  });
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) return 'unavailable';
  await deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return choice.outcome;
}
