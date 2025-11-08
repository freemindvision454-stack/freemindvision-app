import { WebSocketServer, WebSocket } from 'ws';
import { Server, IncomingMessage } from 'http';

interface UserConnection {
  userId: string;
  ws: WebSocket;
}

// Track online users
const onlineUsers = new Map<string, Set<WebSocket>>();

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ 
    noServer: true
  });

  // Handle upgrade from Express with session data
  server.on('upgrade', (request, socket, head) => {
    if (request.url !== '/ws') {
      return;
    }

    // Session is already parsed by express-session middleware
    const session = (request as any).session;
    const userId = session?.passport?.user?.claims?.sub;

    if (!userId) {
      console.log('[WebSocket] Rejected unauthenticated connection');
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    // Store userId in request for later use
    (request as any).userId = userId;

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    // Get authenticated userId from request
    const userId = (req as any).userId as string;
    console.log(`[WebSocket] User ${userId} connected (authenticated)`);
    
    // Add user to online users
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(ws);
    
    console.log(`[WebSocket] Total online users: ${onlineUsers.size}`);
    
    // Broadcast online status to all clients
    broadcastUserStatus(userId, 'online');
    
    // Send acknowledgment with online users list
    ws.send(JSON.stringify({ 
      type: 'auth_success',
      userId,
      onlineUsers: Array.from(onlineUsers.keys())
    }));

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle other message types here if needed (e.g., typing indicators)
        console.log('[WebSocket] Received message:', data.type);
      } catch (error) {
        console.error('[WebSocket] Error parsing message:', error);
      }
    });

    ws.on('close', () => {
      if (userId) {
        const disconnectUserId = userId;
        const userSockets = onlineUsers.get(disconnectUserId);
        if (userSockets) {
          userSockets.delete(ws);
          if (userSockets.size === 0) {
            onlineUsers.delete(disconnectUserId);
            console.log(`[WebSocket] User ${disconnectUserId} disconnected. Total online: ${onlineUsers.size}`);
            
            // Broadcast offline status
            broadcastUserStatus(disconnectUserId, 'offline');
          }
        }
      }
    });

    ws.on('error', (error) => {
      console.error('[WebSocket] Error:', error);
    });
  });

  function broadcastUserStatus(userId: string, status: 'online' | 'offline') {
    const message = JSON.stringify({
      type: 'user_status',
      userId,
      status
    });

    // Send to all connected clients except the user themselves
    onlineUsers.forEach((sockets, connectedUserId) => {
      if (connectedUserId !== userId) {
        sockets.forEach(socket => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(message);
          }
        });
      }
    });
  }

  return wss;
}

export function getOnlineUsers(): string[] {
  return Array.from(onlineUsers.keys());
}

export function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId);
}
