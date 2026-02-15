# Project Context & Known Issues

## Common Errors & Solutions

### 1. localStorage Key Mismatch
**Problem:** Admin pages can't access after login - token is `null`

**Cause:** Inconsistent localStorage key names
- Login page sets: `admin_token`
- Dashboard uses: `admin_token`
- New pages must use: `admin_token` (NOT `token`)

**Solution:** Always use `admin_token` for all admin authentication

**Code:**
```javascript
// ✓ Correct
const token = localStorage.getItem('admin_token');

// ✗ Wrong  
const token = localStorage.getItem('token');
```

### 2. Database Enum Fields
**Problem:** Save fails when updating design settings

**Database Enums:**
- `border_radius`: none, small, medium, large, full
- `shadow_style`: none, subtle, medium, dramatic

**Solution:** Use enum strings, NOT CSS values

### 3. Internal API fetch() Failures  
**Problem:** `fetch failed` error on cPanel

**Solution:** Use direct function calls instead of HTTP
```javascript
// ✗ Don't use internal HTTP calls
const res = await fetch(`${API_BASE_URL}/ai/context`);

// ✓ Use direct imports
const { buildAiContext } = require('../services/ai-context');
const context = await buildAiContext();
```

### 4. GitHub Actions --env-file Error
**Problem:** Build fails with `.env: not found`

**Solution:** Remove --env-file flag from package.json scripts

### 5. cPanel Restart Issues
**Problem:** Changes deployed but not working

**Solution:** 
```bash
pkill -f 'lsnode:.*lavprishjemmeside'
```
Then restart via cPanel UI

## Deployment Checklist
1. Use `git pull --rebase` before pushing
2. Check localStorage uses `admin_token`
3. Wait for GitHub Actions (~2 min)
4. Manually restart API if needed
