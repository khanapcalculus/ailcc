import { io } from 'socket.io-client';

// Socket reference
let socket = null;

// Force mock mode for Firebase deployment regardless of hostname
// This ensures no real socket connections are attempted in production
// To enable real sockets in production, set VUE_APP_SOCKET_SERVER_URL
// in your .env.production file (see README.md for deployment instructions)
const isFirebase = window.location.hostname.includes('web.app') || 
                  window.location.hostname.includes('firebaseapp.com');
                  
// More general production detection (not localhost or local IP)
const isProduction = window.location.hostname !== 'localhost' && 
                    !window.location.hostname.includes('192.168.') &&
                    !window.location.hostname.includes('127.0.0.1');

// Socket server URL from environment variable (if it exists)
const socketServerUrl = process.env.VUE_APP_SOCKET_SERVER_URL;

// Only use real sockets in local development or if socket server URL is provided
const USE_REAL_SOCKET = true; // Always use real sockets with our Heroku server

// Socket connection URL - prioritize environment variable, then fall back to defaults
const SOCKET_URL = socketServerUrl || (window.location.hostname === 'localhost' ? 
  'http://localhost:3000' : 
  'https://lcc-socket-server.herokuapp.com');

// Max reconnection attempts
const MAX_RECONNECTION_ATTEMPTS = 10;

// Reconnection delay in ms
const RECONNECTION_DELAY = 1000;

/**
 * Initialize socket connection
 * @param {string} token - Authentication token
 * @returns {Object} - Socket.io instance
 */
function initializeSocket(token) {
  console.log('[SOCKET] Initializing socket connection', { 
    production: isProduction, 
    firebase: isFirebase,
    useRealSocket: USE_REAL_SOCKET 
  });
  
  // Always try to use the real socket first, regardless of environment
  if (socket && socket.connected) {
    console.log('[SOCKET] Reusing existing socket connection');
    return socket;
  }

  // Create socket options with best practices for reliability
  const options = {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: MAX_RECONNECTION_ATTEMPTS,
    reconnectionDelay: RECONNECTION_DELAY,
    reconnectionDelayMax: RECONNECTION_DELAY * 5,
    timeout: 10000, // 10 second connection timeout
    transports: ['polling', 'websocket'], // Start with polling then try WebSocket
    upgrade: true, // Attempt to upgrade to WebSocket
    autoConnect: true,
    forceNew: false, // Reuse existing connection if available
    query: {
      clientTime: Date.now() // Help with debugging
    }
  };

  console.log('[SOCKET] Creating new socket connection with options:', options);
  
  // Create new socket connection with auth token
  try {
    socket = io(SOCKET_URL, options);
    
    // Setup event listeners
    setupSocketListeners();
    
    return socket;
  } catch (error) {
    console.error('[SOCKET] Error creating socket:', error);
    // Fall back to mock socket if connection fails
    return getMockSocket();
  }
}

/**
 * Get a mock socket object for development
 */
function getMockSocket() {
  if (socket) return socket;
  
  let mockCallbacks = {};
  let joinedWhiteboards = {}; // Track whiteboards the user has joined
  
  console.log('[MOCK SOCKET] Creating mock socket for offline/production use');
  
  socket = {
    id: 'mock-socket-id-' + Math.random().toString(36).substring(2, 10),
    connected: true,
    emit: (event, data) => {
      console.log(`[MOCK SOCKET] Emitting event: ${event}`, data?.action || data);
      
      // Handle specific events
      if (event === 'join-whiteboard' && data && data.whiteboardId) {
        // Track joined whiteboards
        joinedWhiteboards[data.whiteboardId] = {
          joinedAt: Date.now(),
          userId: data.userId,
          displayName: data.displayName
        };
        
        // Trigger user joined event for other mock users
        setTimeout(() => {
          const mockUserJoinEvent = `user-joined-${data.whiteboardId}`;
          const handler = mockCallbacks[mockUserJoinEvent];
          if (handler) {
            handler({
              userId: 'mock-user-' + Math.random().toString(36).substring(2, 10),
              displayName: 'Mock User',
              joinedAt: Date.now()
            });
          }
          
          // Also send existing users event
          const existingUsersHandler = mockCallbacks['existing-users'];
          if (existingUsersHandler) {
            existingUsersHandler({
              whiteboardId: data.whiteboardId,
              users: [
                {
                  userId: 'mock-user-' + Math.random().toString(36).substring(2, 10),
                  displayName: 'Mock User 1',
                  joinedAt: Date.now() - 5000
                }
              ]
            });
          }
        }, 500);
      }
      
      // When leaving a whiteboard
      if (event === 'leave-whiteboard' && data && data.whiteboardId) {
        delete joinedWhiteboards[data.whiteboardId];
      }
      
      // For whiteboard updates
      if (event === 'whiteboard-update' && data && data.whiteboardId) {
        const eventName = `whiteboard-update-${data.whiteboardId}`;
        const handler = mockCallbacks[eventName];
        if (handler && data.data) {
          // Simulate network delay
          setTimeout(() => handler(data.data), 100);
        }
      }
    },
    on: (event, callback) => {
      console.log(`[MOCK SOCKET] Registered listener for: ${event}`);
      mockCallbacks[event] = callback;
      
      // Immediately invoke connect callback if it's the connect event
      if (event === 'connect' && callback) {
        setTimeout(() => callback(), 100);
      }
      
      return socket;
    },
    off: (event) => {
      console.log(`[MOCK SOCKET] Removed listener for: ${event}`);
      delete mockCallbacks[event];
      return socket;
    },
    disconnect: () => {
      console.log('[MOCK SOCKET] Disconnected');
      // Clear all callbacks and state
      mockCallbacks = {};
      joinedWhiteboards = {};
    },
    // Add missing methods that might be expected
    connect: () => {
      console.log('[MOCK SOCKET] Mock reconnection');
      socket.connected = true;
      const handler = mockCallbacks['connect'];
      if (handler) setTimeout(() => handler(), 100);
      return socket;
    },
    io: {
      opts: {
        transports: ['polling', 'websocket']
      }
    }
  };
  
  return socket;
}

