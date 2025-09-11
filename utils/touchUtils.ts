/**
 * Touch interaction utilities for mobile optimization
 */

// Minimum touch target size according to accessibility guidelines
export const MIN_TOUCH_TARGET = 44; // 44px minimum for accessibility

// Touch target size categories
export const TOUCH_SIZES = {
  small: 32,
  medium: 44,
  large: 56,
  xlarge: 72,
} as const;

export type TouchSize = keyof typeof TOUCH_SIZES;

/**
 * Generate CSS classes for touch-optimized elements
 */
export const getTouchClasses = (size: TouchSize = 'medium') => {
  const targetSize = TOUCH_SIZES[size];

  return {
    minHeight: `${targetSize}px`,
    minWidth: `${targetSize}px`,
    // Ensure proper touch area even if visual size is smaller
    padding: `${Math.max(8, (targetSize - 24) / 2)}px`,
    // Prevent text selection on touch
    userSelect: 'none' as const,
    // Optimize touch behavior
    touchAction: 'manipulation' as const,
    // Remove tap highlight on mobile
    WebkitTapHighlightColor: 'transparent',
  };
};

/**
 * Generate CSS classes for touch-optimized buttons
 */
export const getTouchButtonClasses = (size: TouchSize = 'medium') => {
  const baseClasses = getTouchClasses(size);

  return {
    ...baseClasses,
    // Center content
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    // Smooth interactions
    transition: 'all 0.2s ease-in-out',
    // Improve button feel
    cursor: 'pointer',
    // Active state for better feedback
    ':active': {
      transform: 'scale(0.97)',
    },
  };
};

/**
 * Spacing utilities for touch interfaces
 */
export const TOUCH_SPACING = {
  tight: 8, // Minimum spacing between touch targets
  normal: 16, // Standard spacing
  loose: 24, // Comfortable spacing for frequently used elements
  xlarge: 32, // Maximum spacing for primary actions
} as const;

export type TouchSpacing = keyof typeof TOUCH_SPACING;

/**
 * Get spacing value for touch interfaces
 */
export const getTouchSpacing = (spacing: TouchSpacing = 'normal') => {
  return TOUCH_SPACING[spacing];
};

/**
 * Check if device supports touch
 */
export const isTouchDevice = (): boolean => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

/**
 * Check if device is mobile (viewport-based)
 */
export const isMobileViewport = (): boolean => {
  return window.innerWidth <= 768; // Tailwind's md breakpoint
};

/**
 * Check if device is likely a mobile device (comprehensive)
 */
export const isMobileDevice = (): boolean => {
  return isTouchDevice() && isMobileViewport();
};

/**
 * Get optimal touch target size based on device and context
 */
export const getOptimalTouchSize = (
  context: 'primary' | 'secondary' | 'icon' | 'input' = 'secondary'
): TouchSize => {
  if (!isMobileDevice()) {
    return 'medium'; // Standard size for desktop
  }

  switch (context) {
    case 'primary':
      return 'large'; // Important actions need larger targets
    case 'secondary':
      return 'medium'; // Standard actions
    case 'icon':
      return 'medium'; // Icon buttons
    case 'input':
      return 'large'; // Form inputs need larger targets
    default:
      return 'medium';
  }
};

/**
 * Touch-optimized form input styles
 */
export const getTouchInputClasses = () => {
  const baseSize = getOptimalTouchSize('input');
  const targetSize = TOUCH_SIZES[baseSize];

  return {
    minHeight: `${targetSize}px`,
    padding: `${Math.max(12, (targetSize - 20) / 2)}px 16px`,
    fontSize: isMobileDevice() ? '16px' : '14px', // Prevent zoom on iOS
    // Improve touch behavior
    touchAction: 'manipulation' as const,
    // Remove default browser styling
    appearance: 'none' as const,
    WebkitAppearance: 'none' as const,
  };
};

/**
 * Gesture prevention utilities
 */
export const preventGestures = {
  // Prevent pull-to-refresh on specific elements
  noPullToRefresh: {
    overscrollBehavior: 'none' as const,
    touchAction: 'pan-x pan-y' as const,
  },

  // Prevent zoom on input focus (iOS)
  noZoom: {
    fontSize: '16px', // iOS won't zoom if font-size >= 16px
  },

  // Prevent text selection
  noSelect: {
    userSelect: 'none' as const,
    WebkitUserSelect: 'none' as const,
  },

  // Prevent context menu on long press
  noContextMenu: {
    WebkitTouchCallout: 'none' as const,
  },
};

/**
 * Animation utilities for touch interactions
 */
export const touchAnimations = {
  // Subtle press animation
  press: {
    transform: 'scale(0.97)',
    transition: 'transform 0.1s ease-out',
  },

  // Bounce animation for positive actions
  bounce: {
    animation: 'bounce 0.3s ease-in-out',
  },

  // Shake animation for errors
  shake: {
    animation: 'shake 0.3s ease-in-out',
  },

  // Pulse animation for loading states
  pulse: {
    animation: 'pulse 1.5s ease-in-out infinite',
  },
};

/**
 * CSS-in-JS keyframes for touch animations
 */
export const touchKeyframes = `
  @keyframes bounce {
    0%, 20%, 53%, 80%, 100% {
      transform: translateY(0);
    }
    40%, 43% {
      transform: translateY(-8px);
    }
    70% {
      transform: translateY(-4px);
    }
  }
  
  @keyframes shake {
    0%, 100% {
      transform: translateX(0);
    }
    10%, 30%, 50%, 70%, 90% {
      transform: translateX(-4px);
    }
    20%, 40%, 60%, 80% {
      transform: translateX(4px);
    }
  }
  
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }
`;

/**
 * Utility to combine touch classes with existing classes
 */
export const mergeTouchClasses = (
  existingClasses: string,
  touchClasses: Record<string, any>
): string => {
  // Convert touch style object to Tailwind-like classes
  const touchClassNames: string[] = [];

  Object.entries(touchClasses).forEach(([property, value]) => {
    switch (property) {
      case 'minHeight':
        if (value === '44px') touchClassNames.push('min-h-11');
        if (value === '56px') touchClassNames.push('min-h-14');
        break;
      case 'minWidth':
        if (value === '44px') touchClassNames.push('min-w-11');
        if (value === '56px') touchClassNames.push('min-w-14');
        break;
      case 'userSelect':
        if (value === 'none') touchClassNames.push('select-none');
        break;
      case 'touchAction':
        if (value === 'manipulation') touchClassNames.push('touch-manipulation');
        break;
      // Add more mappings as needed
    }
  });

  return [existingClasses, ...touchClassNames].filter(Boolean).join(' ');
};
