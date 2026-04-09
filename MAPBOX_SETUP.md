# 🗺️ Mapbox Configuration Guide

## Overview

This project uses Mapbox GL JS for interactive mapping. The Mapbox API token is injected **securely** into the frontend via environment variables - **never hardcoded in source code**.

---

## 🔒 Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  1. Environment Variable (Never committed to Git)            │
│     MAPBOX_TOKEN=pk.eyJ1IjoiYWx0...                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  2. app/core/config.py (Python)                             │
│     os.getenv("MAPBOX_TOKEN", "")                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  3. app/main.py - /config.js Route (FastAPI)               │
│     Injects token into JavaScript config                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Frontend: window.APP_CONFIG.MAPBOX_TOKEN                │
│     Used by Mapbox GL JS library                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Local Development Setup

### 1. Get a Mapbox Token

- Visit: https://account.mapbox.com/
- Sign up (free account available)
- Create a new API token with `gl:read` scope
- Copy the token (starts with `pk.eyJ1...`)

### 2. Create `.env` File (Not Committed)

```bash
# Create local .env file
cp .env.example .env
```

### 3. Add Your Token to `.env`

Edit `.env` and replace:

```env
MAPBOX_TOKEN=pk.eyJ1IjoieourActualTokenHere...
```

⚠️ **CRITICAL**: Never commit `.env` file! It's in `.gitignore`

### 4. Start the Server

```bash
python -m uvicorn app.main:app --reload
```

The Mapbox token will be:
1. Read from `.env`
2. Injected into `/config.js`
3. Available to frontend as `window.APP_CONFIG.MAPBOX_TOKEN`

---

## 🌍 Production Deployment

### On Railway/Render/Heroku/Any Platform:

1. **Add Environment Variable** to deployment platform:
   - Key: `MAPBOX_TOKEN`
   - Value: Your actual token

2. **Never**:
   - Commit `.env` to GitHub
   - Put tokens in `.env.example`
   - Hardcode tokens in source code

3. **Platform Examples**:

**Railway:**
```
Dashboard → Project → Variables → Add new environment variable
MAPBOX_TOKEN=pk.eyJ1...
```

**Render:**
```
Dashboard → Service → Environment → Add secret
MAPBOX_TOKEN=pk.eyJ1...
```

---

## ✅ Troubleshooting

### Map Not Loading

**Check 1: Missing Token in `.env`**
```bash
# View your .env file
cat .env
# Should have: MAPBOX_TOKEN=pk.eyJ1...
```

**Check 2: Invalid Token Format**
- Token should start with `pk.eyJ1`
- Verify at: https://account.mapbox.com/tokens

**Check 3: Browser Console**
```javascript
// In browser DevTools console:
console.log(window.APP_CONFIG)
// Should show: { MAPBOX_TOKEN: "pk.eyJ1...", API_BASE: "..." }
```

**Check 4: Verify Server Injection**
```bash
# Visit in browser:
http://localhost:8000/config.js
# Should contain: MAPBOX_TOKEN: "pk.eyJ1..."
```

### Frontend Shows Error

```
"Configure a variável de ambiente MAPBOX_TOKEN para carregar o mapa Mapbox."
```

**Solution:**
1. Ensure `.env` file exists with `MAPBOX_TOKEN=pk.eyJ1...`
2. Restart the server: `uvicorn app.main:app --reload`
3. Hard refresh browser: `Ctrl+Shift+Delete` or `Cmd+Shift+Delete`

---

## 🔐 Security Best Practices

✅ **DO:**
- Store token in environment variables
- Use `.env` file locally (not committed)
- Restrict token permissions to `gl:read` minimum
- Rotate token if exposed
- Use platform's secret management for production

❌ **DON'T:**
- Hardcode token in JavaScript
- Commit `.env` file to Git
- Share token via email/chat
- Use tokens with excessive permissions
- Leave old tokens active

---

## 📝 File Checklist

```
✅ .env.example          - Has placeholder: MAPBOX_TOKEN=your_mapbox_token_here
✅ .env                  - Local only, in .gitignore, has real token
✅ .gitignore            - Includes: .env
✅ app/core/config.py    - Reads: os.getenv("MAPBOX_TOKEN", "")
✅ app/main.py           - Injects: f'MAPBOX_TOKEN: {json.dumps(...)}'
✅ app/frontend/static/script.js - Uses: window.APP_CONFIG?.MAPBOX_TOKEN
```

---

## 🚨 If Token is Exposed

1. **Immediately revoke** the exposed token at https://account.mapbox.com/tokens
2. **Create a new token**
3. **Update deployment platform** with new token
4. **Remove from Git history** (contact DevOps if needed)

---

## 📚 References

- [Mapbox Documentation](https://docs.mapbox.com/)
- [Mapbox API Tokens](https://docs.mapbox.com/accounts/concepts/tokens/)
- [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/)
