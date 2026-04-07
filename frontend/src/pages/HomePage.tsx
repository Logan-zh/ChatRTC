import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRoom, fetchRooms } from '../lib/api';
import type { Room } from '../types';

export function HomePage() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadRooms();
  }, []);

  async function loadRooms() {
    setIsLoading(true);
    setError(null);
    try {
      setRooms(await fetchRooms());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '載入房間失敗');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateRoom(event: FormEvent) {
    event.preventDefault();
    if (!newRoomName.trim()) {
      return;
    }
    setIsCreating(true);
    setError(null);
    try {
      const room = await createRoom(newRoomName.trim());
      navigate(`/rooms/${room.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '建立房間失敗');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <main className="home-page">
      <section className="hero-panel">
        <p className="eyebrow">ChatRTC v0.2</p>
        <h1>把聊天、房間與視訊頭像放進同一個協作空間。</h1>
        <p className="hero-copy">
          建立房間後，成員可即時文字聊天；開啟攝影機時，訊息外側頭像會直接切成即時畫面。
        </p>

        <form className="room-creator" onSubmit={handleCreateRoom}>
          <input
            aria-label="房間名稱"
            className="text-input"
            maxLength={60}
            onChange={(event) => setNewRoomName(event.target.value)}
            placeholder="例如：今晚衝刺會議"
            value={newRoomName}
          />
          <button className="primary-button" disabled={isCreating || !newRoomName.trim()} type="submit">
            {isCreating ? '建立中...' : '建立房間'}
          </button>
        </form>

        {error ? <p className="error-text">{error}</p> : null}
      </section>

      <section className="rooms-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Lobby</p>
            <h2>房間列表</h2>
          </div>
          <button className="ghost-button" onClick={() => void loadRooms()} type="button">
            重新整理
          </button>
        </div>

        {isLoading ? <div className="empty-state">正在載入房間...</div> : null}
        {!isLoading && rooms.length === 0 ? (
          <div className="empty-state">目前還沒有房間，建立第一個吧。</div>
        ) : null}

        <div className="room-grid">
          {rooms.map((room) => (
            <button
              className="room-card"
              key={room.id}
              onClick={() => navigate(`/rooms/${room.id}`)}
              type="button"
            >
              <div className="room-card-top">
                <strong>{room.name}</strong>
                <span>{room.participants.length} 人在線</span>
              </div>
              <div className="room-card-bottom">
                <span>{new Date(room.createdAt).toLocaleString('zh-TW')}</span>
                <span>{room.messages.length} 則訊息</span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
