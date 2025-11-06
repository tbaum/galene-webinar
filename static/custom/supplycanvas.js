/**
 * SupplyCanvas Webinar - Custom Galene Behavior
 *
 * This script customizes the Galene videoconference interface behavior:
 * - Detects user permission level (observe vs present)
 * - Adds CSS class to body for permission-based styling
 * - Hides participant list for viewers (observe permission)
 * - Presenters see full interface
 * - Persists JWT token across browser restarts (localStorage)
 * - Prevents camera/microphone requests for observers
 *
 * Maintainability: This script hooks into Galene's public API (serverConnection).
 * When updating Galene, verify that the API hasn't changed.
 */

(function() {
  'use strict';

  console.log('[SupplyCanvas] Customization script loaded');

  /**
   * Token Persistence
   * Store JWT token in localStorage to survive browser restarts
   */
  const TOKEN_STORAGE_KEY = 'galene_jwt_token';

  /**
   * Extract token from URL and store in localStorage
   */
  function captureAndStoreToken() {
    console.log('[SupplyCanvas] captureAndStoreToken() called');
    const urlParams = new URLSearchParams(window.location.search);
    console.log('[SupplyCanvas] URL parameters parsed:', urlParams.toString());
    const urlToken = urlParams.get('token');
    console.log('[SupplyCanvas] Token from URL:', urlToken ? 'FOUND (length: ' + urlToken.length + ')' : 'NOT FOUND');

    if (urlToken) {
      console.log('[SupplyCanvas] Storing JWT token in localStorage...');
      localStorage.setItem(TOKEN_STORAGE_KEY, urlToken);
      console.log('[SupplyCanvas] Token stored successfully');
      return urlToken;
    }

    console.log('[SupplyCanvas] No token in URL to capture');
    return null;
  }

  /**
   * Restore token from localStorage
   * This runs before Galene initializes
   */
  function restoreTokenFromStorage() {
    console.log('[SupplyCanvas] restoreTokenFromStorage() called');
    console.log('[SupplyCanvas] Reading from localStorage key:', TOKEN_STORAGE_KEY);
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    console.log('[SupplyCanvas] Stored token:', storedToken ? 'FOUND (length: ' + storedToken.length + ')' : 'NOT FOUND');

    if (storedToken) {
      console.log('[SupplyCanvas] Injecting token into URL for Galene auto-login...');

      // Inject token back into URL search params
      // Galene reads from URLSearchParams, not window.token
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('token', storedToken);

      console.log('[SupplyCanvas] Replacing URL with token parameter...');
      // Replace current URL with token (no page reload, just changes window.location.search)
      window.history.replaceState(null, '', currentUrl.toString());

      console.log('[SupplyCanvas] New URL:', window.location.href);
      console.log('[SupplyCanvas] Token injected successfully');

      return storedToken;
    }

    console.log('[SupplyCanvas] No token in localStorage to restore');
    return null;
  }

  /**
   * Clear stored token on disconnect/logout
   */
  function clearStoredToken() {
    console.log('[SupplyCanvas] Clearing stored JWT token');
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    window.token = null;
  }

  /**
   * Initialize token persistence
   * This runs immediately when script loads (BEFORE galene.js)
   */
  (function initTokenPersistence() {
    console.log('[SupplyCanvas] === Token Persistence Init ===');
    console.log('[SupplyCanvas] Initial URL:', window.location.href);
    console.log('[SupplyCanvas] Initial search params:', window.location.search);

    // First, try to restore token from localStorage and inject into URL
    // This must happen BEFORE Galene reads the URL
    const restoredToken = restoreTokenFromStorage();
    console.log('[SupplyCanvas] Restored token from storage:', restoredToken ? 'YES (' + restoredToken.substring(0, 20) + '...)' : 'NO');

    // Then capture any new token from URL (will override stored token)
    const capturedToken = captureAndStoreToken();
    console.log('[SupplyCanvas] Captured token from URL:', capturedToken ? 'YES (' + capturedToken.substring(0, 20) + '...)' : 'NO');

    // Check final state
    const storedValue = localStorage.getItem(TOKEN_STORAGE_KEY);
    console.log('[SupplyCanvas] localStorage current value:', storedValue ? 'EXISTS (' + storedValue.substring(0, 20) + '...)' : 'EMPTY');

    // Check final URL (should have token if restored)
    console.log('[SupplyCanvas] Final URL search params:', window.location.search);
    const finalUrlToken = new URLSearchParams(window.location.search).get('token');
    console.log('[SupplyCanvas] Token in URL for Galene:', finalUrlToken ? 'PRESENT (length: ' + finalUrlToken.length + ')' : 'NOT PRESENT');

    if (capturedToken) {
      console.log('[SupplyCanvas] ✓ Using token from URL (first login)');
    } else if (restoredToken) {
      console.log('[SupplyCanvas] ✓ Token restored to URL from localStorage (page refresh)');
    } else {
      console.log('[SupplyCanvas] ✗ No JWT token found - user must login');
    }
    console.log('[SupplyCanvas] === End Token Persistence Init ===');
    console.log('[SupplyCanvas] Galene will now initialize and read token from URL...');
  })();

  /**
   * Monitor connection state to clear token on disconnect
   */
  function monitorConnectionState() {
    // Check if serverConnection exists and monitor close events
    const checkInterval = setInterval(function() {
      if (typeof serverConnection !== 'undefined' && serverConnection) {
        // Hook into close event if available
        if (serverConnection.socket) {
          const originalClose = serverConnection.socket.onclose;
          serverConnection.socket.onclose = function(event) {
            // Check if this is an intentional disconnect (not network error)
            if (event.code === 1000) {
              // Normal closure - clear token
              clearStoredToken();
            }
            // Call original handler if it exists
            if (originalClose) {
              originalClose.call(this, event);
            }
          };
          clearInterval(checkInterval);
        }
      }
    }, 500);

    // Stop checking after 10 seconds
    setTimeout(function() {
      clearInterval(checkInterval);
    }, 10000);
  }

  // Start monitoring connection state
  monitorConnectionState();

  /**
   * Expose token management functions for debugging
   */
  window.supplyCanvasToken = {
    get: function() {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    },
    clear: clearStoredToken,
    restore: restoreTokenFromStorage
  };

  /**
   * Apply permission-based CSS class to body element
   */
  function applyPermissionClass() {
    // Check if serverConnection exists (Galene's global connection object)
    if (typeof serverConnection === 'undefined' || !serverConnection) {
      console.log('[SupplyCanvas] serverConnection not yet available, will retry...');
      return false;
    }

    // Get user permissions
    const permissions = serverConnection.permissions || [];
    console.log('[SupplyCanvas] User permissions:', permissions);

    // Remove any existing permission classes
    document.body.classList.remove('permission-observe', 'permission-present', 'permission-op');

    // Determine user role based on permissions
    if (permissions.includes('op')) {
      // Operator (moderator) - full access
      document.body.classList.add('permission-op');
      console.log('[SupplyCanvas] User role: Operator (full access)');
    } else if (permissions.includes('present')) {
      // Presenter - can share video/audio, see participants
      document.body.classList.add('permission-present');
      console.log('[SupplyCanvas] User role: Presenter (full access)');
    } else if (permissions.includes('observe')) {
      // Observer (viewer) - restricted UI
      document.body.classList.add('permission-observe');
      console.log('[SupplyCanvas] User role: Observer (restricted UI - no participant list, no chat)');
    } else {
      // Unknown/no permissions - default to observer
      document.body.classList.add('permission-observe');
      console.log('[SupplyCanvas] User role: Unknown (defaulting to observer)');
    }

    return true;
  }

  /**
   * Check if user is an observer (view-only, no media needed)
   */
  function isObserver() {
    if (typeof serverConnection === 'undefined' || !serverConnection) {
      return false;
    }
    const permissions = serverConnection.permissions || [];
    return permissions.includes('observe') &&
           !permissions.includes('present') &&
           !permissions.includes('op');
  }

  /**
   * Prevent media requests for observers
   * Observers don't need camera/microphone access
   */
  function preventObserverMediaRequests() {
    // Override navigator.mediaDevices.getUserMedia for observers
    const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);

    navigator.mediaDevices.getUserMedia = function(constraints) {
      if (isObserver()) {
        console.log('[SupplyCanvas] Blocked media request for observer (no camera/mic needed)');
        // Return a rejected promise
        return Promise.reject(new DOMException('Media access not needed for observers', 'NotAllowedError'));
      }
      // Allow for presenters and operators
      console.log('[SupplyCanvas] Allowing media request for presenter/operator');
      return originalGetUserMedia(constraints);
    };

    console.log('[SupplyCanvas] Media request override installed');
  }

  /**
   * Monitor permission changes
   * Galene may update permissions after initial connection
   */
  function monitorPermissionChanges() {
    // Try to apply permission class immediately
    if (applyPermissionClass()) {
      console.log('[SupplyCanvas] Initial permission class applied');
    }

    // Install media request blocker for observers
    preventObserverMediaRequests();

    // Also monitor for permission changes by observing serverConnection
    // Set up a periodic check since Galene doesn't expose permission change events
    let lastPermissions = null;
    const checkInterval = setInterval(function() {
      if (typeof serverConnection !== 'undefined' && serverConnection && serverConnection.permissions) {
        const currentPermissions = JSON.stringify(serverConnection.permissions);

        // Check if permissions changed
        if (currentPermissions !== lastPermissions) {
          lastPermissions = currentPermissions;
          applyPermissionClass();
        }
      }
    }, 1000); // Check every second

    // Clean up interval after 30 seconds (permissions should be stable by then)
    setTimeout(function() {
      clearInterval(checkInterval);
      console.log('[SupplyCanvas] Permission monitoring stopped (stable)');
    }, 30000);
  }

  /**
   * Initialize when Galene is ready
   */
  function init() {
    // Wait for DOM and Galene to be fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        console.log('[SupplyCanvas] DOM loaded, waiting for Galene...');
        setTimeout(monitorPermissionChanges, 500);
      });
    } else {
      // DOM already loaded
      console.log('[SupplyCanvas] DOM already loaded, waiting for Galene...');
      setTimeout(monitorPermissionChanges, 500);
    }
  }

  // Start initialization
  init();

  /**
   * Attendance Tracking
   * Tracks participant attendance with hybrid approach:
   * 1. Join/Leave events via navigator.sendBeacon() (reliable even on page unload)
   * 2. Heartbeat events every 5 minutes via fetch() (connection liveness)
   */
  let attendanceHeartbeatInterval = null;
  let hasJoinedSession = false;

  const ATTENDANCE_API_URL = '/api/internal/attendance';
  const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Send attendance event to backend
   * @param {string} eventType - 'join', 'leave', or 'heartbeat'
   * @param {boolean} useBeacon - Use sendBeacon for reliability (join/leave)
   */
  function sendAttendanceEvent(eventType, useBeacon = false) {
    const token = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      console.warn('[SupplyCanvas Attendance] No JWT token - skipping attendance event:', eventType);
      return;
    }

    const timestamp = new Date().toISOString();
    const payload = JSON.stringify({
      eventType: eventType,
      token: token,
      timestamp: timestamp
    });

    console.log('[SupplyCanvas Attendance] Sending event:', eventType, 'at', timestamp);

    if (useBeacon && navigator.sendBeacon) {
      // Use sendBeacon for reliable delivery (works even on page unload)
      const blob = new Blob([payload], { type: 'application/json' });
      const success = navigator.sendBeacon(ATTENDANCE_API_URL, blob);
      console.log('[SupplyCanvas Attendance] sendBeacon result:', success ? 'queued' : 'failed');
    } else {
      // Use fetch for heartbeat (not critical if lost)
      fetch(ATTENDANCE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: payload,
        keepalive: true // Ensure request completes even during page navigation
      }).then(function(response) {
        if (response.ok) {
          console.log('[SupplyCanvas Attendance] Event sent successfully:', eventType);
        } else {
          console.warn('[SupplyCanvas Attendance] Event failed:', eventType, response.status);
        }
      }).catch(function(error) {
        console.error('[SupplyCanvas Attendance] Network error:', error);
      });
    }
  }

  /**
   * Track join event when user connects to Galene
   */
  function trackJoinEvent() {
    if (hasJoinedSession) {
      console.log('[SupplyCanvas Attendance] Join event already sent for this session');
      return;
    }

    console.log('[SupplyCanvas Attendance] User joined webinar');
    sendAttendanceEvent('join', true); // Use beacon for reliability
    hasJoinedSession = true;

    // Start heartbeat interval
    if (!attendanceHeartbeatInterval) {
      attendanceHeartbeatInterval = setInterval(function() {
        console.log('[SupplyCanvas Attendance] Sending heartbeat');
        sendAttendanceEvent('heartbeat', false); // Use fetch for heartbeat
      }, HEARTBEAT_INTERVAL_MS);
      console.log('[SupplyCanvas Attendance] Heartbeat interval started (every 5 minutes)');
    }
  }

  /**
   * Track leave event when user disconnects or closes page
   */
  function trackLeaveEvent() {
    if (!hasJoinedSession) {
      console.log('[SupplyCanvas Attendance] No join event - skipping leave event');
      return;
    }

    console.log('[SupplyCanvas Attendance] User leaving webinar');
    sendAttendanceEvent('leave', true); // Use beacon for reliability

    // Stop heartbeat interval
    if (attendanceHeartbeatInterval) {
      clearInterval(attendanceHeartbeatInterval);
      attendanceHeartbeatInterval = null;
      console.log('[SupplyCanvas Attendance] Heartbeat interval stopped');
    }

    hasJoinedSession = false;
  }

  /**
   * Monitor Galene connection to track join/leave
   */
  function monitorAttendance() {
    // Check when serverConnection becomes available and user is connected
    const checkInterval = setInterval(function() {
      if (typeof serverConnection !== 'undefined' && serverConnection && serverConnection.socket) {
        // Check if socket is connected
        if (serverConnection.socket.readyState === WebSocket.OPEN) {
          // User is connected - track join
          trackJoinEvent();
          clearInterval(checkInterval);

          // Monitor disconnect
          const originalClose = serverConnection.socket.onclose;
          serverConnection.socket.onclose = function(event) {
            trackLeaveEvent();

            // Call original handler if it exists
            if (originalClose) {
              originalClose.call(this, event);
            }
          };
        }
      }
    }, 500);

    // Stop checking after 30 seconds
    setTimeout(function() {
      clearInterval(checkInterval);
    }, 30000);
  }

  // Track leave on page unload (backup for socket close)
  window.addEventListener('beforeunload', function() {
    trackLeaveEvent();
  });

  // Track leave on visibility change (user switches tab for extended period)
  document.addEventListener('visibilitychange', function() {
    if (document.hidden && hasJoinedSession) {
      console.log('[SupplyCanvas Attendance] Page hidden - user may have left');
      // Don't send leave immediately - wait for heartbeat timeout on server
    }
  });

  // Start attendance monitoring
  monitorAttendance();

  /**
   * Additional customizations can be added below
   */

  // Example: Custom logging for debugging
  window.supplyCanvasDebug = function() {
    console.log('[SupplyCanvas Debug] Server Connection:', serverConnection);
    console.log('[SupplyCanvas Debug] Permissions:', serverConnection?.permissions);
    console.log('[SupplyCanvas Debug] Body Classes:', document.body.className);
    console.log('[SupplyCanvas Debug] Has Joined Session:', hasJoinedSession);
    console.log('[SupplyCanvas Debug] Heartbeat Interval:', attendanceHeartbeatInterval ? 'running' : 'stopped');
  };

  console.log('[SupplyCanvas] Use supplyCanvasDebug() in console for debugging info');
})();
