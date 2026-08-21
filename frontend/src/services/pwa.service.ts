let deferredPrompt: any = null;
let isInstalled = false;

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (window.navigator as any).standalone === true
  );
}

if (typeof window !== 'undefined') {
  isInstalled = isStandalone();

  window.addEventListener('beforeinstallprompt', (event: any) => {
    event.preventDefault();
    if (!isInstalled) {
      deferredPrompt = event;
      window.dispatchEvent(new CustomEvent('pwa:installable'));
    }
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    isInstalled = true;
    window.dispatchEvent(new CustomEvent('pwa:installed'));
  });
}

export function getDeferredPrompt(): any {
  return deferredPrompt;
}

export function isPwaInstalled(): boolean {
  return isInstalled;
}

export function isPwaStandalone(): boolean {
  return isStandalone();
}
