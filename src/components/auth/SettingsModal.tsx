import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Download,
  Upload,
  RefreshCw,
  Check,
  Copy,
  FileSpreadsheet,
  ChevronRight,
  ExternalLink,
  Cloud,
  GitBranch,
  Globe,
  CheckCircle2,
  Volume2,
  Smartphone,
  LogIn,
  LogOut,
  User as UserIcon,
  ShieldCheck,
} from 'lucide-react';
import { getSavedGoogleSheetInfo } from '../../services/googleSheetsSync';
import { haptics, triggerHaptic, HapticType } from '../../utils/haptics';

export const SettingsModal: React.FC = () => {
  const {
    isSettingsOpen,
    setIsSettingsOpen,
    settings,
    updateSettings,
    exportData,
    importData,
    resetToDefaults,
    setIsExcelModalOpen,
    exportToExcel,
    user,
    isAuthLoading,
    signIn,
    signOut,
    syncNow,
    syncStatus,
    lastSyncedTime,
  } = useApp();

  const [newPin, setNewPin] = useState(settings.pin);
  const [pinSaved, setPinSaved] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isHapticsEnabled, setIsHapticsEnabled] = useState(() => haptics.isEnabled());
  const [lastHapticTest, setLastHapticTest] = useState<string | null>(null);
  const savedSheet = getSavedGoogleSheetInfo();

  const handleToggleHaptics = () => {
    const next = !isHapticsEnabled;
    setIsHapticsEnabled(next);
    haptics.setEnabled(next);
    if (next) {
      triggerHaptic('success');
    }
  };

  const handleTestHaptic = (type: HapticType, label: string) => {
    triggerHaptic(type);
    setLastHapticTest(label);
    setTimeout(() => setLastHapticTest(null), 1200);
  };

  if (!isSettingsOpen) return null;

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length === 4) {
      updateSettings({ pin: newPin });
      setPinSaved(true);
      setTimeout(() => setPinSaved(false), 2000);
    }
  };

  const handleExportDownload = () => {
    const json = exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `focusdo-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyExport = () => {
    const json = exportData();
    navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importJsonText.trim()) return;
    const ok = importData(importJsonText.trim());
    if (ok) {
      setImportStatus('Data successfully restored!');
      setImportJsonText('');
      setTimeout(() => {
        setImportStatus(null);
        setIsSettingsOpen(false);
      }, 1000);
    } else {
      setImportStatus('Invalid JSON backup file.');
    }
  };

  const handleReset = () => {
    if (confirm('Reset database to clean defaults? Current items will be reset.')) {
      resetToDefaults();
      setIsSettingsOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[#18181b] border-t sm:border border-white/10 rounded-t-2xl sm:rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* iOS Navigation Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
          <span className="w-10" />
          <h3 className="font-medium text-sm text-zinc-100">
            Settings
          </h3>
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="text-xs text-[#0a84ff] font-medium hover:underline cursor-pointer"
          >
            Done
          </button>
        </div>

        {/* 0. GOOGLE ACCOUNT & CLOUD BACKUP (Primary user requirement) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider flex items-center gap-1.5">
              <Cloud className="w-3.5 h-3.5 text-[#0a84ff]" />
              Account & Cloud Backup
            </span>
            {user ? (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                Synced to Account
              </span>
            ) : (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 font-medium">
                Not Logged In
              </span>
            )}
          </div>

          <div className="bg-[#121215] rounded-xl overflow-hidden border border-white/[0.06] divide-y divide-white/[0.04]">
            {user ? (
              <div className="p-3.5 space-y-3">
                {/* User Info Bar */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-full overflow-hidden ring-1 ring-white/20 bg-zinc-800 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-white">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt={user.displayName || 'User'} className="w-full h-full object-cover" />
                      ) : (
                        <span>{(user.displayName || user.email || 'U')[0].toUpperCase()}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-zinc-100 truncate block">
                          {user.displayName || 'FocusDo User'}
                        </span>
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      </div>
                      <span className="text-[11px] text-zinc-400 truncate block font-mono">
                        {user.email}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => signOut()}
                    className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-rose-500/15 border border-white/[0.06] hover:border-rose-500/30 text-zinc-400 hover:text-rose-400 text-xs font-medium transition cursor-pointer flex items-center gap-1 flex-shrink-0"
                    title="Sign out of account"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Sign Out</span>
                  </button>
                </div>

                {/* Backup Status Info */}
                <div className="p-2.5 rounded-lg bg-black/30 border border-white/[0.04] flex items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="text-zinc-300 font-medium block">
                      Automatic Real-time Sync
                    </span>
                    <span className="text-[11px] text-zinc-500 block">
                      {lastSyncedTime
                        ? `Last synced at ${lastSyncedTime}`
                        : syncStatus === 'syncing'
                        ? 'Syncing with cloud...'
                        : 'Active across all tabs and devices'}
                    </span>
                  </div>

                  <button
                    onClick={() => syncNow()}
                    disabled={syncStatus === 'syncing'}
                    className="px-2.5 py-1 rounded-md bg-[#0a84ff]/20 hover:bg-[#0a84ff]/30 text-[#0a84ff] text-[11px] font-medium transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                    <span>Sync Now</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5">
                    <span>Back up your data to Google</span>
                  </h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Opening the app in another tab or device? Sign in with your Google account so your routines, habits, projects, and notes are permanently backed up and synced in real-time.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => signIn()}
                  className="w-full py-2.5 px-3 rounded-lg bg-[#0a84ff] hover:bg-[#0071e3] active:scale-[0.99] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-[#0a84ff]/20 transition cursor-pointer"
                >
                  <svg className="w-4 h-4 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.66-5.17 3.66-9.12z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.26 21.36 7.35 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.13z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
                    />
                  </svg>
                  <span>Sign in with Google</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 1. PASSCODE GROUP */}
        <div className="space-y-1.5">
          <span className="text-[11px] text-zinc-500 font-medium px-1 uppercase tracking-wider">
            Security & Passcode
          </span>
          <div className="bg-[#121215] rounded-xl overflow-hidden divide-y divide-white/[0.04] border border-white/[0.06]">
            {/* Toggle Row */}
            <div className="p-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-zinc-200 block">
                  Passcode Lock
                </span>
                <span className="text-[11px] text-zinc-500">
                  Require 4-digit code to open
                </span>
              </div>

              <button
                type="button"
                onClick={() => updateSettings({ isPinEnabled: !settings.isPinEnabled })}
                className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                  settings.isPinEnabled ? 'bg-emerald-500' : 'bg-white/20'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white shadow-md block transition-transform absolute top-0.5 ${
                    settings.isPinEnabled ? 'left-5.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Change Passcode Row */}
            {settings.isPinEnabled && (
              <form onSubmit={handleSavePin} className="p-3 flex items-center justify-between gap-3">
                <span className="text-xs text-zinc-300 font-medium">
                  Current PIN:
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    pattern="[0-9]{4}"
                    maxLength={4}
                    value={newPin}
                    onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="1234"
                    className="w-16 px-2 py-1 rounded-md bg-black/40 border border-white/[0.06] text-xs text-zinc-100 font-mono text-center tracking-widest focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="text-xs text-[#0a84ff] font-medium hover:underline cursor-pointer"
                  >
                    {pinSaved ? 'Saved' : 'Change'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* 1.5 HAPTIC & ACOUSTIC FEEDBACK */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider flex items-center gap-1.5">
              <Smartphone className="w-3 h-3 text-amber-500" />
              Haptic & Acoustic Feedback
            </span>
            {lastHapticTest ? (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 font-medium animate-pulse">
                Tested: {lastHapticTest}
              </span>
            ) : (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.04] text-zinc-500">
                {isHapticsEnabled ? 'Active' : 'Muted'}
              </span>
            )}
          </div>

          <div className="bg-[#121215] rounded-xl overflow-hidden divide-y divide-white/[0.04] border border-white/[0.06]">
            {/* Toggle Row */}
            <div className="p-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-zinc-200 block">
                  Tactile Clicks & Vibrations
                </span>
                <span className="text-[11px] text-zinc-500">
                  Mechanical audio clicks & mobile vibration pulses
                </span>
              </div>

              <button
                type="button"
                onClick={handleToggleHaptics}
                className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                  isHapticsEnabled ? 'bg-emerald-500' : 'bg-white/20'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white shadow-md block transition-transform absolute top-0.5 ${
                    isHapticsEnabled ? 'left-5.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Test Buttons Row */}
            {isHapticsEnabled && (
              <div className="p-2.5 bg-black/20 space-y-1.5">
                <span className="text-[11px] text-zinc-500 block font-medium">
                  Test Feedback Profiles:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                  <button
                    type="button"
                    onClick={() => handleTestHaptic('light', 'Light Tap')}
                    className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 text-xs text-zinc-200 transition text-center cursor-pointer font-medium"
                  >
                    Light Tap
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTestHaptic('selection', 'Selection')}
                    className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 text-xs text-zinc-200 transition text-center cursor-pointer font-medium"
                  >
                    Selection
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTestHaptic('success', 'Success')}
                    className="p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-95 text-xs text-emerald-400 transition text-center cursor-pointer font-medium border border-emerald-500/20"
                  >
                    Success
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTestHaptic('warning', 'Warning')}
                    className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 active:scale-95 text-xs text-rose-400 transition text-center cursor-pointer font-medium border border-rose-500/20"
                  >
                    Warning
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. GOOGLE SHEETS & LIFETIME ARCHIVE GROUP */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider flex items-center gap-1.5">
              <Cloud className="w-3 h-3 text-emerald-400" />
              Google Sheets & Lifetime Archive
            </span>
            {savedSheet.sheetUrl ? (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                Connected
              </span>
            ) : (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.04] text-zinc-500">
                Not Synced
              </span>
            )}
          </div>
          <div className="bg-[#121215] rounded-xl overflow-hidden divide-y divide-white/[0.04] border border-white/[0.06]">
            {savedSheet.sheetUrl && (
              <a
                href={savedSheet.sheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full p-3 text-left flex items-center justify-between text-xs font-medium text-emerald-400 hover:bg-white/[0.03] transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Open Your Google Sheet</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
              </a>
            )}

            <button
              type="button"
              onClick={() => {
                setIsSettingsOpen(false);
                setIsExcelModalOpen(true);
              }}
              className="w-full p-3 text-left flex items-center justify-between text-xs text-zinc-200 hover:bg-white/[0.03] transition cursor-pointer"
            >
              <div>
                <span className="font-medium block text-zinc-100">Google Sheets Sync & Archive Hub</span>
                <span className="text-[11px] text-zinc-500">
                  {savedSheet.lastSyncedAt
                    ? `Last synced: ${new Date(savedSheet.lastSyncedAt).toLocaleDateString()} at ${new Date(savedSheet.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Sync all routines, habits, tasks & lifetime data to Google Sheets'}
                </span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
            </button>

            <button
              type="button"
              onClick={() => exportToExcel()}
              className="w-full p-3 text-left flex items-center justify-between text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] transition cursor-pointer"
            >
              <span>Download Offline Excel (.xlsx)</span>
              <Download className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* 2.5 GITHUB & VERCEL HOSTING STATUS (SUBTLE & NON-INTRUSIVE) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-3 h-3 text-[#0a84ff]" />
              Hosting & Git Deployment
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live & Synced
            </span>
          </div>
          <div className="bg-[#121215] rounded-xl overflow-hidden divide-y divide-white/[0.04] border border-white/[0.06]">
            {/* GitHub Repo info */}
            <a
              href="https://github.com/khushhzz0-cell/app1"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full p-3 flex items-center justify-between text-left hover:bg-white/[0.03] transition cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center text-white">
                  <GitBranch className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-zinc-200">GitHub Repository</span>
                    <span className="text-[9px] px-1 py-0.5 rounded bg-white/[0.08] text-zinc-400 font-mono">main</span>
                  </div>
                  <span className="text-[11px] text-zinc-500 font-mono">khushhzz0-cell/app1</span>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white transition" />
            </a>

            {/* Vercel Hosting info */}
            <a
              href="https://app1-r35n02jty-khushpreet-singh.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full p-3 flex items-center justify-between text-left hover:bg-white/[0.03] transition cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md bg-[#0a84ff]/15 text-[#0a84ff] flex items-center justify-center">
                  <Globe className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-zinc-200">Vercel Production</span>
                    <span className="text-[9px] px-1 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-medium">Active</span>
                  </div>
                  <span className="text-[11px] text-[#0a84ff] hover:underline truncate max-w-[200px] block">
                    Open Live App ↗
                  </span>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-[#0a84ff]" />
            </a>

            {/* Vercel Dashboard */}
            <a
              href="https://vercel.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full p-2.5 px-3 flex items-center justify-between text-left hover:bg-white/[0.03] transition cursor-pointer text-[11px] text-zinc-500 hover:text-zinc-300"
            >
              <span>Manage domains & builds on Vercel</span>
              <ChevronRight className="w-3 h-3 text-zinc-500" />
            </a>
          </div>
        </div>

        {/* 3. DATA BACKUP GROUP */}
        <div className="space-y-1.5">
          <span className="text-[11px] text-zinc-500 font-medium px-1 uppercase tracking-wider">
            Raw JSON Backup
          </span>
          <div className="bg-[#121215] rounded-xl overflow-hidden divide-y divide-white/[0.04] border border-white/[0.06]">
            <button
              onClick={handleExportDownload}
              className="w-full p-3 text-left flex items-center justify-between text-xs text-zinc-300 hover:bg-white/[0.03] transition cursor-pointer"
            >
              <span>Export JSON Backup File</span>
              <Download className="w-3.5 h-3.5 text-[#0a84ff]" />
            </button>

            <button
              onClick={handleCopyExport}
              className="w-full p-3 text-left flex items-center justify-between text-xs text-zinc-300 hover:bg-white/[0.03] transition cursor-pointer"
            >
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Database to Clipboard'}</span>
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-500" />}
            </button>
          </div>
        </div>

        {/* 3. RESTORE GROUP */}
        <div className="space-y-1.5">
          <span className="text-[11px] text-zinc-500 font-medium px-1 uppercase tracking-wider">
            Restore
          </span>
          <div className="bg-[#121215] rounded-xl p-3 space-y-2 border border-white/[0.06]">
            <textarea
              rows={2}
              placeholder="Paste JSON database dump here to restore..."
              value={importJsonText}
              onChange={e => setImportJsonText(e.target.value)}
              className="w-full bg-black/40 border border-white/[0.06] rounded-lg p-2 text-xs text-zinc-100 font-mono focus:outline-none placeholder:text-zinc-600 resize-none"
            />
            {importStatus && (
              <p className="text-xs text-amber-400 font-medium">{importStatus}</p>
            )}
            <button
              type="button"
              onClick={handleImportSubmit}
              disabled={!importJsonText.trim()}
              className="text-xs text-[#0a84ff] font-medium disabled:opacity-40 hover:underline cursor-pointer flex items-center gap-1"
            >
              <Upload className="w-3 h-3" />
              <span>Restore from Text</span>
            </button>
          </div>
        </div>

        {/* 4. RESET DATA */}
        <div className="pt-1">
          <button
            onClick={handleReset}
            className="w-full p-2.5 rounded-xl bg-white/[0.02] hover:bg-rose-500/10 border border-white/[0.04] text-xs font-medium text-rose-400 flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset to Sample Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
