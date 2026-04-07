import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchRoom } from '../lib/api';
import { persistIdentity, loadIdentity } from '../lib/identity';
import { getSocket } from '../lib/socket';
import { ParticipantAvatar } from '../components/ParticipantAvatar';
import { useRoomRtc } from '../hooks/useRoomRtc';
import type { ChatMessage, JoinRoomResult, MediaEvent, PresenceEvent, Room } from '../types';

type DraftIdentity = {
  displayName: string;
};

export function RoomPage() {
  const navigate = useNavigate();
  const { roomId = '' } = useParams();
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [message, setMessage] = useState('');
  const [identityDraft, setIdentityDraft] = useState<DraftIdentity>({ displayName: '' });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [needsIdentity, setNeedsIdentity] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const participants = room?.participants ?? [];
  const messages = room?.messages ?? [];

  const { isCameraEnabled, localStream, localVideoRef, remoteStreams, toggleCamera } = useRoomRtc({
    roomId,
    currentUserId,
    participants,
  });

  const orderedMessages = useMemo(() => messages, [messages]);

  useEffect(() => {
    const identity = loadIdentity();
    if (identity) {
      setIdentityDraft({ displayName: identity.displayName });
    }
  }, []);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    let active = true;
    fetchRoom(roomId)
      .then((nextRoom) => {
        if (!active) {
          return;
        }
        setRoom(nextRoom);
      })
      .catch(() => {
        navigate('/');
      });

    return () => {
      active = false;
    };
  }, [navigate, roomId]);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [orderedMessages]);

  useEffect(() => {
    if (needsIdentity || !roomId || !displayName) {
      return;
    }

    const identity = persistIdentity(displayName);
    setCurrentUserId(identity.userId);

    const socket = getSocket();

    const handleConnect = () => {
      setSocketConnected(true);
      socket.emit('room:join', {
        roomId,
        displayName: identity.displayName,
        userId: identity.userId,
      });
    };

    const handleDisconnect = () => {
      setSocketConnected(false);
    };

    const handleRoomJoined = (result: JoinRoomResult) => {
      setRoom(result.room);
      setCurrentUserId(result.participant.userId);
    };

    const handlePresence = (event: PresenceEvent) => {
      setRoom((currentRoom) => {
        if (!currentRoom || currentRoom.id !== event.roomId) {
          return currentRoom;
        }

        if (event.type === 'left') {
          return {
            ...currentRoom,
            participants: currentRoom.participants.filter(
              (participant) => participant.userId !== event.participant.userId,
            ),
          };
        }

        const others = currentRoom.participants.filter(
          (participant) => participant.userId !== event.participant.userId,
        );
        return {
          ...currentRoom,
          participants: [...others, event.participant],
        };
      });
    };

    const handleMessage = (nextMessage: ChatMessage) => {
      setRoom((currentRoom) => {
        if (!currentRoom) {
          return currentRoom;
        }
        return {
          ...currentRoom,
          messages: [...currentRoom.messages, nextMessage],
        };
      });
    };

    const handleMedia = (event: MediaEvent) => {
      setRoom((currentRoom) => {
        if (!currentRoom || currentRoom.id !== event.roomId) {
          return currentRoom;
        }
        return {
          ...currentRoom,
          participants: currentRoom.participants.map((participant) =>
            participant.userId === event.participant.userId ? event.participant : participant,
          ),
        };
      });
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('room:joined', handleRoomJoined);
    socket.on('room:presence', handlePresence);
    socket.on('chat:message', handleMessage);
    socket.on('participant:media', handleMedia);

    if (!socket.connected) {
      socket.connect();
    } else {
      handleConnect();
    }

    return () => {
      socket.emit('room:leave');
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('room:joined', handleRoomJoined);
      socket.off('room:presence', handlePresence);
      socket.off('chat:message', handleMessage);
      socket.off('participant:media', handleMedia);
    };
  }, [displayName, navigate, needsIdentity, roomId]);

  async function handleIdentitySubmit(event: FormEvent) {
    event.preventDefault();
    if (!identityDraft.displayName.trim()) {
      return;
    }
    setDisplayName(identityDraft.displayName.trim());
    setNeedsIdentity(false);
  }

  function handleSendMessage(event: FormEvent) {
    event.preventDefault();
    if (!message.trim() || !roomId) {
      return;
    }
    getSocket().emit('chat:send', {
      roomId,
      message: message.trim(),
    });
    setMessage('');
  }

  async function handleToggleCamera() {
    try {
      setError(null);
      await toggleCamera();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '無法啟用攝影機');
    }
  }

  if (!room) {
    return <main className="loading-page">載入房間中...</main>;
  }

  if (needsIdentity) {
    return (
      <main className="identity-page">
        <section className="identity-card">
          <p className="eyebrow">Join Room</p>
          <h1>{room.name}</h1>
          <p>先輸入你的顯示名稱，再進入這個聊天室。</p>
          <form className="identity-form" onSubmit={handleIdentitySubmit}>
            <input
              className="text-input"
              maxLength={40}
              onChange={(event) =>
                setIdentityDraft({
                  displayName: event.target.value,
                })
              }
              placeholder="你的名稱"
              value={identityDraft.displayName}
            />
            <button className="primary-button" disabled={!identityDraft.displayName.trim()} type="submit">
              進入房間
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="room-page">
      <aside className="room-sidebar">
        <button className="ghost-button" onClick={() => navigate('/')} type="button">
          返回首頁
        </button>
        <div className="room-sidebar-title">
          <p className="eyebrow">Room</p>
          <h1>{room.name}</h1>
        </div>
        <div className="presence-pill">
          <span className={`status-dot ${socketConnected ? 'status-live' : ''}`} />
          {socketConnected ? 'Socket 已連線' : 'Socket 連線中'}
        </div>
        <button className="primary-button" onClick={() => void handleToggleCamera()} type="button">
          {isCameraEnabled ? '關閉視訊頭像' : '開啟視訊頭像'}
        </button>
        {error ? <p className="error-text">{error}</p> : null}

        <section className="participant-list">
          <div className="participant-row participant-row-self">
            <ParticipantAvatar
              label={displayName}
              isLive={isCameraEnabled}
              mirrored
              stream={localStream ?? undefined}
            />
            <div>
              <strong>{displayName}</strong>
              <p>{isCameraEnabled ? '你的即時畫面已開啟' : '目前顯示文字頭像'}</p>
            </div>
            <video className="sidebar-local-video" muted playsInline ref={localVideoRef} />
          </div>

          {participants
            .filter((participant) => participant.userId !== currentUserId)
            .map((participant) => (
              <div className="participant-row" key={participant.userId}>
                <ParticipantAvatar
                  isLive={participant.isVideoEnabled && remoteStreams.has(participant.userId)}
                  label={participant.displayName}
                  stream={remoteStreams.get(participant.userId)}
                />
                <div>
                  <strong>{participant.displayName}</strong>
                  <p>{participant.isVideoEnabled ? '視訊已開啟' : '純文字聊天中'}</p>
                </div>
              </div>
            ))}
        </section>
      </aside>

      <section className="chat-panel">
        <header className="chat-header">
          <div>
            <p className="eyebrow">Conversation</p>
            <h2>{room.messages.length} 則訊息</h2>
          </div>
          <span className="subtle-text">頭像在訊息最外側，開視訊時會切成即時畫面</span>
        </header>

        <div className="message-list">
          {orderedMessages.length === 0 ? (
            <div className="empty-state empty-state-chat">還沒有訊息，發送第一句開始吧。</div>
          ) : null}

          {orderedMessages.map((entry) => {
            const isMine = entry.userId === currentUserId;
            const author = participants.find((participant) => participant.userId === entry.userId);
            const liveStream = isMine ? localStream ?? undefined : remoteStreams.get(entry.userId);
            const showLive = isMine ? isCameraEnabled : Boolean(author?.isVideoEnabled && liveStream);

            return (
              <article className={`message-row ${isMine ? 'message-row-mine' : 'message-row-other'}`} key={entry.id}>
                {isMine ? (
                  <ParticipantAvatar
                    isLive={showLive}
                    label={displayName}
                    mirrored
                    stream={liveStream}
                  />
                ) : null}

                <div className={`message-stack ${isMine ? 'message-stack-mine' : 'message-stack-other'}`}>
                  <p className="message-meta">
                    <span>{entry.displayName}</span>
                    <span>{new Date(entry.sentAt).toLocaleTimeString('zh-TW')}</span>
                  </p>
                  <div className={`message-bubble ${isMine ? 'message-bubble-mine' : 'message-bubble-other'}`}>
                    {entry.message}
                  </div>
                </div>

                {!isMine ? (
                  <ParticipantAvatar
                    isLive={showLive}
                    label={entry.displayName}
                    stream={liveStream}
                  />
                ) : null}
              </article>
            );
          })}

          <div ref={scrollAnchorRef} />
        </div>

        <form className="message-form" onSubmit={handleSendMessage}>
          <input
            className="text-input"
            maxLength={500}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="輸入訊息..."
            value={message}
          />
          <button className="primary-button" disabled={!message.trim()} type="submit">
            發送
          </button>
        </form>
      </section>
    </main>
  );
}
