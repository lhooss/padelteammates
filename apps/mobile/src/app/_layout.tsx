import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { Provider } from 'react-redux';

import { store } from '@/store';
import { restoreSession } from '@/store/auth-slice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <Provider store={store}>
      <RootNavigator />
    </Provider>
  );
}

// Connecte -> onglets (+ profils de joueurs, planification) ; sinon -> authentification.
// Le splash reste affiche tant que le jeton persiste n'a pas ete relu.
function RootNavigator() {
  const colorScheme = useColorScheme();
  const dispatch = useAppDispatch();
  const status = useAppSelector((state) => state.auth.status);

  useEffect(() => {
    void dispatch(restoreSession());
  }, [dispatch]);

  useEffect(() => {
    if (status !== 'restoring') void SplashScreen.hideAsync();
  }, [status]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={status === 'signedIn'}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="players/[id]"
            options={{ headerShown: true, title: 'Joueur', headerBackTitle: 'Retour' }}
          />
          <Stack.Screen
            name="match/new"
            options={{ headerShown: true, title: 'Planifier un match', presentation: 'modal' }}
          />
        </Stack.Protected>
        <Stack.Protected guard={status !== 'signedIn'}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
