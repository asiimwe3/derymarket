import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

/** The Admin SDK — server-side only, bypasses security rules. Never ship to a client. */
initializeApp();
export const db = getFirestore();
export { FieldValue };
