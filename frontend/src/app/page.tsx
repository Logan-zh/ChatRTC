'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Room {
  id: string;
  name: string;
  createdAt: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function Home() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch(`${API_URL}/rooms`)
      .then((r) => r.json())
      .then((data) => setRooms(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const createRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newRoomName.trim();
    if (!name) return;
    try {
      const res = await fetch(`${API_URL}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const room: Room = await res.json();
      router.push(`/room/${room.id}`);
    } catch (err) {
      console.error('建立房間失敗:', err);
    }
  };

  return (
    <main style={{ maxWidth: 600, margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ marginBottom: '2rem' }}>💬 ChatRTC</h1>

      <form
        onSubmit={createRoom}
        style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}
      >
        <input
          type="text"
          value={newRoomName}
          onChange={(e) => setNewRoomName(e.target.value)}
          placeholder="新房間名稱"
          maxLength={50}
          style={{ flex: 1 }}
        />
        <button type="submit" disabled={!newRoomName.trim()}>
          建立房間
        </button>
      </form>

      <h2 style={{ marginBottom: '1rem' }}>聊天室列表</h2>

      {loading ? (
        <p style={{ color: '#888' }}>載入中...</p>
      ) : rooms.length === 0 ? (
        <p style={{ color: '#888' }}>目前沒有房間，建立第一個吧！</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {rooms.map((room) => (
            <li
              key={room.id}
              onClick={() => router.push(`/room/${room.id}`)}
              style={{
                padding: '1rem',
                marginBottom: '0.5rem',
                border: '1px solid #e0e0e0',
                borderRadius: 8,
                cursor: 'pointer',
                background: '#fff',
                transition: 'box-shadow 0.15s',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.boxShadow = 'none')
              }
            >
              <strong>{room.name}</strong>
              <br />
              <small style={{ color: '#888' }}>
                {new Date(room.createdAt).toLocaleString('zh-TW')}
              </small>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
