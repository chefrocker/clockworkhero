import { useEffect } from 'react';
import { CalendarHandle } from '../components/CalendarEngine';
import React from 'react';

interface Options {
  calendarRef:       React.RefObject<CalendarHandle | null>;
  viewMode:          'day' | 'week' | 'dashboard';
  showSessionModal:  boolean;
  showActivityModal: boolean;
  showSettings:      boolean;
  setViewMode:       (v: 'day' | 'week' | 'dashboard') => void;
  setIsEditMode:     (fn: (prev: boolean) => boolean) => void;
  setShowSessionModal:  (v: boolean) => void;
  setShowActivityModal: (v: boolean) => void;
  setShowSettings:      (v: boolean) => void;
  openNewSession:    () => void;
}

export function useKeyboardShortcuts({
  calendarRef,
  viewMode,
  showSessionModal, showActivityModal, showSettings,
  setViewMode, setIsEditMode,
  setShowSessionModal, setShowActivityModal, setShowSettings,
  openNewSession,
}: Options) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const modalOpen = showSessionModal || showActivityModal || showSettings;

      switch (e.key) {
        case 'Escape':
          if (showSessionModal)  { setShowSessionModal(false);  e.preventDefault(); }
          if (showActivityModal) { setShowActivityModal(false); e.preventDefault(); }
          if (showSettings)      { setShowSettings(false);      e.preventDefault(); }
          break;

        case 'ArrowLeft':
          if (!modalOpen && viewMode !== 'dashboard') { calendarRef.current?.prev(); e.preventDefault(); }
          break;
        case 'ArrowRight':
          if (!modalOpen && viewMode !== 'dashboard') { calendarRef.current?.next(); e.preventDefault(); }
          break;
        case 'h': case 'H':
          if (!modalOpen && viewMode !== 'dashboard') { calendarRef.current?.today(); e.preventDefault(); }
          break;

        case 'd': case 'D':
          if (!modalOpen) { setViewMode('day');       e.preventDefault(); }
          break;
        case 'w': case 'W':
          if (!modalOpen) { setViewMode('week');      e.preventDefault(); }
          break;
        case 'a': case 'A':
          if (!modalOpen) { setViewMode('dashboard'); e.preventDefault(); }
          break;

        case 'n': case 'N':
          if (!modalOpen) { openNewSession(); e.preventDefault(); }
          break;

        case 'm': case 'M':
          if (!modalOpen && viewMode !== 'dashboard') { setIsEditMode(v => !v); e.preventDefault(); }
          break;

        case ',':
          if (e.metaKey || e.ctrlKey) { setShowSettings(true); e.preventDefault(); }
          break;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    calendarRef, viewMode,
    showSessionModal, showActivityModal, showSettings,
    setViewMode, setIsEditMode,
    setShowSessionModal, setShowActivityModal, setShowSettings,
    openNewSession,
  ]);
}
