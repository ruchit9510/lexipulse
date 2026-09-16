# Publishing LexiPulse with Your GoDaddy Domain (Render Guide)

This guide walks you through publishing your LexiPulse app to the web for free (or low cost) with automatic HTTPS/SSL and connecting your GoDaddy domain.

---

## Overview of the Steps

```
LexiPulse Code (Local)
       ↓
GitHub Repository (Private)
       ↓
Render.com (Free Web Service + Auto HTTPS)
       ↓
GoDaddy DNS (CNAME / A Records)
       ↓
Google Cloud Console (Add production Redirect URI)
       ↓
Live at https://yourdomain.com 🎉
```

---

## Step 1: Push Code to GitHub

1. Open your terminal in `d:\Learning\Vocabulary`:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of LexiPulse daily vocabulary app"
   ```

2. Go to **[GitHub.com](https://github.com)** and click **New Repository**:
   - Repository name: `lexipulse` (or `vocabulary-app`)
   - Visibility: **Private** (recommended)
   - Click **Create repository**

3. Push your code:
   ```bash
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/lexipulse.git
   git branch -M main
   git push -u origin main
   ```

---

## Step 2: Deploy on Render

1. Go to **[Render.com](https://render.com)** and sign in (or create a free account using your GitHub account).
2. Click **New +** in the top right and select **Web Service**.
3. Select your `lexipulse` repository.
4. Configure the service settings:
   - **Name**: `lexipulse` (or your preferred name)
   - **Region**: Choose the closest region (e.g., Singapore, Frankfurt, Oregon, etc.)
   - **Branch**: `main`
   - **Root Directory**: *(leave blank)*
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

5. Scroll down to **Environment Variables** and add:
   - `GOOGLE_CLIENT_ID`: `<YOUR_GOOGLE_CLIENT_ID>`
   - `GOOGLE_CLIENT_SECRET`: `<YOUR_GOOGLE_CLIENT_SECRET>`
   - `GOOGLE_REDIRECT_URI`: `https://yourdomain.com/api/google/callback` *(replace with your actual domain)*
   - `PORT`: `3000`

6. Click **Deploy Web Service**.
   Render will build the React frontend, start the Express server, and give you a free URL like:
   `https://lexipulse.onrender.com`

---

## Step 3: Connect Your GoDaddy Domain

1. In your **Render Dashboard**, go to your service → **Settings** → **Custom Domains**.
2. Click **Add Custom Domain** and enter:
   - `yourdomain.com` (and `www.yourdomain.com`)
3. Render will display the DNS records you need to add to GoDaddy:
   - Typically:
     - **CNAME** record for `www` pointing to `lexipulse.onrender.com`
     - **A Record** for `@` pointing to Render's IP address (Render displays this on screen)

4. In **GoDaddy**:
   - Log in to your [GoDaddy Domain Portfolio](https://dcc.godaddy.com/manage).
   - Click on your domain → go to the **DNS** tab.
   - Under **DNS Records**:
     - Edit or Add the **A** record:
       - **Name**: `@`
       - **Value**: *(The IP address provided by Render)*
       - **TTL**: `1/2 Hour` or default
     - Edit or Add the **CNAME** record:
       - **Name**: `www`
       - **Value**: `lexipulse.onrender.com` *(or the custom target shown in Render)*
       - **TTL**: `1/2 Hour`
   - Save the records.

Render will automatically provision a **free SSL/HTTPS certificate** within a few minutes!

---

## Step 4: Add Production Redirect URI in Google Cloud Console

1. Open your **Google Cloud Console Credentials Page**:
   👉 **[https://console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)**
2. Click your OAuth 2.0 Client ID:
   *(Select your Web Application client)*
3. Under **Authorized redirect URIs**, click **+ ADD URI** and add:
   ```text
   https://yourdomain.com/api/google/callback
   ```
   *(Also add `https://www.yourdomain.com/api/google/callback` if using www)*
4. Under **Authorized JavaScript origins**, click **+ ADD URI** and add:
   ```text
   https://yourdomain.com
   https://www.yourdomain.com
   ```
5. Click **SAVE**.

---

## Step 5: Test & Enjoy

Visit **`https://yourdomain.com`** on your phone, tablet, or laptop:
- Click **[ Connect Google Drive ]**.
- Your app is now accessible 24/7 from anywhere in the world!
- Gemini will continue appending 5 words daily, and LexiPulse will auto-sync them directly from Google Drive.
