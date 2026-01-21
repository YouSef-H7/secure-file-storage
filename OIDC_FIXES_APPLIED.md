# OIDC Runtime Fixes - Applied Changes

## Summary
Applied targeted fixes to resolve OCI Identity Domain OIDC workflow issues without refactoring existing code. Focus on discovery URL handling, issuer validation flexibility, and detailed error logging.

## Changes Applied

### 1. ✅ Added OIDC_DISCOVERY_URL Support (config.ts)
**File:** `backend/src/config.ts`

Added new configuration export to support explicit discovery URL override:
```typescript
OIDC_DISCOVERY_URL: process.env.OIDC_DISCOVERY_URL || ''
```

**Why:** Allows operators to specify custom discovery URL when auto-construction from OIDC_ISSUER doesn't work (common with OCI's generic issuer domain).

---

### 2. ✅ Enhanced getOIDCConfig() Discovery Logic (oidc.ts)
**File:** `backend/src/services/oidc.ts` (lines 40-110)

**Changes:**
- Added `normalizeIssuer()` helper function to remove trailing slashes
- Modified discovery URL construction to check `OIDC_DISCOVERY_URL` first
- Falls back to `${OIDC_ISSUER}/.well-known/openid-configuration` if not set
- Added detailed logging for discovery endpoint and resolved configuration
- Added error logging with HTTP status codes

**Before:**
```typescript
const discoveryUrl = `${config.OIDC_ISSUER}/.well-known/openid-configuration`;
```

**After:**
```typescript
let discoveryUrl = config.OIDC_DISCOVERY_URL;
if (!discoveryUrl) {
  const issuer = normalizeIssuer(config.OIDC_ISSUER);
  discoveryUrl = `${issuer}/.well-known/openid-configuration`;
}
console.log('[OIDC] Fetching discovery from:', discoveryUrl);
```

**Impact:** Supports both explicit discovery URL and issuer-based construction.

---

### 3. ✅ Enhanced Token Exchange Error Handling (oidc.ts)
**File:** `backend/src/services/oidc.ts` (lines 160-205)

**Changes:**
- Added check for `id_token` field presence in response
- Added detailed HTTP status logging on token endpoint failures
- Added logging of response details (first 200 chars, field presence)
- Improved error messages with step identification

**Key additions:**
```typescript
console.log('[OIDC] Exchanging code for tokens at:', config_.tokenEndpoint);

if (!tokenResponse.id_token) {
  console.error('[OIDC] Token response missing id_token field:', Object.keys(tokenResponse));
  throw new Error('Token response missing id_token');
}

console.log('[OIDC] Successfully exchanged code for tokens');
```

**Impact:** Better visibility into token exchange failures.

---

### 4. ✅ Flexible Issuer Validation (oidc.ts)
**File:** `backend/src/services/oidc.ts` (lines 215-296)

**Changes:**
- Removed strict issuer validation from `jwt.verify` options
- Implemented manual issuer validation that accepts multiple issuer variants
- Compares both discovery issuer and normalized OIDC_ISSUER
- Handles OCI's generic issuer URL vs instance-specific URL

**Key additions:**
```typescript
const acceptableIssuers = [
  normalizeIssuer(expectedIssuer),      // from discovery
  normalizeIssuer(config.OIDC_ISSUER),  // from config
];

// Manual issuer validation
const tokenIssuer = normalizeIssuer(decoded.iss || '');
if (!acceptableIssuers.includes(tokenIssuer)) {
  console.error('[OIDC] Issuer mismatch:', {
    token_issuer: decoded.iss,
    normalized: tokenIssuer,
    acceptable_issuers: acceptableIssuers,
  });
  reject(new Error(`Issuer mismatch: got ${decoded.iss}, expected one of ${acceptableIssuers.join(', ')}`));
  return;
}
```

**Impact:** Accepts tokens from either generic or instance-specific issuer URLs.

---

### 5. ✅ Granular Error Logging (oidc.ts)
**File:** `backend/src/services/oidc.ts` (multiple functions)

**Added logging for each failure point:**

| Step | Error Detail Logged | Location |
|------|-------------------|----------|
| Discovery fetch | HTTP status | getOIDCConfig() |
| JWKS init | Initialization state | getOIDCConfig() |
| JWKS lookup | kid not found | validateIdToken() |
| Token signature | JWT error details | validateIdToken() |
| Issuer validation | Acceptable vs received | validateIdToken() |
| Nonce check | Expected vs received | validateIdToken() |
| Token expiry | exp value, current time | validateIdToken() |
| Token exchange HTTP | Status code + response | exchangeCodeForTokens() |
| ID token presence | Missing fields | exchangeCodeForTokens() |

**Format:** `[OIDC]` prefix for easy filtering, no secrets (tokens/secrets not logged)

