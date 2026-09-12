import {
  BigShouldersDisplay_800ExtraBold,
  BigShouldersDisplay_900Black,
} from '@expo-google-fonts/big-shoulders-display';
import {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
  InstrumentSans_700Bold,
} from '@expo-google-fonts/instrument-sans';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppState, useColorScheme } from 'react-native';
import { Provider } from 'react-redux';

import { Colors, FontFamily } from '@/constants/theme';
import { store } from '@/store';
import { api } from '@/store/api';
import { restoreSession } from '@/store/auth-slice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BigShouldersDisplay_800ExtraBold,
    BigShouldersDisplay_900Black,
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
    InstrumentSans_700Bold,
  });

  return (
    <Provider store={store}>
      <RootNavigator fontsLoaded={fontsLoaded} />
    </Provider>
  );
}

// Theme de navigation (en-tetes, fonds des ecrans) aligne sur l'identite "Court bleu".
function navigationTheme(scheme: 'light' | 'dark') {
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const c = Colors[scheme];
  return {
    ...base,
    colors: { ...base.colors, primary: c.primary, background: c.background, card: c.background, text: c.text, border: c.border },
    fonts: {
      ...base.fonts,
      regular: { ...base.fonts.regular, fontFamily: FontFamily.body },
      medium: { ...base.fonts.medium, fontFamily: FontFamily.bodyMedium },
      bold: { ...base.fonts.bold, fontFamily: FontFamily.bodyBold },
      heavy: { ...base.fonts.heavy, fontFamily: FontFamily.display },
    },
  };
}

// Connecte -> onglets (+ profils de joueurs, planification) ; sinon -> authentification.
// Le splash reste affiche tant que le jeton persiste et les polices ne sont pas prets.
function RootNavigator({ fontsLoaded }: { fontsLoaded: boolean }) {
  const colorScheme = useColorScheme();
  const dispatch = useAppDispatch();
  const status = useAppSelector((state) => state.auth.status);

  useEffect(() => {
    void dispatch(restoreSession());
  }, [dispatch]);

  useEffect(() => {
    if (status !== 'restoring' && fontsLoaded) void SplashScreen.hideAsync();
  }, [status, fontsLoaded]);

  // Pas encore de notifications push : au retour dans l'app, on rafraichit ce qui a pu
  // changer entre-temps (notifications, invitations et matchs, demandes d'ami).
  useEffect(() => {
    if (status !== 'signedIn') return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') dispatch(api.util.invalidateTags(['Notification', 'Match', 'Friend']));
    });
    return () => subscription.remove();
  }, [dispatch, status]);

  // On attend aussi la relecture de la session : sinon les gardes redirigent vers la
  // connexion puis l'accueil, et un lien direct (ex. /matches) serait perdu.
  if (!fontsLoaded || status === 'restoring') return null;

  return (
    <ThemeProvider value={navigationTheme(colorScheme === 'dark' ? 'dark' : 'light')}>
      <Stack
        screenOptions={{
          headerShown: false,
          headerShadowVisible: false,
          headerTitleStyle: { fontFamily: FontFamily.display, fontSize: 24 },
        }}>
        <Stack.Protected guard={status === 'signedIn'}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="notifications"
            options={{ headerShown: true, title: 'Notifications', headerBackTitle: 'Retour' }}
          />
          <Stack.Screen
            name="players/[id]"
            options={{ headerShown: true, title: 'Joueur', headerBackTitle: 'Retour' }}
          />
          <Stack.Screen
            name="match/new"
            options={{ headerShown: true, title: 'Planifier un match', presentation: 'modal' }}
          />
          <Stack.Screen
            name="match/[id]/invite"
            options={{ headerShown: true, title: 'Joueurs du match', presentation: 'modal' }}
          />
          <Stack.Screen
            name="match/[id]/score"
            options={{ headerShown: true, title: 'Score du match', presentation: 'modal' }}
          />
          <Stack.Screen
            name="account/edit"
            options={{ headerShown: true, title: 'Modifier le profil', presentation: 'modal' }}
          />
          <Stack.Screen
            name="account/security"
            options={{ headerShown: true, title: 'Email et mot de passe', presentation: 'modal' }}
          />
          <Stack.Screen
            name="account/frmt"
            options={{ headerShown: true, title: 'Classement FRMT', presentation: 'modal' }}
          />
          <Stack.Screen name="admin/frmt" options={{ headerShown: true, title: 'Administration FRMT' }} />
        </Stack.Protected>
        <Stack.Protected guard={status !== 'signedIn'}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
