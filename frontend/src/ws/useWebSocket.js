import { useRef } from 'react'

// useWebSocket hook: manages native WebSocket connection & listeners
// expose: connect(roomId, userId, displayName), send(message), subscribe(type, cb), disconnect()
export default function useWebSocket(){
  const wsRef = useRef(null)
  const listenersRef = useRef({}) // eventType -> [callbacks]
  const reconnectRef = useRef({ attempts: 0, timeoutId: null })
  const connectionInfoRef = useRef({ roomId: null, userId: null, displayName: null })

  // NEW: queue messages when socket is not open
  const sendQueueRef = useRef([])

  // helper to call listeners by event.type
  const routeMessage = (data) => {
    try {
      const msg = typeof data === 'string' ? JSON.parse(data) : data
      const type = msg.type
      const listeners = listenersRef.current[type] || []
      listeners.forEach(cb => { try { cb(msg) } catch(e){ console.error('listener error', e) } })
    } catch(e){
      console.error('failed to route message', e)
    }
  }

  // connect to ws://localhost:8000/ws/${roomId}
  const connect = (roomId, userId, displayName) => {
    if (!roomId) throw new Error('roomId required')
    connectionInfoRef.current = { roomId, userId, displayName }
    const url = `ws://localhost:8000/ws/${roomId}`

    // Close existing socket if needed
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      send(JSON.stringify({ type: 'join', user_id: userId, display_name: displayName }))
      return
    }

    wsRef.current = new WebSocket(url)

    wsRef.current.onopen = () => {
      console.log('[ws] connected')
      reconnectRef.current.attempts = 0

      // Send join event
      send(JSON.stringify({
        type: 'join',
        user_id: userId,
        display_name: displayName
      }))

      // NEW: flush queued messages
      while (sendQueueRef.current.length > 0) {
        const queued = sendQueueRef.current.shift()
        console.log('[ws] flushing queued message:', queued)
        wsRef.current.send(queued)
      }
    }

    wsRef.current.onmessage = (ev) => {
      routeMessage(ev.data)
    }

    wsRef.current.onclose = (ev) => {
      console.warn('[ws] closed', ev.code, ev.reason)
      attemptReconnect()
    }

    wsRef.current.onerror = (err) => {
      console.error('[ws] error', err)
    }
  }

  const attemptReconnect = () => {
    const info = connectionInfoRef.current
    if (!info.roomId) return
    const attempts = reconnectRef.current.attempts + 1
    reconnectRef.current.attempts = attempts
    const delay = Math.min(30000, 1000 * attempts)
    console.log(`[ws] reconnecting in ${delay}ms`)
    reconnectRef.current.timeoutId = setTimeout(() => {
      connect(info.roomId, info.userId, info.displayName)
    }, delay)
  }

  const disconnect = () => {
    if (reconnectRef.current.timeoutId) clearTimeout(reconnectRef.current.timeoutId)
    const ws = wsRef.current
    if (ws) {
      try { ws.close() } catch(e){}
      wsRef.current = null
    }
    connectionInfoRef.current = { roomId: null, userId: null, displayName: null }
  }

  // UPDATED send(): queue messages if not open
  const send = (payload) => {
    try {
      const ws = wsRef.current
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(payload)
      } else {
        console.warn('[ws] socket not open – queueing:', payload)
        sendQueueRef.current.push(payload)
      }
    } catch(e){
      console.error('[ws] send error', e)
    }
  }

  const subscribe = (type, cb) => {
    if (!listenersRef.current[type]) listenersRef.current[type] = []
    listenersRef.current[type].push(cb)
    return () => {
      listenersRef.current[type] = listenersRef.current[type].filter(x => x !== cb)
    }
  }

  return {
    connect,
    send,
    subscribe,
    disconnect,
    _debug: { wsRef, sendQueueRef }
  }
}
