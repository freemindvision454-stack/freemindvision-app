import { useState, useEffect, useRef } from 'react';
import { useAuth } from './useAuth';

export function useWebSocket() {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) return;

    const connect = () => {
      // Use ws:// for development, wss:// for production
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      console.log('[WebSocket] Connecting to:', wsUrl);
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('[WebSocket] Connected');
        setIsConnected(true);

        // Authenticate
        ws.current?.send(JSON.stringify({
          type: 'auth',
          userId: user.id
        }));
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'auth_success') {
            console.log('[WebSocket] Authenticated. Online users:', data.onlineUsers);
            setOnlineUsers(new Set(data.onlineUsers));
          } else if (data.type === 'user_status') {
            setOnlineUsers(prev => {
              const next = new Set(prev);
              if (data.status === 'online') {
                next.add(data.userId);
              } else {
                next.delete(data.userId);
              }
              return next;
            });
          }
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      };

      ws.current.onclose = () => {
        console.log('[WebSocket] Disconnected');
        setIsConnected(false);
        setOnlineUsers(new Set());

        // Reconnect after 3 seconds
        reconnectTimeout.current = setTimeout(() => {
          console.log('[WebSocket] Reconnecting...');
          connect();
        }, 3000);
      };

      ws.current.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
      };
    };

    connect();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [user]);

  return {
    onlineUsers,
    isConnected,
    isUserOnline: (userId: string) => onlineUsers.has(userId)
  };
}
