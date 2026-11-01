const toHex = (bytes: Uint8Array) =>
  Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

/**
 * Signs a session token for an authenticated email or passkey using standard Web Crypto API.
 * 100% compatible with Edge runtime and Node.js.
 */
export async function signSession(identity: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${identity}:${secret}`);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  return toHex(new Uint8Array(digest));
}

/**
 * Validates a session token using standard Web Crypto API.
 */
export async function verifySignedSession(
  candidate: string,
  secret: string,
  expectedIdentity: string,
): Promise<boolean> {
  const expected = await signSession(expectedIdentity, secret);
  return candidate.length === expected.length && candidate === expected;
}
