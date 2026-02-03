# PM2 Configuration Guide

## Session Store Requirements for PM2 Clusters

### Critical Issue: Session Drift with Multiple Instances

When running PM2 with multiple instances (`instances > 1`), each instance maintains its own in-memory session store. This causes **session drift** where:

- User authenticates on Instance A → session stored in Instance A's memory
- Next request goes to Instance B → Instance B doesn't have the session → 401 Unauthorized
- User sees "Data Ghosting" - files appear/disappear randomly

### Solution: Redis Session Store

**Redis is REQUIRED** when using PM2 clusters with multiple instances.

## Configuration Options

### Option 1: Use Redis (Recommended for Production)

1. **Install Redis:**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install redis-server
   
   # macOS
   brew install redis
   ```

2. **Install Node.js Redis packages:**
   ```bash
   cd backend
   npm install connect-redis redis
   ```

3. **Set Environment Variable:**
   ```bash
   export REDIS_URL=redis://localhost:6379
   # Or in .env file:
   REDIS_URL=redis://localhost:6379
   ```

4. **Start Redis:**
   ```bash
   redis-server
   ```

5. **Start PM2 with Multiple Instances:**
   ```bash
   pm2 start dist/server.js --name "secure-api" --instances 4
   ```

The backend will automatically detect `REDIS_URL` and use Redis for session storage.

### Option 2: Single Instance (If Redis Unavailable)

If Redis is not available, **MUST** run PM2 with a single instance:

```bash
pm2 start dist/server.js --name "secure-api" --instances 1
```

**Warning:** Using multiple instances without Redis will cause session drift and data ghosting.

### Option 3: Sticky Sessions via Nginx (Alternative)

If Redis is unavailable but you need multiple instances, configure Nginx with sticky sessions:

```nginx
upstream backend {
    ip_hash;  # Sticky sessions based on IP
    server localhost:3000;
    server localhost:3001;
    server localhost:3002;
}
```

**Note:** This is less reliable than Redis and may still cause issues if user IP changes.

## Verification

### Check Session Store in Use

On server startup, check logs:

- **Redis:** `[SESSION] Using Redis session store`
- **MemoryStore:** `[SESSION] Using MemoryStore (set REDIS_URL to use Redis for PM2 clusters)`

### Monitor Session Debug Logs

The `/api/files` and `/api/files/trash` endpoints log:
```
[SESSION DEBUG] UserID: <user-id> | SessionID: <session-id> | TenantID: <tenant-id>
```

**If UserID or SessionID changes between requests**, this indicates session drift.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REDIS_URL` | No | - | Redis connection URL (e.g., `redis://localhost:6379`) |
| `SESSION_SECRET` | No | `dev_session_secret_only` | Secret for session signing |

## Troubleshooting

### Issue: Sessions Not Persisting Across Instances

**Symptom:** User gets 401 Unauthorized randomly, files appear/disappear

**Cause:** PM2 running multiple instances without Redis

**Fix:** 
1. Set `REDIS_URL` environment variable
2. Install `connect-redis` and `redis` packages
3. Restart PM2

### Issue: Redis Connection Failed

**Symptom:** Log shows "Redis connection failed, falling back to MemoryStore"

**Fix:**
1. Verify Redis is running: `redis-cli ping` (should return `PONG`)
2. Check `REDIS_URL` format: `redis://localhost:6379`
3. Check firewall/network connectivity

### Issue: User ID Mismatch

**Symptom:** Files not showing for user with `#EXT#` in ID

**Cause:** User ID normalization not applied consistently

**Fix:** Already handled in code - `normalizeUserId()` is applied in auth middleware

## Production Checklist

- [ ] Redis installed and running
- [ ] `REDIS_URL` environment variable set
- [ ] `connect-redis` and `redis` packages installed
- [ ] PM2 started with multiple instances (if needed)
- [ ] Session debug logs show consistent UserID/SessionID
- [ ] No "Data Ghosting" symptoms observed

## References

- [Express Session Redis Store](https://github.com/tj/connect-redis)
- [PM2 Cluster Mode](https://pm2.keymetrics.io/docs/usage/cluster-mode/)
- [Redis Documentation](https://redis.io/docs/)
