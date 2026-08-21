import { useState, useEffect } from 'react';
import { getDeferredPrompt, isPwaStandalone } from '../services/pwa.service';

const InstallAppButton = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isPwaStandalone()) {
      return;
    }

    if (getDeferredPrompt()) {
      setVisible(true);
    }

    const handleInstallable = () => {
      if (getDeferredPrompt() && !isPwaStandalone()) {
        setVisible(true);
      }
    };

    const handleInstalled = () => {
      setVisible(false);
    };

    window.addEventListener('pwa:installable', handleInstallable);
    window.addEventListener('pwa:installed', handleInstalled);

    return () => {
      window.removeEventListener('pwa:installable', handleInstallable);
      window.removeEventListener('pwa:installed', handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    const prompt = getDeferredPrompt();
    if (!prompt) return;

    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;

      if (outcome === 'accepted') {
        setVisible(false);
      }
    } catch (error) {
      console.error('Install prompt failed:', error);
    }
  };

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={handleInstall}
      className="install-app-button"
      aria-label="Install Staff Tracker Geo"
    >
      Install App
    </button>
  );
};

export default InstallAppButton;
