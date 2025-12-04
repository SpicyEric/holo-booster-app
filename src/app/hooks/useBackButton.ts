import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

/**
 * Hook to handle Android back button in Capacitor app
 * Prevents app from closing, navigates within app instead
 */
export const useBackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only set up listener on native platforms
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const handleBackButton = async () => {
      const currentPath = location.pathname;
      
      // Main swipeable pages - don't go back, stay on page
      const mainPages = ['/app', '/app/messages', '/app/stores', '/app/profile'];
      
      if (mainPages.includes(currentPath)) {
        // On main pages, do nothing or go to home
        if (currentPath !== '/app') {
          navigate('/app', { replace: true });
        }
        // If already on home, do nothing (don't close app)
        return;
      }
      
      // On detail pages, go back
      if (currentPath.startsWith('/app/')) {
        navigate(-1);
        return;
      }
      
      // Auth page - do nothing
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
};

export default useBackButton;
