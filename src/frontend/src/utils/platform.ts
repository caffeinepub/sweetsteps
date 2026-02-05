/**
 * Platform detection utility to identify Chrome on Android
 * Used to activate mobile-safe Internet Identity initiation paths
 */

export interface PlatformInfo {
  isChromeAndroid: boolean;
  userAgent: string;
  platform: string;
}

/**
 * Detects if the current browser is Chrome on Android
 * Avoids false positives from other browsers
 */
export function detectPlatform(): PlatformInfo {
  const userAgent = navigator.userAgent || '';
  const platform = navigator.platform || '';
  
  // Check for Android in user agent
  const isAndroid = /Android/i.test(userAgent);
  
  // Check for Chrome (but not Edge, Samsung Browser, or other Chrome-based browsers)
  const isChrome = /Chrome/i.test(userAgent) && 
                   !/Edg/i.test(userAgent) && 
                   !/SamsungBrowser/i.test(userAgent) &&
                   !/OPR/i.test(userAgent);
  
  const isChromeAndroid = isAndroid && isChrome;
  
  return {
    isChromeAndroid,
    userAgent,
    platform,
  };
}

/**
 * Check if we're on Chrome Android (cached for performance)
 */
let cachedPlatformInfo: PlatformInfo | null = null;

export function isChromeAndroid(): boolean {
  if (!cachedPlatformInfo) {
    cachedPlatformInfo = detectPlatform();
  }
  return cachedPlatformInfo.isChromeAndroid;
}

export function getPlatformInfo(): PlatformInfo {
  if (!cachedPlatformInfo) {
    cachedPlatformInfo = detectPlatform();
  }
  return cachedPlatformInfo;
}
