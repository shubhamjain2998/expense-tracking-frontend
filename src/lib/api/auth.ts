import { client } from './client'

export interface TokenResponse {
  access_token: string
  token_type: string
}

export async function register(email: string, password: string): Promise<TokenResponse> {
  const { data } = await client.post<TokenResponse>('/auth/register', { email, password })
  return data
}

export async function login(email: string, password: string): Promise<TokenResponse> {
  const { data } = await client.post<TokenResponse>('/auth/login', { email, password })
  return data
}

export interface GoogleSignInResult extends TokenResponse {
  email: string
}

/**
 * Exchange a Google Identity Services credential (ID token) for an app JWT.
 * The credential is decoded only to surface the email — the backend re-verifies
 * the token signature against Google's public keys before issuing the JWT.
 */
export async function googleSignIn(credential: string): Promise<GoogleSignInResult> {
  const { data } = await client.post<TokenResponse>('/auth/google', { credential })
  return { ...data, email: readEmailFromGoogleCredential(credential) }
}

function readEmailFromGoogleCredential(credential: string): string {
  try {
    const payload = credential.split('.')[1]
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const claims = JSON.parse(json) as { email?: string }
    return claims.email ?? ''
  } catch {
    return ''
  }
}
