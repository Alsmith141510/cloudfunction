// Initialize Firebase Admin
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
export const server = admin; 
// Initialize Cloud Firestore Database
export const db = admin.firestore();
const settings = { timestampsInSnapshots: true };
db.settings(settings);
// ENV Variables
export const stripeSecret = functions.config().stripe.secret;

// Export Stripe
export const stripe = require('stripe')(stripeSecret);

