import React from 'react';
import { NavigationTab } from '../types';
import {
  Calendar,
  CheckCircle2,
  Flame,
  Folder,
  Flag,
  BookOpen,
  Edit3,
  Bookmark,
} from 'lucide-react';

export interface ScreenIdentity {
  id: NavigationTab;
  title: string;
  subtitle: string;
  shortLabel: string;
  icon: React.ElementType;
  // Specific variation/tint of white for typography & highlights:
  tintWhite: string;
  tintWhiteMuted: string;
  tintWhiteSubtle: string;
  ambientGlow: string;
  accentColor: string;
  glowColor: string;
  borderTint: string;
  description: string;
}

export const SCREEN_IDENTITIES: Record<NavigationTab, ScreenIdentity> = {
  home: {
    id: 'home',
    title: 'Today',
    subtitle: 'Focus on what matters now',
    shortLabel: 'Today',
    icon: Calendar,
    // Crisp Titanium Oyster White with Sapphire Undertone
    tintWhite: '#F6F9FF',
    tintWhiteMuted: 'rgba(246, 249, 255, 0.72)',
    tintWhiteSubtle: 'rgba(246, 249, 255, 0.45)',
    ambientGlow: 'radial-gradient(circle 500px at 50% -80px, rgba(10, 132, 255, 0.08), transparent 70%)',
    accentColor: '#0a84ff',
    glowColor: 'rgba(10, 132, 255, 0.4)',
    borderTint: 'rgba(10, 132, 255, 0.25)',
    description: 'Sapphire Cobalt',
  },
  routine: {
    id: 'routine',
    title: 'Routines',
    subtitle: 'Daily & weekly consistency',
    shortLabel: 'Routines',
    icon: CheckCircle2,
    // Arctic Glacier White with crystalline Cyan-Teal undertone
    tintWhite: '#EDFAF8',
    tintWhiteMuted: 'rgba(237, 250, 248, 0.72)',
    tintWhiteSubtle: 'rgba(237, 250, 248, 0.45)',
    ambientGlow: 'radial-gradient(circle 500px at 50% -80px, rgba(0, 199, 190, 0.09), transparent 70%)',
    accentColor: '#00c7be',
    glowColor: 'rgba(0, 199, 190, 0.4)',
    borderTint: 'rgba(0, 199, 190, 0.25)',
    description: 'Radiant Cyan Mint',
  },
  habits: {
    id: 'habits',
    title: 'New Habits',
    subtitle: '14-day trial incubator',
    shortLabel: 'Habits',
    icon: Flame,
    // Radiant Dawn White with soft solar amber warmth
    tintWhite: '#FFF6ED',
    tintWhiteMuted: 'rgba(255, 246, 237, 0.72)',
    tintWhiteSubtle: 'rgba(255, 246, 237, 0.45)',
    ambientGlow: 'radial-gradient(circle 500px at 50% -80px, rgba(255, 149, 0, 0.09), transparent 70%)',
    accentColor: '#ff9500',
    glowColor: 'rgba(255, 149, 0, 0.4)',
    borderTint: 'rgba(255, 149, 0, 0.25)',
    description: 'Solar Amber Flare',
  },
  projects: {
    id: 'projects',
    title: 'Projects',
    subtitle: 'Active execution',
    shortLabel: 'Projects',
    icon: Folder,
    // Deep Indigo Frost White
    tintWhite: '#F4F3FF',
    tintWhiteMuted: 'rgba(244, 243, 255, 0.72)',
    tintWhiteSubtle: 'rgba(244, 243, 255, 0.45)',
    ambientGlow: 'radial-gradient(circle 500px at 50% -80px, rgba(94, 92, 230, 0.09), transparent 70%)',
    accentColor: '#5e5ce6',
    glowColor: 'rgba(94, 92, 230, 0.4)',
    borderTint: 'rgba(94, 92, 230, 0.25)',
    description: 'Royal Indigo',
  },
  learning: {
    id: 'learning',
    title: 'Learning',
    subtitle: 'Phases, seasons & skills',
    shortLabel: 'Learning',
    icon: BookOpen,
    // Orchid Mist White
    tintWhite: '#FBF0FF',
    tintWhiteMuted: 'rgba(251, 240, 255, 0.72)',
    tintWhiteSubtle: 'rgba(251, 240, 255, 0.45)',
    ambientGlow: 'radial-gradient(circle 500px at 50% -80px, rgba(191, 90, 242, 0.09), transparent 70%)',
    accentColor: '#bf5af2',
    glowColor: 'rgba(191, 90, 242, 0.4)',
    borderTint: 'rgba(191, 90, 242, 0.25)',
    description: 'Radiant Orchid Purple',
  },
  rough: {
    id: 'rough',
    title: 'Quick Notes',
    subtitle: 'Fast capture inbox',
    shortLabel: 'Notes',
    icon: Edit3,
    // Sage Mint White
    tintWhite: '#EFFCF4',
    tintWhiteMuted: 'rgba(239, 252, 244, 0.72)',
    tintWhiteSubtle: 'rgba(239, 252, 244, 0.45)',
    ambientGlow: 'radial-gradient(circle 500px at 50% -80px, rgba(48, 209, 88, 0.09), transparent 70%)',
    accentColor: '#30d158',
    glowColor: 'rgba(48, 209, 88, 0.4)',
    borderTint: 'rgba(48, 209, 88, 0.25)',
    description: 'Emerald Spring Mint',
  },
  reminders: {
    id: 'reminders',
    title: 'Reminders',
    subtitle: 'Keep in mind board',
    shortLabel: 'Reminders',
    icon: Bookmark,
    // Champagne Gold White
    tintWhite: '#FFFDF0',
    tintWhiteMuted: 'rgba(255, 253, 240, 0.72)',
    tintWhiteSubtle: 'rgba(255, 253, 240, 0.45)',
    ambientGlow: 'radial-gradient(circle 500px at 50% -80px, rgba(255, 214, 10, 0.09), transparent 70%)',
    accentColor: '#ffd60a',
    glowColor: 'rgba(255, 214, 10, 0.4)',
    borderTint: 'rgba(255, 214, 10, 0.25)',
    description: 'Golden Marigold',
  },
};

export const TAB_ORDER: NavigationTab[] = [
  'projects',
  'home',
  'routine',
  'habits',
  'learning',
  'rough',
  'reminders',
];
