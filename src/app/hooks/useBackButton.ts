import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

/**
 * Hook to handle Android back button in Capacitor app
 * Navigates within app instead of closing, shows exit dialog on home
 */
export const useBackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showExitDialog, setShowExitDialog] = useState(false);

  useEffect(() => {
    // Only set up listener on native platforms
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const handleBackButton = async () => {
      const currentPath = location.pathname;
      
      console.log('Back button pressed on path:', currentPath);
      
      // Main swipeable pages - on home show exit dialog, otherwise go to home
      const mainPages = ['/app', '/app/messages', '/app/stores', '/app/profile'];
      
      if (mainPages.includes(currentPath)) {
        if (currentPath === '/app') {
          // On home page - show exit confirmation dialog
          setShowExitDialog(true);
        } else {
          // On other main pages - go to home
          navigate('/app', { replace: true });
        }
        return;
      }
      
      // Detail/settings pages - navigate back
      if (currentPath.startsWith('/app/')) {
        // Settings -> go to profile
        if (currentPath === '/app/settings') {
          navigate('/app/profile', { replace: true });
          return;
        }
        // History -> go to profile
        if (currentPath === '/app/history') {
          navigate('/app/profile', { replace: true });
          return;
        }
        // Suggest shop -> go to profile
        if (currentPath === '/app/suggest-shop') {
          navigate('/app/profile', { replace: true });
          return;
        }
        // My stamp cards -> go to profile
        if (currentPath === '/app/my-cards') {
          navigate('/app/profile', { replace: true });
          return;
        }
        // Terms/Privacy -> go to profile
        if (currentPath === '/app/terms' || currentPath === '/app/privacy') {
          navigate('/app/profile', { replace: true });
          return;
        }
        // Scan -> go to home
        if (currentPath === '/app/scan') {
          navigate('/app', { replace: true });
          return;
        }
        // Merchant detail -> go to stores
        if (currentPath.startsWith('/app/merchant/')) {
          navigate('/app/stores', { replace: true });
          return;
        }
        // Any other detail page -> go back
        navigate(-1);
        return;
      }
      
      // Auth page - don't do anything (don't close app)
      if (currentPath === '/app/auth') {
        return;
      }
    };

    // Register back button listener
    const listener = App.addListener('backButton', handleBackButton);

    return () => {
      listener.then(l => l.remove());
    };
  }, [navigate, location.pathname]);

  // Function to confirm exit
  const confirmExit = () => {
    App.exitApp();
  };

  // Function to cancel exit
  const cancelExit = () => {
    setShowExitDialog(false);
  };

  return { showExitDialog, confirmExit, cancelExit, setShowExitDialog };
};

export default useBackButton;
