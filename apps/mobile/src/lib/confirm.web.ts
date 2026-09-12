export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
}

// Sur le web (previsualisation depuis un navigateur), Alert de React Native n'existe
// pas : on passe par la boite de dialogue du navigateur.
export function confirmAction({ title, message }: ConfirmOptions): Promise<boolean> {
  return Promise.resolve(window.confirm(`${title}\n\n${message}`));
}
