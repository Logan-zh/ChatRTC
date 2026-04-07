import { useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { Participant } from '../types';
import { getSocket } from '../lib/socket';

const rtcConfig: RTCConfiguration = {
  iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
};

type UseRoomRtcOptions = {
  roomId: string;
  currentUserId: string | null;
  participants: Participant[];
};

type UseRoomRtcResult = {
  isCameraEnabled: boolean;
  localVideoRef: MutableRefObject<HTMLVideoElement | null>;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  toggleCamera: () => Promise<void>;
};

export function useRoomRtc({
  roomId,
  currentUserId,
  participants,
}: UseRoomRtcOptions): UseRoomRtcResult {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef(new Map<string, RTCPeerConnection>());
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      for (const connection of peerConnectionsRef.current.values()) {
        connection.close();
      }
      peerConnectionsRef.current.clear();
      if (localStreamRef.current) {
        for (const track of localStreamRef.current.getTracks()) {
          track.stop();
        }
      }
    };
  }, []);

  useEffect(() => {
    const activeParticipantIds = new Set(
      participants
        .filter((participant) => participant.userId !== currentUserId)
        .map((participant) => participant.userId),
    );

    for (const [userId, connection] of peerConnectionsRef.current.entries()) {
      if (activeParticipantIds.has(userId)) {
        continue;
      }

      connection.close();
      peerConnectionsRef.current.delete(userId);
      setRemoteStreams((current) => {
        const next = new Map(current);
        next.delete(userId);
        return next;
      });
    }

    if (!isCameraEnabled) {
      return;
    }

    const missingParticipantIds = participants
      .filter((participant) => participant.userId !== currentUserId)
      .map((participant) => participant.userId)
      .filter((userId) => !peerConnectionsRef.current.has(userId));

    if (missingParticipantIds.length === 0) {
      return;
    }

    void (async () => {
      for (const userId of missingParticipantIds) {
        await createOffer(userId, true);
      }
    })();
  }, [currentUserId, isCameraEnabled, participants, roomId]);

  useEffect(() => {
    const socket = getSocket();

    const handleOffer = async (payload: {
      roomId: string;
      fromUserId: string;
      sdp: RTCSessionDescriptionInit;
    }) => {
      if (!currentUserId || payload.roomId !== roomId) {
        return;
      }

      const connection = createConnection(payload.fromUserId, true);
      await connection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      const answer = await connection.createAnswer();
      await connection.setLocalDescription(answer);
      socket.emit('webrtc:answer', {
        roomId,
        targetUserId: payload.fromUserId,
        sdp: answer,
      });
    };

    const handleAnswer = async (payload: {
      roomId: string;
      fromUserId: string;
      sdp: RTCSessionDescriptionInit;
    }) => {
      if (payload.roomId !== roomId) {
        return;
      }
      const connection = peerConnectionsRef.current.get(payload.fromUserId);
      if (!connection) {
        return;
      }
      await connection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
    };

    const handleCandidate = async (payload: {
      roomId: string;
      fromUserId: string;
      candidate: RTCIceCandidateInit;
    }) => {
      if (payload.roomId !== roomId) {
        return;
      }
      const connection = peerConnectionsRef.current.get(payload.fromUserId);
      if (!connection) {
        return;
      }
      await connection.addIceCandidate(new RTCIceCandidate(payload.candidate));
    };

    socket.on('webrtc:offer', handleOffer);
    socket.on('webrtc:answer', handleAnswer);
    socket.on('webrtc:ice-candidate', handleCandidate);

    return () => {
      socket.off('webrtc:offer', handleOffer);
      socket.off('webrtc:answer', handleAnswer);
      socket.off('webrtc:ice-candidate', handleCandidate);
    };
  }, [currentUserId, roomId]);

  async function toggleCamera() {
    const socket = getSocket();

    if (isCameraEnabled) {
      if (localStreamRef.current) {
        for (const track of localStreamRef.current.getTracks()) {
          track.stop();
        }
      }
      localStreamRef.current = null;
      setLocalStream(null);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      setIsCameraEnabled(false);
      socket.emit('participant:media', { roomId, isVideoEnabled: false });
      await refreshPeerConnections(false);
      return;
    }

    if (typeof navigator === 'undefined') {
      throw new Error('目前環境無法使用攝影機。');
    }

    if (!window.isSecureContext) {
      throw new Error('手機瀏覽器需要 HTTPS 或 localhost 才能開啟攝影機。');
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('這個瀏覽器不支援攝影機存取，或目前頁面不是安全連線。');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: false,
    });
    localStreamRef.current = stream;
    setLocalStream(stream);
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.muted = true;
      await localVideoRef.current.play().catch(() => undefined);
    }

    setIsCameraEnabled(true);
    socket.emit('participant:media', { roomId, isVideoEnabled: true });
    await refreshPeerConnections(true);
  }

  async function refreshPeerConnections(includeLocalTracks: boolean) {
    for (const [userId, connection] of peerConnectionsRef.current.entries()) {
      connection.close();
      peerConnectionsRef.current.delete(userId);
    }
    setRemoteStreams((current) => new Map(current));

    const targetParticipants = participants.filter((participant) => participant.userId !== currentUserId);
    for (const participant of targetParticipants) {
      await createOffer(participant.userId, includeLocalTracks);
    }
  }

  function createConnection(targetUserId: string, replaceExisting = false) {
    if (replaceExisting) {
      const existing = peerConnectionsRef.current.get(targetUserId);
      if (existing) {
        existing.close();
        peerConnectionsRef.current.delete(targetUserId);
      }
    }

    const existing = peerConnectionsRef.current.get(targetUserId);
    if (existing) {
      return existing;
    }

    const socket = getSocket();
    const connection = new RTCPeerConnection(rtcConfig);

    if (localStreamRef.current) {
      for (const track of localStreamRef.current.getTracks()) {
        connection.addTrack(track, localStreamRef.current);
      }
    }

    connection.onicecandidate = (event) => {
      if (!event.candidate) {
        return;
      }

      socket.emit('webrtc:ice-candidate', {
        roomId,
        targetUserId,
        candidate: event.candidate.toJSON(),
      });
    };

    connection.ontrack = (event) => {
      const [stream] = event.streams;
      if (!stream) {
        return;
      }
      setRemoteStreams((current) => {
        const next = new Map(current);
        next.set(targetUserId, stream);
        return next;
      });
    };

    connection.onconnectionstatechange = () => {
      if (
        connection.connectionState === 'closed' ||
        connection.connectionState === 'failed' ||
        connection.connectionState === 'disconnected'
      ) {
        setRemoteStreams((current) => {
          const next = new Map(current);
          next.delete(targetUserId);
          return next;
        });
      }
    };

    peerConnectionsRef.current.set(targetUserId, connection);
    return connection;
  }

  async function createOffer(targetUserId: string, includeLocalTracks: boolean) {
    const connection = createConnection(targetUserId, true);
    if (!includeLocalTracks && localStreamRef.current) {
      for (const sender of connection.getSenders()) {
        if (sender.track) {
          connection.removeTrack(sender);
        }
      }
    }
    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);
    getSocket().emit('webrtc:offer', {
      roomId,
      targetUserId,
      sdp: offer,
    });
  }

  return {
    isCameraEnabled,
    localVideoRef,
    localStream,
    remoteStreams,
    toggleCamera,
  };
}
