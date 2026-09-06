import { BridgePriority } from '../types/bridge';

export interface PriorityBadgeConfig {
  key: BridgePriority;
  label: string;
  thaiLabel: string;
  badgeBg: string;
  badgeText: string;
  dotColor: string;
  borderColor: string;
  priorityWeight: number;
}

export const BRIDGE_PRIORITY_CONFIG: Record<string, PriorityBadgeConfig> = {
  CRITICAL: {
    key: 'CRITICAL',
    label: 'Critical',
    thaiLabel: 'เร่งด่วนวิกฤต (Critical)',
    badgeBg: 'bg-red-100 dark:bg-red-950/80',
    badgeText: 'text-red-700 dark:text-red-300 font-bold animate-pulse',
    dotColor: 'bg-red-600',
    borderColor: 'border-red-300 dark:border-red-800',
    priorityWeight: 4,
  },
  HIGH: {
    key: 'HIGH',
    label: 'High',
    thaiLabel: 'สำคัญสูง (High)',
    badgeBg: 'bg-rose-100 dark:bg-rose-950/60',
    badgeText: 'text-rose-700 dark:text-rose-300 font-bold',
    dotColor: 'bg-rose-500',
    borderColor: 'border-rose-300 dark:border-rose-800',
    priorityWeight: 3,
  },
  MEDIUM: {
    key: 'MEDIUM',
    label: 'Medium',
    thaiLabel: 'ปานกลาง (Medium)',
    badgeBg: 'bg-amber-100 dark:bg-amber-950/60',
    badgeText: 'text-amber-800 dark:text-amber-300 font-semibold',
    dotColor: 'bg-amber-500',
    borderColor: 'border-amber-300 dark:border-amber-800',
    priorityWeight: 2,
  },
  LOW: {
    key: 'LOW',
    label: 'Low',
    thaiLabel: 'ทั่วไป (Low)',
    badgeBg: 'bg-slate-100 dark:bg-slate-800',
    badgeText: 'text-slate-700 dark:text-slate-300 font-medium',
    dotColor: 'bg-slate-400',
    borderColor: 'border-slate-300 dark:border-slate-700',
    priorityWeight: 1,
  },
};

export function getPriorityConfig(priority?: string): PriorityBadgeConfig {
  const p = (priority || 'MEDIUM').toUpperCase();
  return BRIDGE_PRIORITY_CONFIG[p] || BRIDGE_PRIORITY_CONFIG.MEDIUM;
}
