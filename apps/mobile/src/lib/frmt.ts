import type { FrmtCategory } from '@padelteammates/shared';

export const FRMT_CATEGORY_LABEL: Record<FrmtCategory, string> = {
  MEN: 'Messieurs',
  WOMEN: 'Dames',
};

// 23100 -> "23 100 pts"
export function formatPoints(points: number): string {
  return `${Math.round(points)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} pts`;
}

// Evolution depuis le classement precedent : "+3", "-2" ou "=".
export function formatEvolution(evolution: number | null): string {
  if (evolution === null || evolution === 0) return '=';
  return evolution > 0 ? `+${evolution}` : `${evolution}`;
}

// "2026-09-11T..." -> "11/09/2026"
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}
