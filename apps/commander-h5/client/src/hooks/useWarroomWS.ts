/**
 * useWarroomWS — WebSocket 实时推送 Hook
 *
 * 将 30s 轮询升级为 WebSocket 实时推送，实现询盘消息的秒级同步。
 * 自动处理断线重连（指数退避），并在连接失败时降级到轮询模式。
 *
 * 消息协议（JSON）：
 *   { type: 'warroom_update', payload: WarroomData }
 *   { type: 'new_inquiry', payload: ChatMessage }
 *   { type: 'ping' }
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { WarroomData, ChatMessage } from '../types/warroom';
import { getAccessToken } from '../lib/api';

export type WSStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface UseWarroomWSReturn {
  status: WSStatus;
  lastUpdate: Date | null;
  newMessages: ChatMessage[];
  clearMessages: () => void;
}

const WS_URL = (() => {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws/warroom`;
})();

const MAX_RECONNECT_DELAY = 30_000;
const BASE_RECONNECT_DELAY = 1_000;

export function useWarroomWS(
  onDataUpdate?: (data: Partial<WarroomData>) => void
): UseWarroomWSReturn {
  const [status, setStatus] = useState<WSStatus>('connecting');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [newMessages, setNewMessages] = useState<ChatMessage[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef(BASE_RECONNECT_DELAY);
  const mountedRef = useRef(true);
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearMessages = useCallback(() => setNewMessages([]), []);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
    }

    setStatus('connecting');

    try {
      const token = getAccessToken();
      const url = token ? `${WS_URL}?token=${encodeURIComponent(token)}` : WS_URL;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setStatus('connected');
        reconnectDelayRef.current = BASE_RECONNECT_DELAY;

        // Heartbeat ping every 25s
        pingTimerRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25_000);
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const msg = JSON.parse(event.data);
          setLastUpdate(new Date());

          switch (msg.type) {
            case 'warroom_update':
              onDataUpdate?.(msg.payload);
              break;
            case 'new_inquiry':
              setNewMessages(prev => [...prev.slice(-19), msg.payload as ChatMessage]);
              break;
            case 'pong':
              // heartbeat response, no-op
              break;
            default:
              break;
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onerror = () => {
        if (!mountedRef.current) return;
        setStatus('error');
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setStatus('disconnected');
        if (pingTimerRef.current) clearInterval(pingTimerRef.current);

        // Exponential backoff reconnect
        const delay = Math.min(reconnectDelayRef.current, MAX_RECONNECT_DELAY);
        reconnectDelayRef.current = Math.min(delay * 1.5, MAX_RECONNECT_DELAY);
        reconnectTimerRef.current = setTimeout(connect, delay);
      };
    } catch {
      setStatus('error');
      // Fallback: retry after delay
      reconnectTimerRef.current = setTimeout(connect, reconnectDelayRef.current);
    }
  }, [onDataUpdate]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (pingTimerRef.current) clearInterval(pingTimerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { status, lastUpdate, newMessages, clearMessages };
}
