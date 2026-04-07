# ChatRTC

ChatRTC 是一個即時聊天室原型專案。

## 已完成版本

### v0.1

- NestJS + Socket.IO 後端 API
- 房間建立、加入、離開與訊息傳送
- WebRTC signaling

### v0.2

- 首頁可建立房間、列出房間
- 房間頁提供即時文字聊天
- 他人訊息顯示在右側，自己訊息顯示在左側，頭像位於訊息最外側
- 開啟視訊後，訊息旁頭像切換成即時畫面

## 專案結構

- `backend/` NestJS + Socket.IO API
- `frontend/` React + Vite 使用者介面
- `docker-compose.yml` 本機開發環境

## 本機開發

### 使用 Docker Compose

```bash
docker compose up --build
```

- 前端: `http://localhost:5173`
- 後端: `http://localhost:3001`

### 個別啟動

後端:

```bash
cd backend
npm install
npm run start:dev
```

前端:

```bash
cd frontend
npm install
npm run dev
```

## 驗證過的 build 指令

```bash
cd backend && npm run build
cd frontend && npm run build
```