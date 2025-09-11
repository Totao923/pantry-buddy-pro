import { useCallback } from 'react';

export type HapticIntensity = 'light' | 'medium' | 'heavy';
export type HapticPattern = number | number[];

export interface HapticConfig {
  enabled?: boolean; // Allow disabling haptic feedback
  fallbackPattern?: HapticPattern; // Fallback vibration pattern
}

export const useHaptic = (config: HapticConfig = {}) => {
  const { enabled = true, fallbackPattern } = config;

  // Check if haptic feedback is supported
  const isHapticSupported = useCallback(() => {
    return 'vibrate' in navigator && typeof navigator.vibrate === 'function';
  }, []);

  // Check if advanced haptic feedback is supported (iOS Safari)
  const isAdvancedHapticSupported = useCallback(() => {
    return (
      'hapticFeedback' in navigator ||
      // @ts-ignore - iOS Safari specific API
      (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function')
    );
  }, []);

  // Basic haptic feedback using standard vibration API
  const basicHaptic = useCallback(
    (pattern: HapticPattern) => {
      if (!enabled || !isHapticSupported()) return false;

      try {
        if (Array.isArray(pattern)) {
          navigator.vibrate(pattern);
        } else {
          navigator.vibrate(pattern);
        }
        return true;
      } catch (error) {
        console.warn('Haptic feedback failed:', error);
        return false;
      }
    },
    [enabled, isHapticSupported]
  );

  // Advanced haptic feedback for supported devices
  const advancedHaptic = useCallback(
    (type: string) => {
      if (!enabled) return false;

      try {
        // @ts-ignore - iOS Safari specific API
        if (window.navigator.hapticFeedback) {
          // @ts-ignore
          window.navigator.hapticFeedback.impact(type);
          return true;
        }

        // Fallback to basic vibration
        return false;
      } catch (error) {
        console.warn('Advanced haptic feedback failed:', error);
        return false;
      }
    },
    [enabled]
  );

  // Light haptic feedback (subtle notification)
  const light = useCallback(() => {
    if (!enabled) return;

    // Try advanced haptic first
    if (advancedHaptic('light')) return;

    // Fallback to basic vibration
    basicHaptic(fallbackPattern || 20);
  }, [enabled, advancedHaptic, basicHaptic, fallbackPattern]);

  // Medium haptic feedback (standard confirmation)
  const medium = useCallback(() => {
    if (!enabled) return;

    // Try advanced haptic first
    if (advancedHaptic('medium')) return;

    // Fallback to basic vibration
    basicHaptic(fallbackPattern || 40);
  }, [enabled, advancedHaptic, basicHaptic, fallbackPattern]);

  // Heavy haptic feedback (strong notification/error)
  const heavy = useCallback(() => {
    if (!enabled) return;

    // Try advanced haptic first
    if (advancedHaptic('heavy')) return;

    // Fallback to basic vibration
    basicHaptic(fallbackPattern || [50, 20, 50]);
  }, [enabled, advancedHaptic, basicHaptic, fallbackPattern]);

  // Success haptic pattern (double light tap)
  const success = useCallback(() => {
    if (!enabled) return;

    // Try advanced haptic first
    if (advancedHaptic('light')) {
      setTimeout(() => advancedHaptic('light'), 100);
      return;
    }

    // Fallback to basic vibration
    basicHaptic([30, 50, 30]);
  }, [enabled, advancedHaptic, basicHaptic]);

  // Error haptic pattern (three quick taps)
  const error = useCallback(() => {
    if (!enabled) return;

    // Try advanced haptic first
    if (advancedHaptic('heavy')) return;

    // Fallback to basic vibration
    basicHaptic([50, 30, 50, 30, 50]);
  }, [enabled, advancedHaptic, basicHaptic]);

  // Selection haptic (very light tap)
  const selection = useCallback(() => {
    if (!enabled) return;

    // Try advanced haptic first
    if (advancedHaptic('selection')) return;

    // Fallback to basic vibration
    basicHaptic(10);
  }, [enabled, advancedHaptic, basicHaptic]);

  // Custom pattern haptic
  const custom = useCallback(
    (pattern: HapticPattern) => {
      if (!enabled) return;

      basicHaptic(pattern);
    },
    [enabled, basicHaptic]
  );

  return {
    // Basic intensity levels
    light,
    medium,
    heavy,

    // Semantic haptic patterns
    success,
    error,
    selection,

    // Custom patterns
    custom,

    // Utility functions
    isSupported: isHapticSupported,
    isAdvancedSupported: isAdvancedHapticSupported,
  };
};
