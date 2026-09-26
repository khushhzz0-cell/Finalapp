/**
 * Utility to strictly lock the mobile viewport at 1.0x zoom.
 * Prevents:
 * 1. Pinch-to-zoom (Safari gesture events & multi-touch touchmove)
 * 2. Input focus auto-zoom on iOS Safari (inputs < 16px)
 * 3. Double-tap to zoom (via CSS touch-action: manipulation and gesture guards)
 * 4. Desktop trackpad pinch-to-zoom (wheel events with ctrlKey)
 */
export function lockViewportZoom(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // 1. Prevent iOS Safari pinch gesture events
  const preventGesture = (e: Event) => {
    e.preventDefault();
  };

  document.addEventListener('gesturestart', preventGesture, { passive: false });
  document.addEventListener('gesturechange', preventGesture, { passive: false });
  document.addEventListener('gestureend', preventGesture, { passive: false });

  // 2. Prevent multi-touch pinch zoom
  document.addEventListener(
    'touchstart',
    (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    },
    { passive: false }
  );

  // 3. Double-tap zoom guard:
  // Note: We use touch-action: manipulation in CSS to eliminate double-tap zoom natively.
  // We only prevent default on pure double-taps on background areas to avoid any zoom triggers,
  // and NEVER artificially force focus on inputs during gesture swipes!
  let lastTapTime = 0;
  let startX = 0;
  let startY = 0;

  document.addEventListener(
    'touchstart',
    (e: TouchEvent) => {
      if (e.touches.length === 1) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      }
    },
    { passive: true }
  );

  document.addEventListener(
    'touchend',
    (e: TouchEvent) => {
      const now = Date.now();
      const timeSinceLast = now - lastTapTime;

      // Only check if it was a stationary tap (not a swipe)
      const touch = e.changedTouches[0];
      const moveDistance = touch
        ? Math.hypot(touch.clientX - startX, touch.clientY - startY)
        : 0;

      if (timeSinceLast < 280 && timeSinceLast > 0 && moveDistance < 10) {
        const target = e.target as HTMLElement | null;
        const tagName = target?.tagName.toLowerCase();
        // If double tapping on non-interactive text/body, prevent browser zoom
        if (tagName !== 'input' && tagName !== 'textarea' && tagName !== 'select' && tagName !== 'button') {
          e.preventDefault();
        }
      }
      lastTapTime = now;
    },
    { passive: false }
  );

  // 4. Prevent desktop / trackpad Ctrl + Wheel zoom
  document.addEventListener(
    'wheel',
    (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    },
    { passive: false }
  );

  // 5. Visual viewport safety lock for iOS keyboard blur
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      if (window.visualViewport && window.visualViewport.scale !== 1) {
        window.scrollTo(0, 0);
      }
    });
  }

  // When input blurs, ensure page has not shifted
  document.addEventListener('focusout', (e: FocusEvent) => {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
      window.scrollTo(0, 0);
      document.body.scrollTop = 0;
    }
  });
}
