import { API_URL } from './config';
import type { Room } from '../types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

export function fetchRooms() {
  return request<Room[]>('/rooms');
}

export function fetchRoom(roomId: string) {
  return request<Room>(`/rooms/${roomId}`);
}

export function createRoom(name: string) {
  return request<Room>('/rooms', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}
