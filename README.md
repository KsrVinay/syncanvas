# ✨ SyncCanvas — Real-Time Collaborative Whiteboard  
### Built by **Sri Ram Vinay**

SyncCanvas is a real-time collaborative whiteboard that lets multiple users draw together instantly in the same room.  
It supports live drawing, cursor tracking, clearing the board, and room-based collaboration — all powered by WebSockets.

This project was built end-to-end using **React + Vite** for the frontend and **FastAPI + WebSockets** for the backend.  
The backend is deployed on **Render**, and the frontend on **Vercel**.

---

## 🚀 Live Demo

### 🔹 Frontend (Vercel)  
https://syncanvas.vercel.app  

### 🔹 Backend (Render)  
https://syncanvas.onrender.com  

---

## 🎯 Key Features

### 🖍️ Real-Time Drawing  
- Smooth strokes and instant updates  
- Works across multiple users and devices  

### 👥 Multi-User Rooms  
- Join using a Room ID  
- See who is active inside the room  
- Each user gets a unique cursor indicator  

### 🖱️ Live Cursor Tracking  
- Every user can see other users’ cursor movements

### 🔄 Robust WebSocket Sync  
- Auto reconnect  
- Queues messages when socket is not open  
- Broadcasts strokes, cursor data, clear events, and join/leave events  

### 🌐 Fully Deployed  
- Frontend on **Vercel**  
- Backend on **Render**  
- Environment variables configured  
- Production-ready WebSocket connection  

---

## 🧰 Tech Stack

**Frontend**  
- React (Vite)  
- TailwindCSS  
- Custom WebSocket hook  
- Vercel deployment  

**Backend**  
- FastAPI  
- WebSockets  
- Uvicorn  
- Python-dotenv  
- Render deployment  

---

## 📸 Screenshots

> (Your screenshots folder should be placed at:  
> `syncanvas/screenshots/`)

```
/screenshots
  ├── homepage.png
  └── drawing.png
```

### 🏠 Homepage  
![Homepage](./screenshots/homepage.png)

### 🎨 Drawing Board  
![Drawing](./screenshots/drawing.png)

---

## 🛠️ Local Setup

### 1️⃣ Clone the Repo
```bash
git clone https://github.com/KsrVinay/syncanvas
cd syncanvas
```

---

## 🔧 Backend Setup (FastAPI)

```bash
cd syncanvas-backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Runs at:  
http://localhost:8000

---

## 🎨 Frontend Setup (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Runs at:  
http://localhost:3000

---

## 🌍 Environment Variable (Frontend)

Vercel uses:

```
VITE_BACKEND_URL = https://syncanvas.onrender.com
```

Used inside the WebSocket client:

```js
const base = import.meta.env.VITE_BACKEND_URL.replace("http", "ws");
```

---

## 🧪 How to Test

1. Open the frontend link  
2. Enter Room ID + Username  
3. Join the board  
4. Open the same room in another browser 
5. Draw on both — strokes should sync live  
6. Move your cursor — other users see it instantly  
7. Use Clear button — updates for all users  
8. Change your pen color and can be undo, redo
9. There is an option for changing the tool bar to darkmode

---

## 🏆 Why This Project Is Strong

- Shows real-time backend experience  
- Demonstrates WebSocket handling and event routing  
- Clean, modular frontend + backend structure  
- Fully deployed full-stack project  
- Professional production setup (Vercel + Render)

---

## 📄 MIT License

```
MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
```

---

### 🙌 Author  
**Sri Ram Vinay**  
GitHub: https://github.com/KsrVinay  

