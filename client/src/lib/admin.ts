import type { User } from "firebase/auth";
import type { FirestoreUser } from "./firestore";

const parseEnvList = (value?: string) =>
  (value || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

const ADMIN_EMAILS = parseEnvList(import.meta.env.VITE_ADMIN_EMAILS);
const ADMIN_UIDS = parseEnvList(import.meta.env.VITE_ADMIN_UIDS);

export function isAdminUser(user?: FirestoreUser | null, firebaseUser?: User | null) {
  const email = (user?.email || firebaseUser?.email || "").toLowerCase();
  const uid = (user?.uid || firebaseUser?.uid || "").toLowerCase();

  return (
    user?.role === "admin" ||
    ADMIN_EMAILS.includes(email) ||
    ADMIN_UIDS.includes(uid)
  );
}
