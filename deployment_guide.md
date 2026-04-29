# SignSync Deployment Guide

Deploying a full-stack application like SignSync requires hosting the **Frontend** (React/Vite), the **Backend** (Node.js/Express), and the **Database** (Supabase). Since you are already using Supabase, your database is effectively already hosted!

Here is the most robust, cost-effective, and industry-standard approach for deploying your stack.

---

## Architecture Overview

1. **Frontend (Client)**: Best hosted on **Vercel** or **Netlify**. These platforms specialize in static site generation and React/Vite builds. They offer global CDNs, automatic SSL, and continuous integration via GitHub.
2. **Backend (Server)**: Best hosted on **Render** or **Railway**. These platforms are ideal for Node.js APIs. They will spin up a container for your Express server and keep it running to handle API requests.
3. **Database**: Already hosted on **Supabase**.

---

## Step 1: Prepare Your Code for Production

Before deploying, you must ensure your application is configured to handle production environments, specifically regarding **Environment Variables** and **CORS** (Cross-Origin Resource Sharing).

### Backend Preparations (`server/`)
1. **Dynamic Ports**: Your Express server must listen to the port provided by the hosting provider, not just `3000`.
   ```javascript
   const PORT = process.env.PORT || 3000;
   app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
   ```
2. **CORS Configuration**: Your backend must accept requests from your future production frontend URL (e.g., `https://signsync.vercel.app`).
   ```javascript
   const cors = require("cors");
   app.use(cors({
     origin: process.env.FRONTEND_URL || "http://localhost:5173",
     credentials: true
   }));
   ```
3. **Start Script**: Ensure your `package.json` in the `server` folder has a valid start script:
   ```json
   "scripts": {
     "start": "node src/server.js",
     "dev": "nodemon src/server.js"
   }
   ```

### Frontend Preparations (`client/`)
1. **Dynamic API URL**: Your frontend needs to know where to send API requests. In production, it should point to your live backend URL, not `http://localhost:3000`. 
   Update your `client/src/api.js` (or similar file) to use an environment variable:
   ```javascript
   import axios from "axios";
   
   export const API = axios.create({
     baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
   });
   ```

---

## Step 2: Deploy the Backend (Render)

We recommend **Render.com** for the backend because their "Web Service" tier is easy to configure and offers a free tier.

1. Create an account on [Render.com](https://render.com/) and connect your GitHub repository.
2. Click **New +** and select **Web Service**.
3. Select your SignSync repository.
4. Configure the following settings:
   - **Name**: `signsync-api` (or similar)
   - **Root Directory**: `server` *(Crucial: This tells Render your backend is in the `server` folder)*
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. **Environment Variables**: Add your backend `.env` variables under the Environment tab:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_KEY`: Your Supabase service/anon key
   - `FRONTEND_URL`: Leave blank for now (you will update this in Step 4)
6. Click **Create Web Service**. Render will give you a live URL (e.g., `https://signsync-api.onrender.com`). Copy this URL.

---

## Step 3: Deploy the Frontend (Vercel)

We recommend **Vercel** for Vite/React frontends due to its unmatched speed and zero-configuration setup.

1. Create an account on [Vercel.com](https://vercel.com/) and connect your GitHub repository.
2. Click **Add New...** -> **Project**.
3. Import your SignSync repository.
4. Configure the following settings:
   - **Project Name**: `signsync`
   - **Framework Preset**: `Vite`
   - **Root Directory**: `client` *(Crucial: This tells Vercel to only build the frontend)*
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. **Environment Variables**: Open the Environment Variables dropdown and add:
   - `VITE_API_URL`: Paste the Render backend URL you copied in Step 2 (e.g., `https://signsync-api.onrender.com`).
6. Click **Deploy**. Vercel will build your React app and provide a live URL (e.g., `https://signsync.vercel.app`). Copy this URL.

---

## Step 4: Finalize Configurations

Now that both the frontend and backend are live, you need to connect them securely.

1. **Update Backend CORS**: Go back to your Render dashboard, navigate to your `signsync-api` service, and go to the **Environment** tab.
2. Update or add the `FRONTEND_URL` variable to your new Vercel URL (e.g., `https://signsync.vercel.app`). This ensures your backend will only accept requests from your actual frontend.
3. **Supabase Authentication**: If you are using Supabase Auth (Sign in with Google/Email), you must whitelist your new Vercel URL in Supabase.
   - Go to your Supabase Dashboard -> **Authentication** -> **URL Configuration**.
   - Set your **Site URL** to your Vercel URL (e.g., `https://signsync.vercel.app`).

> [!IMPORTANT]
> **Database Security**
> Since your database is already hosted on Supabase, ensure that you have configured **Row Level Security (RLS)** policies so that malicious users cannot access data directly via your Supabase anon key from the frontend.

## Verification Checklist
- [ ] Backend is running on Render and responds to health checks.
- [ ] Frontend is live on Vercel and loads without errors.
- [ ] Creating an account or logging in works (CORS and Supabase URLs are correctly configured).
- [ ] The Admin Dashboard charts and data load correctly.
