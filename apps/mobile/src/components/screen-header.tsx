import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { NotificationBell } from '@/components/notification-bell';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

// En-tete commun aux onglets : meme titre, meme gouttiere, meme cloche au meme
// endroit. Il se place hors de la zone qui defile, sinon la gouttiere du titre
// s'ajoute a celle de la liste et le titre n'est plus aligne sur les cartes.
//   action   : le bouton principal de l'ecran, a droite du titre ;
//   children : ce qui se range sous le titre (recherche, filtres, semaine).
export function ScreenHeader({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <View style={styles.titleBlock}>
          <ThemedText type="subtitle" numberOfLines={1}>
            {title}
          </ThemedText>
          {subtitle ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
        {action}
        <NotificationBell />
      </View>
      {children}
    </View>
  );
}

// Gabarit du bouton d'en-tete : meme hauteur que la cloche, sur tous les ecrans.
export const headerActionStyle = {
  minHeight: 44,
  paddingHorizontal: Spacing.three,
} as const;

const styles = StyleSheet.create({
  header: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  titleBlock: {
    flex: 1,
  },
});
