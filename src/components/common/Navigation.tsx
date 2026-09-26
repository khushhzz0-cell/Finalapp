import React from 'react';
import { SwipeRevealMenu } from '../navigation/SwipeRevealMenu';
import { AppleHomeBar } from '../navigation/AppleHomeBar';
import { AppleAppSwitcher } from '../navigation/AppleAppSwitcher';
import { NavigationTab } from '../../types';

interface NavigationProps {
  isMenuOpen: boolean;
  onCloseMenu: () => void;
  isSwitcherOpen: boolean;
  onToggleSwitcher: () => void;
  onCloseSwitcher: () => void;
  onSelectTab: (tab: NavigationTab) => void;
  onQuickFlick: (direction: 'prev' | 'next') => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  isMenuOpen,
  onCloseMenu,
  isSwitcherOpen,
  onToggleSwitcher,
  onCloseSwitcher,
  onSelectTab,
  onQuickFlick,
}) => {
  return (
    <>
      {/* 1. Swipe-to-Reveal Navigation Menu (Hidden by default, anchored lower-right) */}
      <SwipeRevealMenu
        isOpen={isMenuOpen}
        onClose={onCloseMenu}
        onSelectTab={onSelectTab}
      />

      {/* 2. Apple Recent Apps Switcher (Multitasking card deck) */}
      <AppleAppSwitcher
        isOpen={isSwitcherOpen}
        onClose={onCloseSwitcher}
        onSelectTab={onSelectTab}
      />

      {/* 3. Apple Thin Home Indicator Bar (Floating at very bottom) */}
      <AppleHomeBar
        isSwitcherOpen={isSwitcherOpen}
        onToggleSwitcher={onToggleSwitcher}
        onQuickFlick={onQuickFlick}
      />
    </>
  );
};

export { SwipeRevealMenu, AppleHomeBar, AppleAppSwitcher };
