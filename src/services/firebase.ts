import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDT71CCvgSOCazgMB1gOsgYiECPTiIaWDM',
  authDomain: 'urano-crm---treinamentos.firebaseapp.com',
  projectId: 'urano-crm---treinamentos',
  storageBucket: 'urano-crm---treinamentos.firebasestorage.app',
  messagingSenderId: '65361176507',
  appId: '1:65361176507:web:085d12f0bc549b6269469e',
  measurementId: 'G-S0255M071T',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
