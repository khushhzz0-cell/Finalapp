/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { AccountBackupNotice } from './components/common/AccountBackupNotice';
import { Navigation } from './components/common/Navigation';
import { GestureCarousel } from './components/navigation/GestureCarousel';
import { AuthLockScreen } from './components/auth/AuthLockScreen';
import { SettingsModal } from './components/auth/SettingsModal';
import { ExcelArchiveModal } from './components/common/ExcelArchiveModal';
import { QuickActionsPill } from './components/common/QuickActionsPill';
import { UniversalSearchModal } from './components/common/UniversalSearchModal';
import { TAB_ORDER } from './utils/screenIdentities';
import { NavigationTab } from './types';

function MainAppContent() {
  const {
    currentTab,
    setCurrentTab,
    isLocked,
    settings,
    isExcelModalOpen,
    setIsExcelModalOpen,
  } = useApp();
  const currentIndex = TAB_ORDER.indexOf(currentTab);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [dragFraction, setDragFraction] = useState(0);

  const handleSlideToIndex = useCallback(
    (index: number) => {
      if (index >= 0 && index < TAB_ORDER.length) {
        setCurrentTab(TAB_ORDER[index]);
      }
    },
    [setCurrentTab]
  );

  const handleSelectTab = useCallback(
    (tab: NavigationTab) => {
      setCurrentTab(tab);
      setIsSwitcherOpen(false);
    },
    [setCurrentTab]
  );

  const handleQuickFlick = useCallback(
    (direction: 'prev' | 'next') => {
      if (direction === 'next') {
        const nextIdx = Math.min(TAB_ORDER.length - 1, currentIndex + 1);
        if (nextIdx !== currentIndex) {
          handleSlideToIndex(nextIdx);
        }
      } else {
        const prevIdx = Math.max(0, currentIndex - 1);
        if (prevIdx !== currentIndex) {
          handleSlideToIndex(prevIdx);
        }
      }
    },
    [currentIndex, handleSlideToIndex]
  );

  // Keyboard navigation & Shortcuts (Arrows to slide, Space/Tab/Esc for switcher)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }

      if (e.key === 'ArrowRight' && !isSwitcherOpen) {
        const nextIdx = Math.min(TAB_ORDER.length - 1, currentIndex + 1);
        if (nextIdx !== currentIndex) {
          handleSlideToIndex(nextIdx);
        }
      } else if (e.key === 'ArrowLeft' && !isSwitcherOpen) {
        const prevIdx = Math.max(0, currentIndex - 1);
        if (prevIdx !== currentIndex) {
          handleSlideToIndex(prevIdx);
        }
      } else if (e.key === 'Escape') {
        if (isSwitcherOpen) {
          setIsSwitcherOpen(false);
        } else if (isMenuOpen) {
          setIsMenuOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, isMenuOpen, isSwitcherOpen, handleSlideToIndex]);

  if (isLocked && settings.isPinEnabled) {
    return <AuthLockScreen />;
  }

  return (
    <div
      className="fixed inset-0 bg-[#09090b] text-zinc-100 flex flex-col overflow-hidden selection:bg-[#0a84ff]/25"
      style={{
        backgroundColor: '#09090b',
      }}
    >
      {/* Header with Screen Identity title and menu trigger */}
      <Header onToggleMenu={() => setIsMenuOpen(prev => !prev)} />

      {/* Cross-tab & Multi-device Google Account Backup Reminder */}
      <AccountBackupNotice />

      {/* Main View Container: Scales down with iOS spring feel when recent apps switcher opens */}
      <div
        className={`relative flex-1 w-full h-full overflow-hidden transition-all duration-350 ease-out origin-center ${
          isSwitcherOpen
            ? 'scale-[0.88] opacity-35 blur-[3px] pointer-events-none rounded-[36px]'
            : 'scale-100 opacity-100 blur-none rounded-none'
        }`}
        style={{
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <GestureCarousel
          onOpenMenu={() => setIsMenuOpen(true)}
          onDragProgress={setDragFraction}
        />
      </div>

      {/* Modern Navigation: Swipe-to-Reveal Menu + Apple Recent Apps Switcher + Apple Home Bar */}
      <Navigation
        isMenuOpen={isMenuOpen}
        onCloseMenu={() => setIsMenuOpen(false)}
        isSwitcherOpen={isSwitcherOpen}
        onToggleSwitcher={() => setIsSwitcherOpen(prev => !prev)}
        onCloseSwitcher={() => setIsSwitcherOpen(false)}
        onSelectTab={handleSelectTab}
        onQuickFlick={handleQuickFlick}
      />

      {/* Floating Bottom-Right Vertical Pill (Top: Minimal View Toggle | Bottom: Quick Add) */}
      {!isSwitcherOpen && <QuickActionsPill />}

      {/* Settings Modal */}
      <SettingsModal />

      {/* Excel Lifetime Archive Modal */}
      <ExcelArchiveModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
      />

      {/* Universal Search & Command Palette Modal */}
      <UniversalSearchModal />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
