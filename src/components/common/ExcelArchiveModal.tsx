import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileSpreadsheet,
  Download,
  Check,
  Copy,
  ExternalLink,
  X,
  History,
  Cloud,
  RefreshCw,
  LogOut,
  AlertCircle,
} from 'lucide-react';
import { buildLifetimeMasterLedger } from '../../utils/excelExport';
import {
  initAuth,
  googleSignIn,
  logoutGoogle,
  getAccessToken,
} from '../../services/googleAuth';
import {
  syncToGoogleSheets,
  getSavedGoogleSheetInfo,
  GoogleSheetsSyncResult,
} from '../../services/googleSheetsSync';
import { User } from 'firebase/auth';

interface ExcelArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExcelArchiveModal: React.FC<ExcelArchiveModalProps> = ({ isOpen, onClose }) => {
  const {
    activityLog,
    projects,
    routines,
    habits,
    rough,
    phases,
    learning,
    exportToExcel,
  } = useApp();

  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Google Sheets Cloud Sync State
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [savedSheetInfo, setSavedSheetInfo] = useState(getSavedGoogleSheetInfo());

  // Listen to auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, currentToken) => {
        setUser(currentUser);
        setToken(currentToken);
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSavedSheetInfo(getSavedGoogleSheetInfo());
      setSyncStatusMessage(null);
      setSyncError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Build live master ledger
  const masterLedger = buildLifetimeMasterLedger(
    activityLog,
    projects,
    routines,
    habits,
    rough,
    phases
  );

  const totalTasks = projects.reduce((acc, p) => acc + p.subtasks.length, 0);
  const completedTasks = projects.reduce(
    (acc, p) => acc + p.subtasks.filter(st => st.completed).length,
    0
  );
  const routineCompletionsCount = routines.reduce(
    (acc, r) => acc + r.completedDates.length,
    0
  );
  const habitCompletionsCount = habits.reduce(
    (acc, h) => acc + h.completedDates.length,
    0
  );

  const handleDownload = () => {
    setDownloading(true);
    try {
      exportToExcel();
      setTimeout(() => setDownloading(false), 800);
    } catch (e) {
      console.error(e);
      setDownloading(false);
    }
  };

