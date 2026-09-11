// Imports CSS (web) : declares ici pour que le typecheck passe sans expo-env.d.ts,
// genere par `expo start` mais ignore par git (et donc absent en CI).
declare module '*.css';
