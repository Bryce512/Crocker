import { useState, useEffect } from 'react';
import '../styles/PWAInstallPrompt.css';

function PWAInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<Event & { prompt?: () => void; userChoice?: Promise<{ outcome: 'accepted' | 'dismissed' }> } | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setInstallPrompt(e);
      // Show the install button
      setShowPrompt(true);
    });
  }, []);

  const handleInstallClick = () => {
    if (!installPrompt) return;
    
    // Show the install prompt
    installPrompt.prompt?.();
    
    // Wait for the user to respond to the prompt
    installPrompt.userChoice?.then((choiceResult: { outcome: 'accepted' | 'dismissed' }) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      // Clear the saved prompt
      setInstallPrompt(null);
      setShowPrompt(false);
    });
  };

  if (!showPrompt) return null;

  return (
    <div className="install-prompt">
      <p>Install this app for a better experience!</p>
      <button onClick={handleInstallClick}>Install</button>
    </div>
  );
}

export default PWAInstallPrompt;