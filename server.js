// Simple Socket.io server for testing whiteboard collaboration
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for testing
    methods: ["GET", "POST"]
  }
});

// Store active whiteboards and their users
const whiteboards = {};

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // Handle joining a whiteboard
  socket.on('join-whiteboard', (data) => {
    const { whiteboardId, userId, displayName } = data;
    console.log(`User ${displayName} (${userId}) joined whiteboard: ${whiteboardId}`);
    
    // Create whiteboard room if it doesn't exist
    if (!whiteboards[whiteboardId]) {
      whiteboards[whiteboardId] = { users: {} };
    }
    
    // Add user to whiteboard
    whiteboards[whiteboardId].users[userId] = {
      socketId: socket.id,
      displayName,
      joinedAt: Date.now()
    };
    
    // Join the socket room for this whiteboard
    socket.join(whiteboardId);
    
    // Notify other users that someone joined
    socket.to(whiteboardId).emit(`user-joined-${whiteboardId}`, {
      userId,
      displayName,
      joinedAt: Date.now()
    });
    
    // Send list of existing users to the new user
    const existingUsers = Object.entries(whiteboards[whiteboardId].users)
      .filter(([id]) => id !== userId)
      .map(([id, user]) => ({
        userId: id,
        displayName: user.displayName,
        joinedAt: user.joinedAt
      }));
    
    if (existingUsers.length > 0) {
      socket.emit('existing-users', { whiteboardId, users: existingUsers });
    }
  });
  
  // Handle whiteboard updates
  socket.on('whiteboard-update', (data) => {
    const { whiteboardId, data: updateData } = data;
    console.log(`Update for whiteboard ${whiteboardId}: ${updateData?.action}`);
    
    // Broadcast the update to all users in the whiteboard room
    socket.to(whiteboardId).emit(`whiteboard-update-${whiteboardId}`, updateData);
  });
  
  // Handle leaving a whiteboard
  socket.on('leave-whiteboard', (data) => {
    const { whiteboardId, userId } = data;
    console.log(`User ${userId} left whiteboard: ${whiteboardId}`);
    
    if (whiteboards[whiteboardId] && whiteboards[whiteboardId].users[userId]) {
      // Get user display name before removing
      const displayName = whiteboards[whiteboardId].users[userId].displayName;
      
      // Remove user from whiteboard
      delete whiteboards[whiteboardId].users[userId];
      
      // Clean up empty whiteboards
      if (Object.keys(whiteboards[whiteboardId].users).length === 0) {
        delete whiteboards[whiteboardId];
      }
      
      // Leave the socket room
      socket.leave(whiteboardId);
      
      // Notify other users that someone left
      socket.to(whiteboardId).emit(`user-left-${whiteboardId}`, {
        userId,
        displayName
      });
    }
  });
  
  // Handle disconnections
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Find and remove user from all whiteboards
    Object.entries(whiteboards).forEach(([whiteboardId, whiteboard]) => {
      const userEntry = Object.entries(whiteboard.users).find(([_, user]) => user.socketId === socket.id);
      
      if (userEntry) {
        const [userId, user] = userEntry;
        console.log(`User ${user.displayName} (${userId}) disconnected from whiteboard: ${whiteboardId}`);
        
        // Remove user from whiteboard
        delete whiteboard.users[userId];
        
        // Clean up empty whiteboards
        if (Object.keys(whiteboard.users).length === 0) {
          delete whiteboards[whiteboardId];
        }
        
        // Notify other users that someone left
        socket.to(whiteboardId).emit(`user-left-${whiteboardId}`, {
          userId,
          displayName: user.displayName
        });
      }
    });
  });
});

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Socket.io server is running');
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Socket.io server listening on port ${PORT}`);
  console.log(`Access from your network at http://192.168.178.232:${PORT}`);
}); 