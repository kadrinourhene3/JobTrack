import * as Crypto from 'expo-crypto';

/** Generates a native-backed RFC 4122 UUID without relying on browser Web Crypto globals. */
export function createUuid(): string {
  return Crypto.randomUUID();
}
