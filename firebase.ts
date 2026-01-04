import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: 'AIzaSyC9rnTXEM7W7eO9vOhYV7QzWREkxFiFTdU',
  authDomain: 'katie-abcbc.firebaseapp.com',
  projectId: 'katie-abcbc',
  storageBucket: 'katie-abcbc.firebasestorage.app',
  messagingSenderId: '343408666084',
  appId: '1:343408666084:web:d3109e43e6f6e47dd5d3f1'
};

export const firebaseApp = initializeApp(firebaseConfig);
