export type Participant = {
  userId: string;
  displayName: string;
  isVideoEnabled: boolean;
  joinedAt: string;
};

export type ChatMessage = {
  id: string;
  userId: string;
  displayName: string;
  message: string;
  sentAt: string;
};

export type Room = {
  id: string;
  name: string;
  createdAt: string;
  participants: Participant[];
  messages: ChatMessage[];
};

export type JoinRoomResult = {
  room: Room;
  participant: Participant;
};

export type PresenceEvent = {
  type: 'joined' | 'left';
  participant: Participant;
  roomId: string;
  deleted?: boolean;
};

export type MediaEvent = {
  roomId: string;
  participant: Participant;
};
