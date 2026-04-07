import { useEffect, useRef } from 'react';

type ParticipantAvatarProps = {
  label: string;
  stream?: MediaStream;
  isLive: boolean;
  mirrored?: boolean;
};

export function ParticipantAvatar({
  label,
  stream,
  isLive,
  mirrored = false,
}: ParticipantAvatarProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (!stream || !isLive) {
      video.srcObject = null;
      return;
    }

    video.srcObject = stream;
    void video.play().catch(() => undefined);
  }, [isLive, stream]);

  const fallback = label.slice(0, 1).toUpperCase() || '?';

  return (
    <div className={`avatar-shell ${isLive ? 'avatar-live' : ''}`}>
      {isLive && stream ? (
        <video
          className={`avatar-video ${mirrored ? 'avatar-video-mirror' : ''}`}
          ref={videoRef}
          muted={mirrored}
          playsInline
        />
      ) : (
        <div className="avatar-fallback">{fallback}</div>
      )}
    </div>
  );
}
