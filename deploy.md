# Visual Whiteboard Pro — Deployment Guide

This document outlines the step-by-step procedure to deploy the **Visual Whiteboard Pro** application to production.

---

## Architecture Overview

```
 ┌────────────────────────────────────────────────────────┐
 │                   Frontend (React + FabricJS)          │
 │                   Hosted on Vercel / Netlify           │
 └───────────────────────────┬────────────────────────────┘
                             │
                             │ HTTPS / WSS
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │                 Backend (Express + Socket.io)          │
 │                 Hosted on Render / Railway             │
 └─────────────┬─────────────────────────────┬────────────┘
               │                             │
               │ Mongoose                    │ Redis Protocol
               ▼                             ▼
 ┌───────────────────────────┐ ┌──────────────────────────┐
 │      MongoDB Atlas        │ │      Upstash Redis       │
 │      (Shared Cloud)       │ │     (Cache & Pub/Sub)    │
 └───────────────────────────┘ └──────────────────────────┘
```

---

## Pre-requisites & Accounts Needed
Before starting, create free accounts on the following platforms:
1. **MongoDB Atlas** (for the database)
2. **Upstash** or **Render** (for Redis caching and Pub/Sub room synchronization)
3. **Render** or **Railway** (for hosting the Backend server)
4. **Vercel** or **Netlify** (for hosting the React Frontend client)

---

## Step 1: Database Setup (MongoDB Atlas)

The production server requires a cloud-hosted MongoDB cluster.

1. Log into [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a new **Shared Cluster** (free tier M0 cluster).
3. Under **Network Access**, add `0.0.0.0/0` (allow access from anywhere) to let Render/Railway servers connect.
4. Under **Database Access**, create a user with a secure password (e.g., `db_user` and `db_password`).
5. Click **Connect** -> **Connect your application** and copy the Connection String:
   `mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/visual_whiteboard?retryWrites=true&w=majority`
6. Replace `<username>` and `<password>` with your created database credentials. Save this URI for the backend configuration.

---

## Step 2: Caching Setup (Upstash Redis)

Redis is used to sync canvas page state and Socket.io events across scaled backend instances.

1. Go to [Upstash](https://upstash.com/) and create a new **Redis Database**.
2. Copy the **Redis URL** (`redis://default:password@endpoint.upstash.io:port`).
3. If you want to skip Redis, the backend will automatically fall back to **in-memory mode** when the connection is unavailable, but Redis is highly recommended for collaborative stability.

---

## Step 3: Backend Deployment (Render)

We will deploy the Node.js/Express server to **Render** as a Web Service.

1. Push your latest code changes to a Git repository (GitHub/GitLab).
2. Log into [Render Dashboard](https://dashboard.render.com/) and click **New** -> **Web Service**.
3. Connect your repository containing `Visual Whiteboard Pro`.
4. Configure the Web Service settings:
   * **Name**: `visual-whiteboard-backend`
   * **Region**: Choose the closest region to your users.
   * **Root Directory**: `server` (crucial, since the backend code is in the `/server` folder)
   * **Runtime**: `Node`
   * **Build Command**: `npm install`
   * **Start Command**: `npm start`
5. Click **Advanced** and add the following Environment Variables:
   
   | Key | Value | Description |
   |:---|:---|:---|
   | `NODE_ENV` | `production` | Sets the application to production mode. |
   | `MONGO_URI` | *Your MongoDB Atlas Connection String* | Database connection string. |
   | `JWT_SECRET` | *Generates a random secure key* | Key used to sign user auth tokens (e.g. `s3cr3t_123_abc`). |
   | `REDIS_URL` | *Your Upstash Redis URL* | (Optional) Redis cache link. |
   | `PORT` | `10000` | Port to start the server (Render defaults to this). |

6. Deploy the Web Service. Once active, note the deployed URL (e.g., `https://visual-whiteboard-backend.onrender.com`).

---

## Step 4: Frontend API Config

To support production domains, configure the frontend to talk to your production backend instead of `localhost`.

1. To enable dynamic routing, update the API request targets in `frontend/src/App.jsx` and component files to use an environment variable:
   ```javascript
   const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
   ```
2. Make sure calls like `fetch('http://localhost:4000/api/auth/me')` are changed to `fetch(`${API_BASE_URL}/api/auth/me`)`.
3. Make sure the Socket.io initialization:
   ```javascript
   const socket = io('http://localhost:4000', ...);
   ```
   is changed to:
   ```javascript
   const socket = io(API_BASE_URL, ...);
   ```

---

## Step 5: Frontend Deployment (Vercel)

We will deploy the Vite + React frontend to **Vercel**.

1. Log into [Vercel](https://vercel.com).
2. Click **Add New** -> **Project** and import your Git repository.
3. Configure the Project:
   * **Root Directory**: `frontend` (crucial, since the client React app is in `/frontend`)
   * **Framework Preset**: `Vite`
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
4. Expand the **Environment Variables** section and add:
   * **Key**: `VITE_API_URL`
   * **Value**: `https://visual-whiteboard-backend.onrender.com` (your deployed backend Render URL)
5. Click **Deploy**. Vercel will build the frontend assets and provide you with a production URL (e.g., `https://visual-whiteboard-pro.vercel.app`).

---

## Step 6: Post-Deployment Testing

Once both services are running:

1. Visit your Vercel frontend URL.
2. Sign up with a test account.
3. Create a whiteboard and attempt to draw shapes.
4. Open the whiteboard link in an incognito window (or share it) to verify real-time Socket.io collaboration is working correctly.
5. Upload a document attachment to an object's context panel to check if file storage works.
