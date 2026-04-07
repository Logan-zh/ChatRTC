'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getSocket } from '@/lib/socket';

interface Message {
  id: string;
  content: string;
  sender: string;
  createdAt: string;
  roomId: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function ChatRoom() {
  const params = useParams<{ id: string }>();
  const roomId = params.id;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sender, setSender] = useState('');
  const [nameSet, setNameSet] = useState(false);
  const [connected, setConnected] = useState(false);
  const [roomName, setRoomName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    fetch(`${API_URL}/rooms/${roomId}`)
      .then((r) => {
        if (!r.ok) throw new Error('Room not found');
        return r.json();
      })
      .then((room) => setRoomName(room.name))
      .catch(() => router.push('/'));
  }, [roomId, router]);

  useEffect(() => {
    if (!nameSet) return;

    const socket = getSocket();

    const onConnect = () => {
      setConnected(true);
      socket.emit('joinRoom', { roomId, sender });
    };

    const onDisconnect = () => setConnected(false);

    const onHistory = (msgs: Message[]) => setMessages(msgs);

    const onMessage = (msg: Message) =>
      setMessages((prev) => [...prev, msg]);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('roomHistory', onHistory);
    socket.on('message', onMessage);

    if (socket.connected) {
      onConnect();
    } else {
      socket.connect();
    }

    return () => {
      socket.emit('leaveRoom', { roomId });
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('roomHistory', onHistory);
      socket.off('message', onMessage);
    };
  }, [nameSet, roomId, sender]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const content = input.trim();
    if (!content || !connected) return;
    getSocket().emit('sendMessage', { roomId, content, sender });
    setInput('');
  };

  if (!nameSet) {
    return (
      <div
        style={{
          maxWidth: 360,
          margin: '10vh auto',
          padding: '2rem',
          textAlign: 'center',
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        }}
      >
        <h2 style={{ marginBottom: '1.5rem' }}>輸入你的暱稱</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (sender.trim()) setNameSet(true);
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          <input
            autoFocus
            value={sender}
            onChange={(e) => setSender(e.target.value)}
            placeholder="暱稱（最多 30 字）"
            maxLength={30}
            style={{ textAlign: 'center', fontSize: '1rem' }}
          />
          <button type="submit" disabled={!sender.trim()}>
            進入聊天室
          </button>
        </form>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        maxWidth: 720,
        margin: '0 auto',
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: '0.75rem 1rem',
          borderBottom: '1px solid #e0e0e0',
          background: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => router.push('/')}
            style={{
              background: 'transparent',
              color: '#555',
              fontSize: '1.1rem',
              padding: '0.25rem 0.5rem',
            }}
          >
            ←
          </button>
          <strong>{roomName}</strong>
        </div>
        <small style={{ color: connected ? '#22c55e' : '#ef4444' }}>
          {connected ? '● 已連線' : '○ 連線中...'}
        </small>
      </header>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        {messages.map((msg) => {
          const isMine = msg.sender === sender;
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isMine ? 'flex-end' : 'flex-start',
              }}
            >
              <small style={{ color: '#888', marginBottom: 2, fontSize: '0.75rem' }}>
                {msg.sender} · {new Date(msg.createdAt).toLocaleTimeString('zh-TW')}
              </small>
              <span
                style={{
                  display: 'inline-block',
                  padding: '0.5rem 0.875rem',
                  borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: isMine ? '#0070f3' : '#f0f0f0',
                  color: isMine ? '#fff' : '#333',
                  maxWidth: '70%',
                  wordBreak: 'break-word',
                  fontSize: '0.95rem',
                }}
              >
                {msg.content}
              </span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={sendMessage}
        style={{
          padding: '0.75rem 1rem',
          borderTop: '1px solid #e0e0e0',
          background: '#fff',
          display: 'flex',
          gap: '0.5rem',
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={connected ? '輸入訊息...' : '連線中...'}
          disabled={!connected}
          maxLength={500}
          style={{ flex: 1 }}
        />
        <button type="submit" disabled={!input.trim() || !connected}>
          發送
        </button>
      </form>
    </div>
  );
}