/**
 * Setup basic socket event listeners
 */
function setupSocketListeners() {
  if (!socket) return;

  socket.on('connect', () => {
    console.log('[SOCKET] Connected successfully with ID:', socket.id);
  });

  socket.on('connect_error', (error) => {
    console.error('[SOCKET] Connection error:', error);
  });

  socket.on('disconnect', (reason) => {
    console.log('[SOCKET] Disconnected:', reason);
  });

  socket.on('error', (error) => {
    console.error('[SOCKET] Socket error:', error);
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log(`[SOCKET] Reconnected after ${attemptNumber} attempts`);
  });

  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log(`[SOCKET] Reconnection attempt ${attemptNumber}/${MAX_RECONNECTION_ATTEMPTS}`);
  });

  socket.on('reconnect_error', (error) => {
    console.error('[SOCKET] Reconnection error:', error);
  });

  socket.on('reconnect_failed', () => {
    console.error('[SOCKET] Failed to reconnect after max attempts');
  });
}

/**
 * Subscribe to whiteboard updates
 * @param {string} whiteboardId - ID of the whiteboard
 * @param {Function} callback - Callback to handle updates
 */
function subscribeToWhiteboardUpdates(whiteboardId, callback) {
  if (!socket) {
    console.error('[SOCKET] No socket connection available to subscribe to updates');
    return;
  }
  
  const eventName = `whiteboard-update-${whiteboardId}`;
  
  // Remove any existing listeners for this whiteboard
  socket.off(eventName);
  
  // Add new listener with robust error handling
  socket.on(eventName, (data) => {
    console.log(`[SOCKET] Received update for ${whiteboardId}:`, data?.action);
    
    try {
      // Validate the data before processing
      if (!data || typeof data !== 'object') {
        console.warn('[SOCKET] Received invalid update data (not an object)');
        return;
      }
      
      if (!data.action) {
        console.warn('[SOCKET] Received update without action:', data);
        return;
      }
      
      // Process the data
      callback(data);
    } catch (error) {
      console.error('[SOCKET] Error in update callback:', error);
    }
  });
  
  console.log(`[SOCKET] Subscribed to whiteboard updates for: ${whiteboardId}`);
  
  // Also listen for acknowledgements
  socket.on('update-acknowledged', (data) => {
    console.log(`[SOCKET] Update acknowledged:`, data);
  });
  
  // Listen for errors
  socket.on('update-error', (data) => {
    console.error(`[SOCKET] Error with update:`, data);
  });
}

/**
 * Unsubscribe from whiteboard updates
 * @param {string} whiteboardId - ID of the whiteboard
 */
function unsubscribeFromWhiteboardUpdates(whiteboardId) {
  if (!socket) return;
  
  const eventName = `whiteboard-update-${whiteboardId}`;
  
  // Remove listeners
  socket.off(eventName);
  
  console.log(`[SOCKET] Unsubscribed from whiteboard updates for: ${whiteboardId}`);
}

/**
 * Send whiteboard update
 * @param {string} whiteboardId - ID of the whiteboard
 * @param {Object} data - Update data
 */
function sendWhiteboardUpdate(whiteboardId, data) {
  if (!socket) {
    console.error('[SOCKET] No socket connection available to send update');
    return;
  }
  
  if (!socket.connected) {
    console.warn('[SOCKET] Socket is not connected, trying to reconnect...');
    socket.connect();
  }
  
  console.log(`[SOCKET] Sending update to whiteboard ${whiteboardId}:`, data?.action);
  
  try {
    socket.emit('whiteboard-update', {
      whiteboardId,
      data,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('[SOCKET] Error sending update:', error);
  }
}

/**
 * Check if socket is connected
 * @returns {boolean} - Connection status
 */
function isConnected() {
  return socket && socket.connected;
}

/**
 * Force reconnection if disconnected
 */
function reconnect() {
  if (socket && !socket.connected) {
    console.log('[SOCKET] Forcing reconnection...');
    socket.connect();
  }
}

/**
 * Close socket connection
 */
function closeSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('[SOCKET] Connection closed');
  }
}

export {
  closeSocket, initializeSocket, isConnected, reconnect, sendWhiteboardUpdate, socket,
  subscribeToWhiteboardUpdates, unsubscribeFromWhiteboardUpdates
};

 