  const executeSyncWithToken = async (activeToken: string) => {
    setIsSyncing(true);
    setSyncError(null);
    setSyncStatusMessage(null);
    try {
      const res: GoogleSheetsSyncResult = await syncToGoogleSheets(activeToken, {
        activityLog,
        projects,
        routines,
        habits,
        rough,
        phases,
        learning,
      });

      setSavedSheetInfo({
        sheetId: res.spreadsheetId,
        sheetUrl: res.spreadsheetUrl,
        lastSyncedAt: res.syncedAt,
      });

      setSyncStatusMessage(
        res.isNew
          ? `✓ Created "FocusDo Lifetime Archive" in your Google Sheets with ${res.totalEntriesSynced} lifetime entries!`
          : `✓ Updated all 6 worksheets with ${res.totalEntriesSynced} lifetime entries!`
      );
    } catch (err: any) {
      console.error('Failed to sync to Google Sheets:', err);
      setSyncError(err.message || 'Failed to sync with Google Sheets. Please check your connection.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsSigningIn(true);
    setSyncError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        // Automatically sync immediately after login so user doesn't have to click twice
        await executeSyncWithToken(res.accessToken);
      }
    } catch (err: any) {
      console.error('Google Sign-In failed', err);
      if (err.code === 'auth/popup-blocked') {
        setSyncError('Browser popup was blocked. Please click the popup/lock icon in your browser URL bar to allow popups for this site, then try again.');
      } else if (err.code === 'auth/cancelled-popup-request' || err.code === 'auth/popup-closed-by-user') {
        setSyncError('Google sign-in popup was closed before completing. Click to try again.');
      } else {
        setSyncError(err.message || 'Google sign-in was interrupted. Please try again.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await logoutGoogle();
      setUser(null);
      setToken(null);
      setSyncStatusMessage(null);
    } catch (err: any) {
      console.error('Logout error', err);
    }
  };

  const handleSyncToSheets = async () => {
    setSyncError(null);
    setSyncStatusMessage(null);

    let activeToken = token;
    if (!activeToken) {
      activeToken = await getAccessToken();
    }

    if (!activeToken) {
      // Must prompt sign-in first
      try {
        const signinRes = await googleSignIn();
        if (signinRes) {
          setUser(signinRes.user);
          setToken(signinRes.accessToken);
          activeToken = signinRes.accessToken;
          await executeSyncWithToken(activeToken);
        }
      } catch (err: any) {
        if (err.code === 'auth/popup-blocked') {
          setSyncError('Browser popup was blocked. Please allow popups in your browser address bar and try again.');
        } else {
          setSyncError('Please sign in to Google to sync your spreadsheet.');
        }
      }
      return;
    }

    await executeSyncWithToken(activeToken);
  };

  const handleCopySummary = () => {
    const lines = [
      `FOCUSDO LIFETIME ARCHIVE REPORT`,
      `Generated: ${new Date().toLocaleString()}`,
      `Total Lifetime Records: ${masterLedger.length}`,
      `-----------------------------------------`,
      `Completed Tasks: ${completedTasks} of ${totalTasks}`,
      `Routine Checkpoints Logged: ${routineCompletionsCount}`,
      `Habit Days Completed: ${habitCompletionsCount}`,
      `Notes Archived: ${rough.length}`,
      `-----------------------------------------`,
      `Recent Activity:`,
      ...masterLedger.slice(0, 15).map(
        entry =>
          `[${entry.date} ${entry.time}] [${entry.type.toUpperCase()}] ${entry.title} (${entry.status})`
      ),
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-[#18181b] border-t sm:border border-white/10 rounded-t-2xl sm:rounded-2xl w-full max-w-xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Apple & Notion Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/25">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base text-zinc-100">
                Lifetime Archive & Google Sheets
              </h3>
              <p className="text-xs text-zinc-500">
                Direct Google Sheets sync + Excel (.xlsx) export
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-100 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. DIRECT GOOGLE SHEETS CLOUD SYNC SECTION */}
        <div className="p-4 rounded-xl bg-[#121215] border border-emerald-500/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs font-semibold tracking-wide text-emerald-400 flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5" /> Direct Google Sheets Sync
              </span>
            </div>
            {savedSheetInfo.lastSyncedAt && (
              <span className="text-[10px] text-zinc-500 font-mono">
                Updated {new Date(savedSheetInfo.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Automatically create and sync a permanent spreadsheet directly inside your Google Drive so it is waiting for you every time you open Google Sheets.
          </p>

          {/* User Sign-In or Signed-In Info */}
          {!user ? (
            <div className="pt-1">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isSigningIn}
                className="gsi-material-button"
              >
                <div className="gsi-material-button-state"></div>
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon">
                    <svg
                      version="1.1"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 48 48"
                      style={{ display: 'block' }}
                    >
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      ></path>
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      ></path>
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      ></path>
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      ></path>
                      <path fill="none" d="M0 0h48v48H0z"></path>
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents">
                    {isSigningIn ? 'Connecting to Google...' : 'Sign in with Google to Sync'}
                  </span>
                </div>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* User badge */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/[0.06] text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Google User'}
                      className="w-6 h-6 rounded-full border border-white/20"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                      {user.email?.charAt(0).toUpperCase() || 'G'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="font-semibold text-zinc-100 truncate block">
                      {user.displayName || 'Google Account'}
                    </span>
                    <span className="text-[11px] text-zinc-500 truncate block">
                      {user.email}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleGoogleLogout}
                  className="px-2.5 py-1 text-[11px] text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.08] rounded-lg transition cursor-pointer flex items-center gap-1"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Switch</span>
                </button>
              </div>

              {/* Sync Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleSyncToSheets}
                  disabled={isSyncing}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-black font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Syncing to Google Sheets...' : 'Sync to Google Sheets Now'}</span>
                </button>

                {savedSheetInfo.sheetUrl && (
                  <a
                    href={savedSheetInfo.sheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 font-medium text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border border-white/[0.08]"
                  >
                    <span>Open in Google Sheets</span>
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Sync Success Message */}
          {syncStatusMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-400 font-medium flex items-center justify-between">
              <span>{syncStatusMessage}</span>
              {savedSheetInfo.sheetUrl && (
                <a
                  href={savedSheetInfo.sheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline ml-2 flex-shrink-0 flex items-center gap-1"
                >
                  View File <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}

          {/* Sync Error Message */}
          {syncError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{syncError}</span>
            </div>
          )}
        </div>

        {/* 2. BIG LIFETIME STATS HERO */}
        <div className="p-4 rounded-xl bg-[#121215] border border-white/[0.06]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-emerald-400" /> Permanent Ledger
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.06] text-zinc-400 font-medium">
              Lifetime Storage
            </span>
          </div>

          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-zinc-100 tracking-tight">
              {masterLedger.length}
            </span>
            <span className="text-xs font-medium text-zinc-500">
              Lifetime entries captured forever
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <span className="text-base font-bold text-zinc-100 block">{completedTasks}</span>
              <span className="text-[10px] text-zinc-500 uppercase font-medium">Tasks Done</span>
            </div>
            <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <span className="text-base font-bold text-zinc-100 block">{routineCompletionsCount}</span>
              <span className="text-[10px] text-zinc-500 uppercase font-medium">Routines</span>
            </div>
            <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <span className="text-base font-bold text-zinc-100 block">{habitCompletionsCount}</span>
              <span className="text-[10px] text-zinc-500 uppercase font-medium">Habit Days</span>
            </div>
            <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <span className="text-base font-bold text-zinc-100 block">{rough.length}</span>
              <span className="text-[10px] text-zinc-500 uppercase font-medium">Notes</span>
            </div>
          </div>
        </div>

        {/* 3. LOCAL EXCEL DOWNLOAD & COPY */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold tracking-wide text-zinc-400">
              Offline Excel (.xlsx) File
            </span>
            <span className="text-[10px] text-zinc-500">For MS Excel & Apple Numbers</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="py-2.5 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 font-medium text-xs flex items-center justify-center gap-2 border border-white/[0.08] transition cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>{downloading ? 'Downloading...' : 'Download .xlsx File'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopySummary}
              className="py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-200 font-medium text-xs flex items-center justify-center gap-2 border border-white/[0.06] transition cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied Summary!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Summary Log</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 4. WORKBOOK BREAKDOWN */}
        <div className="space-y-2">
          <span className="text-xs font-semibold tracking-wide text-zinc-400 px-1">
            6 Worksheets Synced to Google Sheets
          </span>
          <div className="bg-[#121215] rounded-xl p-3 divide-y divide-white/[0.04] border border-white/[0.06] text-xs space-y-1.5">
            <div className="pt-1 flex items-center justify-between text-zinc-200">
              <span className="flex items-center gap-2">
                <span className="font-mono text-emerald-400 font-bold">1</span>
                <span>Master Activity Log</span>
              </span>
              <span className="text-[11px] text-zinc-500">Complete chronological audit</span>
            </div>
            <div className="pt-1.5 flex items-center justify-between text-zinc-200">
              <span className="flex items-center gap-2">
                <span className="font-mono text-[#0a84ff] font-bold">2</span>
                <span>Projects & Tasks</span>
              </span>
              <span className="text-[11px] text-zinc-500">Subtasks, status & deadlines</span>
            </div>
            <div className="pt-1.5 flex items-center justify-between text-zinc-200">
              <span className="flex items-center gap-2">
                <span className="font-mono text-[#bf5af2] font-bold">3</span>
                <span>Routines History</span>
              </span>
              <span className="text-[11px] text-zinc-500">Cadence & date timestamps</span>
            </div>
            <div className="pt-1.5 flex items-center justify-between text-zinc-200">
              <span className="flex items-center gap-2">
                <span className="font-mono text-[#ff9500] font-bold">4</span>
                <span>Habits & Streaks</span>
              </span>
              <span className="text-[11px] text-zinc-500">14-day trials & success rates</span>
            </div>
            <div className="pt-1.5 flex items-center justify-between text-zinc-200">
              <span className="flex items-center gap-2">
                <span className="font-mono text-[#ffd60a] font-bold">5</span>
                <span>Quick Notes Archive</span>
              </span>
              <span className="text-[11px] text-zinc-500">Thoughts & categories</span>
            </div>
            <div className="pt-1.5 flex items-center justify-between text-zinc-200">
              <span className="flex items-center gap-2">
                <span className="font-mono text-[#30d158] font-bold">6</span>
                <span>Focus & 2-Week Phases</span>
              </span>
              <span className="text-[11px] text-zinc-500">Sprints & season goals</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
