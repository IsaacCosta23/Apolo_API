# 🗺️ Mapbox Map Troubleshooting Guide

## 🔍 Problem Diagnosis: Map Not Loading in Production

### Root Cause (Already Identified)
```
❌ Local: .env exists with MAPBOX_TOKEN → Map works
❌ Production: .env NOT deployed → MAPBOX_TOKEN empty → Map fails
```

---

## 🚨 Key Discovery

Your `.env` file is **correctly ignored by Git** for security, but this means:

```
Local Development        │  Production (Render/Railway)
─────────────────────────┼──────────────────────────────
✅ .env exists          │  ❌ .env doesn't exist
✅ Token: pk.eyJ1...    │  ❌ Token: "" (empty)
✅ Map loads            │  ❌ Map fails to load
```

---

## ✅ Solution: Environment Variables on Render/Railway

### For Render (Recommended):

1. **Go to Dashboard**
   - Select your project (Apolo_API)
   - Click "Environment"

2. **Add Secret Variable** (Render's secure vault):
   ```
   Key: MAPBOX_TOKEN
   Value: pk.eyJ1IjoieourActualTokenFromMapboxHere...
   ```

3. **Deploy** - The service will restart with the new variable

---

### For Railway:

1. **Go to Project → Variables**
2. **Add:**
   ```
   MAPBOX_TOKEN=pk.eyJ1...
   ```
3. **Redeploy**

---

## 🔧 Verification Steps

### Step 1: Check Backend Logs (After Deploy)

Look for these messages:

```
[CONFIG_DEBUG] Environment: production
[CONFIG_DEBUG] MAPBOX_TOKEN configured: True
[CONFIG_DEBUG] MAPBOX_TOKEN length: 255
[CONFIG_DEBUG] MAPBOX_TOKEN starts with pk.eyJ1: True
```

✅ If all `True` → Backend is OK
❌ If any `False` → Environment variable not set

---

### Step 2: Check Frontend (Browser Console)

Open browser DevTools (F12) and check console:

```javascript
// Go to your deployment: https://your-app.onrender.com
// Open Console (F12)
console.log(window.APP_CONFIG)
```

Should show:
```
{
  MAPBOX_TOKEN: "pk.eyJ1IjoieourActualTokenHere...",
  API_BASE: ""
}
```

❌ If empty: `{MAPBOX_TOKEN: "", API_BASE: ""}`
→ Variable not passed to backend

---

### Step 3: Check Network Request

In DevTools → Network tab:

1. Refresh page
2. Find request to: `config.js`
3. Check Response tab:

```javascript
// ✅ CORRECT:
window.APP_CONFIG = { 
  MAPBOX_TOKEN: "pk.eyJ1...", 
  API_BASE: "" 
};

// ❌ WRONG:
window.APP_CONFIG = { 
  MAPBOX_TOKEN: "", 
  API_BASE: "" 
};
```

---

## 🐛 Advanced Debugging

### Enable Verbose Logs:

Check browser console for detailed token debug info:

```
🗺️ Mapbox Token Debug: {
  from_config: "pk.eyJ1...",
  token_exists: true,
  token_length: 255,
  is_valid_format: true,
  config_object: {...}
}
```

### Map Error Message:

If token is empty, you'll see:

```
❌ MAPBOX_TOKEN não configurado!

📋 Para produção:
1. Obtenha um token em https://account.mapbox.com/
2. Configure como variável de ambiente no seu servidor
3. Reinicie a aplicação
```

---

## 📋 Checklist for Production Deploy

Before deployment:

```
✅ MAPBOX_TOKEN added to Render/Railway environment variables
✅ Token value starts with "pk.eyJ1"
✅ Token has "gl:read" permission on mapbox.com
✅ All other env vars set (DATABASE_URL, NODE_ENV, etc.)
✅ Services restarted after env changes
```

After deployment:

```
✅ Check server logs for [CONFIG_DEBUG] messages
✅ Open browser console and verify window.APP_CONFIG
✅ Check network request to /config.js
✅ Verify map initializes without errors
```

---

## 🎯 Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Map not loading | MAPBOX_TOKEN empty | Add to Render/Railway vars |
| "Configure MAPBOX_TOKEN" error | Token not passed to backend | Restart deploy after adding var |
| Console: `token_exists: false` | Config.js not loading token | Wait 5 mins, hard refresh (Ctrl+Shift+Del) |
| Map loads but styled wrong | Old cache | Hard refresh or incognito window |

---

## 🔐 Token Security Reminder

⚠️ **IMPORTANT:**
- The token in your local `.env` is REAL and SENSITIVE
- **NEVER** commit `.env` to Git (already in .gitignore)
- **DO** add the token to your deployment platform's secret vault
- Each platform has different UIs for managing secrets

---

## 📞 If Still Not Working:

1. **Take a screenshot** of:
   - Browser DevTools Console (F12 → Console tab)
   - Browser Network (F12 → Network → config.js response)

2. **Check deploy logs**:
   - Render/Railway dashboard → view build/runtime logs
   - Look for `[CONFIG_DEBUG]` messages

3. **Verify token**:
   - Go to https://account.mapbox.com/tokens
   - Confirm token exists and is active
   - Check permissions include `gl:read`

4. **Test locally first**:
   ```bash
   # Local: should work
   python -m uvicorn app.main:app --reload
   # Check: http://localhost:8000/config.js shows full token
   ```

---

## 🚀 After Fix: Deployment Flow

```
1. Add MAPBOX_TOKEN to Render/Railway variables
   ↓
2. Restart/Redeploy service
   ↓
3. Wait 2-3 minutes for deployment
   ↓
4. Open browser with hard refresh (Ctrl+Shift+Delete)
   ↓
5. Open DevTools Console (F12)
   ↓
6. Verify: window.APP_CONFIG.MAPBOX_TOKEN contains full token
   ↓
7. Map should load with heatmap 🗺️
```

---

## 📚 Reference Files

These files were enhanced with better debugging:

- `app/core/config.py` - Server-side debug logging
- `app/main.py` - Config.js endpoint logging
- `app/frontend/static/script.js` - Frontend token validation & debug output

All include detailed error messages to help identify where the issue is.
