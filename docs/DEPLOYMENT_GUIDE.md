# SCORM & H5P Authoring Studio — Deployment Guide (Vercel & Render)

This guide provides step-by-step instructions for deploying the **Frontend to Vercel** and the **Backend to Render**.

---

## Architecture Overview

```
[ User Browser ]
       |
       +---> [ Vercel ] (Frontend SPA: React 19 + Vite + Tailwind CSS v4)
       |       - Environment Variable: VITE_API_URL = https://<your-backend>.onrender.com
       |
       +---> [ Render ] (Backend API: Express 5 + Node.js + Prisma)
               - Environment Variable: CORS_ORIGIN = https://<your-frontend>.vercel.app
               - Environment Variable: DATABASE_URL = postgresql://...
```

---

## 1. Backend Deployment on Render

### Method A: Using Render Blueprint (Automatic 1-Click via `render.yaml`)
1. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** $\rightarrow$ **Blueprint**.
2. Connect your GitHub repository `https://github.com/extreemboost-ops/LMS-Studio`.
3. Render will automatically detect `render.yaml` and configure:
   - **Web Service:** `lms-studio-backend`
   - **Database:** `lms-studio-db` (Free PostgreSQL)
4. Click **Apply**.
5. Once deployed, copy your backend URL (e.g. `https://lms-studio-backend.onrender.com`).

### Method B: Manual Web Service Setup
If creating manually:
1. In Render, click **New +** $\rightarrow$ **Web Service**.
2. Select your repository `extreemboost-ops/LMS-Studio`.
3. Fill in settings:
   - **Name:** `lms-studio-backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run render-build`
   - **Start Command:** `npm run render-start`
   - **Health Check Path:** `/api/v1/health`
4. Add Environment Variables:
   | Variable | Value | Description |
   | :--- | :--- | :--- |
   | `NODE_ENV` | `production` | Production environment flag |
   | `PORT` | `10000` | Port assigned by Render |
   | `HOST` | `0.0.0.0` | Bind address |
   | `DATABASE_URL` | `postgresql://...` | Connection string of your PostgreSQL database |
   | `JWT_SECRET` | *(64-char random string)* | Secret for signing tokens |
   | `CORS_ORIGIN` | `https://your-frontend.vercel.app` | Vercel frontend URL |
5. Click **Deploy Web Service**.

---

## 2. Frontend Deployment on Vercel

1. Go to [Vercel Dashboard](https://vercel.com/) and click **Add New...** $\rightarrow$ **Project**.
2. Select repository `extreemboost-ops/LMS-Studio`.
3. Configure project settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `./`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. **Environment Variables:**
   Add:
   | Key | Value |
   | :--- | :--- |
   | `VITE_API_URL` | `https://lms-studio-backend.onrender.com` *(your Render backend URL)* |
5. Click **Deploy**.
6. Vercel will build the frontend using `vercel.json` (with single-page application routing rewrites).

---

## 3. Connecting Frontend & Backend (CORS)

After both are deployed:
1. In Render, open your Web Service $\rightarrow$ **Environment**.
2. Update `CORS_ORIGIN` with your actual Vercel domain:
   ```
   CORS_ORIGIN=https://lms-studio-xyz.vercel.app
   ```
3. In Vercel, verify `VITE_API_URL` points to your Render backend:
   ```
   VITE_API_URL=https://lms-studio-backend.onrender.com
   ```
4. Trigger a quick redeploy on both services.
