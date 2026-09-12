import { Alert } from 'react-native';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
}

// Confirmation avant une action irreversible (annuler un match, retirer un joueur).
// Fermer la boite sans choisir (retour Android) vaut un refus.
export function confirmAction({ title, message, confirmLabel }: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Retour', style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
