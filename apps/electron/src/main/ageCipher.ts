import { Decrypter, Encrypter, armor } from 'age-encryption'

/**
 * The passphrase is a random 256-bit value held in the OS vault, so the scrypt
 * work factor only has to slow a direct guess, not a dictionary attack. A lower
 * factor keeps each read fast; the default 18 is aimed at human passwords.
 */
const SCRYPT_LOG_N = 12

/** Encrypts text with an age passphrase and returns the ASCII-armored file. */
export async function encryptWithPassphrase(
  passphrase: string,
  plaintext: string,
): Promise<string> {
  const encrypter = new Encrypter()
  encrypter.setPassphrase(passphrase)
  encrypter.setScryptWorkFactor(SCRYPT_LOG_N)
  return armor.encode(await encrypter.encrypt(plaintext))
}

/**
 * Decrypts an ASCII-armored age passphrase file. Returns null when the file is
 * malformed or the passphrase is wrong, so the caller treats it as unreadable
 * rather than crashing.
 */
export async function decryptWithPassphrase(
  passphrase: string,
  ciphertext: string,
): Promise<string | null> {
  try {
    const decrypter = new Decrypter()
    decrypter.addPassphrase(passphrase)
    return await decrypter.decrypt(armor.decode(ciphertext), 'text')
  } catch {
    return null
  }
}
