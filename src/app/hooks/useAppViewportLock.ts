import { useEffect } from 'react';

/**
 * Locks viewport scrolling/rubber-banding on native app screens
 * so fixed headers/bottom nav stay visually stable.
 */
export const useAppViewportLock = () => {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const previousHtmlStyles = {
      overflow: html.style.overflow,
      overscrollBehavior: html.style.overscrollBehavior,
      touchAction: html.style.touchAction,
    };

    const previousBodyStyles = {
      overflow: body.style.overflow,
      overscrollBehavior: body.style.overscrollBehavior,
      touchAction: body.style.touchAction,
    };

    html.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    html.style.touchAction = 'pan-y';

    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';
    body.style.touchAction = 'pan-y';

    return () => {
      html.style.overflow = previousHtmlStyles.overflow;
      html.style.overscrollBehavior = previousHtmlStyles.overscrollBehavior;
      html.style.touchAction = previousHtmlStyles.touchAction;

      body.style.overflow = previousBodyStyles.overflow;
      body.style.overscrollBehavior = previousBodyStyles.overscrollBehavior;
      body.style.touchAction = previousBodyStyles.touchAction;
    };
  }, []);
};

export default useAppViewportLock;
