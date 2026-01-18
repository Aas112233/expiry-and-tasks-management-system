# InfinityFree Deployment Guide

Your backend is successfully running at: `https://expiry-system-api.onrender.com/api`

## Step 1: Build the Frontend locally
Run these commands in your project root (not the server folder):
```bash
npm install
npm run build
```

## Step 2: Prepare for InfinityFree
1. After building, you will have a `dist` folder.
2. Inside the `dist` folder, create a new file named `.htaccess` (This is required for React routing to work on Apache/InfinityFree).
3. Paste this content into `.htaccess`:
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /index.html [L]
</IfModule>
```

## Step 3: Upload to InfinityFree
1. Log in to your InfinityFree File Manager or use an FTP client (like FileZilla).
2. Go to the `htdocs` folder.
3. Upload **everything** from your local `dist` folder (including the new `.htaccess`) directly into `htdocs`.

## Step 4: Verify
Visit your InfinityFree URL! The app should now be loading data from your Render backend.
