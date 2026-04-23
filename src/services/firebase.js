// ============================================================
// firebase.js
// §1  Firebase başlatma
// §2  Auth — Google ve Email/Password provider
// §3  Export
// ============================================================

// §1 — Firebase başlatma
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendEmailVerification } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBTBGIk_vH8R2rokFErgRvtySQUcoMflDA",
  authDomain: "opsradar2026.firebaseapp.com",
  projectId: "opsradar2026",
  storageBucket: "opsradar2026.firebasestorage.app",
  messagingSenderId: "1035523598511",
  appId: "1:1035523598511:web:f2950e63e2caca2881cc5a",
};

const app = initializeApp(firebaseConfig);

// §2 — Auth
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// §3 — Export
export function loginWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export async function loginWithEmail(email, password) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  if (!result.user.emailVerified) {
    await signOut(auth);
    const error = new Error("Email not verified.");
    error.code = "auth/email-not-verified";
    throw error;
  }
  return result;
}

export async function registerWithEmail(email, password) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(result.user);
  await signOut(auth);
  return result;
}

export function logout() {
  return signOut(auth);
}