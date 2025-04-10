import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(
  suppliedPassword: string,
  storedPassword: string
): Promise<boolean> {
  try {
    // Check if stored password has the correct format (hash.salt)
    if (!storedPassword.includes(".")) {
      console.error("Invalid password format in database");
      return false;
    }

    const [hashedPassword, salt] = storedPassword.split(".");
    if (!hashedPassword || !salt) {
      console.error("Missing hash or salt in stored password");
      return false;
    }

    const buf = (await scryptAsync(suppliedPassword, salt, 64)) as Buffer;
    return timingSafeEqual(Buffer.from(hashedPassword, "hex"), buf);
  } catch (error) {
    console.error("Error comparing passwords:", error);
    return false;
  }
} 