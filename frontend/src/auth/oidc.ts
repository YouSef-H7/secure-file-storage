import { UserManager } from 'oidc-client-ts';

let oidcManagerInstance: UserManager | null = null;

export function getOidcManager(): UserManager {
  if (oidcManagerInstance) return oidcManagerInstance;

  const authority = import.meta.env.VITE_OIDC_ISSUER;
  const clientId = import.meta.env.VITE_OIDC_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_OIDC_REDIRECT_URI;

  if (!authority || !clientId || !redirectUri) {
    throw new Error('Missing OIDC env vars');
  }

  oidcManagerInstance = new UserManager({
    authority,
    client_id: clientId,
    redirect_uri: redirectUri,

    // 🔥 IMPLICIT FLOW (المطابق لـ OCI Mobile App)
    response_type: 'id_token token',

    scope: 'openid profile email',

    // Required for implicit
    loadUserInfo: true,
  });

  return oidcManagerInstance;
}

export const oidcManager = {
  signinRedirect: () => getOidcManager().signinRedirect(),
  signinRedirectCallback: () => getOidcManager().signinRedirectCallback(),
};
