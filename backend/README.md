# ChatRTC API v0.1

NestJS + Socket.IO API，提供房間管理、聊天室訊息與 WebRTC signaling。

## 啟動

### Docker Compose

```bash
docker compose up --build
```

API 預設在 `http://localhost:3001`。

### 本機

```bash
cd backend
npm install
npm run start:dev
```

## REST API

- `GET /rooms` 取得房間列表
- `GET /rooms/:roomId` 取得房間細節與目前成員、訊息
- `POST /rooms` 建立房間
- `POST /rooms/:roomId/join` 以 HTTP 加入房間
- `POST /rooms/:roomId/leave` 離開房間

建立房間 body:

```json
{
  "name": "Daily Standup"
}
```

加入房間 body:

```json
{
  "displayName": "Tow",
  "userId": "optional-stable-user-id"
}
```

## Socket Events

Client emit:

- `room:join` `{ roomId, displayName, userId? }`
- `room:leave` `void`
- `chat:send` `{ roomId, message }`
- `participant:media` `{ roomId, isVideoEnabled }`
- `webrtc:offer` `{ roomId, targetUserId, sdp }`
- `webrtc:answer` `{ roomId, targetUserId, sdp }`
- `webrtc:ice-candidate` `{ roomId, targetUserId, candidate }`

Server emit:

- `room:joined`
- `room:presence`
- `chat:message`
- `participant:media`
- `webrtc:offer`
- `webrtc:answer`
- `webrtc:ice-candidate`

`participant:media` 可用於前端在每個使用者卡片上顯示是否開啟視訊，再搭配 WebRTC stream 投射到頭像框區域。