**Example:**
```typescript
console.log('[OIDC] ID token validation successful for user:', decoded.sub);
console.error('[OIDC] Issuer mismatch:', { token_issuer: decoded.iss, acceptable_issuers: ... });
```

**Impact:** Production debugging now shows exact failure point with relevant context.

---

### 6. ✅ Documentation Update (.env.example)
**File:** `backend/.env.example` (lines 23-34)

**Added:**
```dotenv
# 1b. (OPTIONAL) Explicit OpenID Configuration Discovery URL
#     Only needed if your provider's discovery endpoint differs from the issuer URL.
#     OCI: The discovery document is actually served at the idcs-specific subdomain,
#          even if generic "https://identity.oraclecloud.com" is used elsewhere.
#     If set, this URL takes precedence over auto-construction from OIDC_ISSUER.
#     Format: https://idcs-<domain-id>.identity.oraclecloud.com/.well-known/openid-configuration
# OIDC_DISCOVERY_URL=https://idcs-YOUR-DOMAIN-ID.identity.oraclecloud.com/.well-known/openid-configuration
```

**Impact:** Operators understand when and how to use OIDC_DISCOVERY_URL override.

---

## Security Preserved

✅ All security checks remain intact:
- PKCE S256 validation (code_verifier challenge verification)
- State validation (prevent CSRF)
- Nonce validation (prevent token replay)
- ID token signature verification (JWKS client)
- Audience validation (client ID match)
- Token expiry check
- httpOnly secure cookies (session storage)

✅ No secrets logged:
- ID tokens not logged
- Access tokens not logged
- Client secret not logged
- Session data not logged

---

## Deployment Checklist

### For OCI Identity Domain Setup

If you're getting discovery or token validation errors, follow these steps:

1. **Determine your OCI Instance ID:**
   - Go to Oracle Cloud Console > Identity > Domains
   - Click your domain > Copy "Primary Domain URL"
   - Extract `idcs-XXXXXXX` from the URL

2. **Set OIDC_ISSUER in .env:**
   ```
   OIDC_ISSUER=https://idcs-XXXXXXX.identity.oraclecloud.com
   ```
   ⚠️ Include the instance ID, not the generic `https://identity.oraclecloud.com`

3. **Optional - If still getting discovery errors:**
   ```
   OIDC_DISCOVERY_URL=https://idcs-XXXXXXX.identity.oraclecloud.com/.well-known/openid-configuration
   ```

4. **Verify all OIDC env vars are set:**
   - OIDC_CLIENT_ID
   - OIDC_CLIENT_SECRET
   - OIDC_REDIRECT_URI (matches app registration)
   - OIDC_SCOPES

5. **Check application logs:**
   - Look for `[OIDC]` prefixed messages
   - They show exact failure point for debugging

---

## Testing the Fixes

### Endpoint: GET /auth/login
**Expected behavior:**
- Should log `[OIDC] Fetching discovery from:` 
- Should log `[OIDC] Discovery endpoints resolved:`
- Should redirect to OCI login page (no 500 error)

**If still 500:**
- Check OIDC_ISSUER format (must be `https://idcs-XXX.identity.oraclecloud.com`)
- Check OIDC_DISCOVERY_URL override is correct
- Check network connectivity to issuer domain

### Endpoint: GET /auth/callback?code=...&state=...
**Expected behavior:**
- Should log `[OIDC] Exchanging code for tokens at:`
- Should log `[OIDC] Successfully exchanged code for tokens`
- Should log `[OIDC] Validating ID token | acceptable issuers:...`
- Should log `[OIDC] ID token validation successful for user:`
- Response should set session cookie and redirect

**If validation fails:**
- Check nonce mismatch → session cookie timing
- Check issuer mismatch → verify OIDC_ISSUER format matches OCI instance
- Check signature failure → JWKS endpoint issue (check if jwks_uri is correct)

---

## Backward Compatibility

✅ All changes are **backward compatible:**
- If OIDC_DISCOVERY_URL not set, falls back to OIDC_ISSUER-based construction (existing behavior)
- Issuer validation is more lenient (accepts multiple formats)
- Error logging is additive (no breaking changes)
- Session storage unchanged
- API endpoints unchanged
- PKCE implementation unchanged

---

## Files Modified

| File | Lines Changed | Type |
|------|---------------|------|
| `backend/src/config.ts` | +2 | Configuration |
| `backend/src/services/oidc.ts` | +80 net | Service logic |
| `backend/.env.example` | +9 | Documentation |

**Total TypeScript additions:** ~80 lines (includes detailed logging and error handling)
**Compilation status:** ✅ 0 errors, 0 warnings

---

## Next Steps (Optional Enhancements)

Consider these future improvements (not part of current fix):
- Cache discovery document with TTL (currently infinite cache)
- Add distributed session support for multi-instance deployments
- Implement token refresh endpoint
- Add rate limiting to auth endpoints
- Add audit logging for authentication events
