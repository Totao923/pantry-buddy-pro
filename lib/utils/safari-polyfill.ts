/**
 * Safari Polyfills and Compatibility fixes
 */

// Check if running in Safari
export const isSafari = () => {
  if (typeof window === 'undefined') return false;
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
};

// Polyfill for CSS features that Safari might not support
export const applySafariPolyfills = () => {
  if (typeof window === 'undefined' || !isSafari()) return;

  // Add Safari-specific class to body for CSS targeting
  document.body.classList.add('safari');

  // Fix for backdrop-filter issues in older Safari
  const safariVersion = getSafariVersion();
  if (safariVersion && safariVersion < 14) {
    document.body.classList.add('safari-old');
  }

  // Fix for CSS Grid issues in older Safari
  if (safariVersion && safariVersion < 12) {
    document.body.classList.add('safari-legacy');
  }
};

// Get Safari version
const getSafariVersion = (): number | null => {
  if (typeof window === 'undefined') return null;

  const match = navigator.userAgent.match(/Version\/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
};

// Initialize polyfills when DOM is ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applySafariPolyfills);
  } else {
    applySafariPolyfills();
  }
}
