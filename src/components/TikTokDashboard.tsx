import React, {useRef, useState} from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  LogOut,
  RefreshCcw,
  Upload,
  Video,
  type LucideIcon,
} from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';

import type {TikTokSession} from '../lib/tiktokAuth';
import {
  createChunkPlan,
  fetchTikTokUploadStatus,
  initializeTikTokUpload,
  pollTikTokUploadStatus,
  type TikTokUploadStatus,
  uploadVideoToStorage,
} from '../lib/tiktokUpload';

type TikTokDashboardProps = {
  onLogout: () => void;
  session: TikTokSession;
};

type UploadState = {
  error: string | null;
  isUploading: boolean;
  message: string;
  progress: number;
  publishId: string | null;
  status: TikTokUploadStatus | null;
  uploadedBytes: number;
};

type StatusCardTheme = {
  Icon: LucideIcon;
  badge: string;
  badgeClassName: string;
  description: string;
  glowClassName: string;
  iconClassName: string;
  iconSurfaceClassName: string;
  isLive: boolean;
  progressClassName: string;
  progressLabel: string;
  title: string;
  visualProgress: number;
};

type StatusMilestone = {
  detail: string;
  label: string;
  state: 'active' | 'done' | 'error' | 'pending';
};

const initialUploadState: UploadState = {
  error: null,
  isUploading: false,
  message: 'Select a video to upload it as a TikTok draft.',
  progress: 0,
  publishId: null,
  status: null,
  uploadedBytes: 0,
};

export function TikTokDashboard({onLogout, session}: TikTokDashboardProps) {
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>(initialUploadState);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const displayName = session.profile?.displayName || 'TikTok Creator';
  const avatarUrl = session.profile?.avatarUrl || null;
  const statusTheme = getStatusCardTheme(uploadState);
  const statusMilestones = getStatusMilestones(uploadState);
  const statusRows = getStatusRows(uploadState);

  const handlePickFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] || null;
    setSelectedFile(nextFile);
    setUploadState(initialUploadState);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadState((currentState) => ({
        ...currentState,
        error: 'Choose a video file first.',
      }));
      return;
    }

    try {
      const chunkPlan = createChunkPlan(selectedFile.size);

      setUploadState({
        error: null,
        isUploading: true,
        message: 'Creating a secure Cloudflare upload session...',
        progress: 0,
        publishId: null,
        status: null,
        uploadedBytes: 0,
      });

      setUploadState((currentState) => ({
        ...currentState,
        message: `Uploading ${chunkPlan.totalChunkCount} chunk${chunkPlan.totalChunkCount > 1 ? 's' : ''} to Cloudflare storage...`,
      }));

      const uploadedAsset = await uploadVideoToStorage(selectedFile, chunkPlan, (progress, uploadedBytes) => {
        setUploadState((currentState) => ({
          ...currentState,
          progress,
          uploadedBytes,
        }));
      });

      setUploadState((currentState) => ({
        ...currentState,
        message: 'Cloudflare upload complete. Requesting TikTok draft import...',
        progress: 100,
        uploadedBytes: selectedFile.size,
      }));

      const uploadInit = await initializeTikTokUpload(session.accessToken, uploadedAsset.mediaUrl);

      setUploadState((currentState) => ({
        ...currentState,
        message: 'TikTok accepted the draft import request. Waiting for TikTok to process the video...',
        publishId: uploadInit.publishId,
      }));

      const latestStatus = await pollTikTokUploadStatus(session.accessToken, uploadInit.publishId, (status) => {
        setUploadState((currentState) => ({
          ...currentState,
          message: buildStatusMessage(status),
          status,
        }));
      });

      setUploadState((currentState) => ({
        ...currentState,
        isUploading: false,
        message: buildStatusMessage(latestStatus),
        status: latestStatus,
      }));
    } catch (error) {
      setUploadState((currentState) => ({
        ...currentState,
        error: error instanceof Error ? error.message : 'TikTok upload failed.',
        isUploading: false,
        message: 'The TikTok upload flow stopped before completion.',
      }));
    }
  };

  const handleRefreshStatus = async () => {
    if (!uploadState.publishId) {
      return;
    }

    try {
      setUploadState((currentState) => ({
        ...currentState,
        error: null,
        message: 'Refreshing TikTok upload status...',
      }));

      const latestStatus = await fetchTikTokUploadStatus(session.accessToken, uploadState.publishId);

      setUploadState((currentState) => ({
        ...currentState,
        message: buildStatusMessage(latestStatus),
        status: latestStatus,
      }));
    } catch (error) {
      setUploadState((currentState) => ({
        ...currentState,
        error: error instanceof Error ? error.message : 'Could not refresh TikTok upload status.',
      }));
    }
  };

  const openLogoutDialog = () => {
    setIsLogoutDialogOpen(true);
  };

  const closeLogoutDialog = () => {
    setIsLogoutDialogOpen(false);
  };

  const handleConfirmLogout = () => {
    setIsLogoutDialogOpen(false);
    onLogout();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col lg:flex-row">
        <aside className="w-full border-b border-slate-800 bg-slate-950/95 px-6 py-8 lg:w-80 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-400 text-lg font-black text-slate-950">
              F
            </div>
            <div>
              <p className="text-lg font-bold">Fancambo</p>
              <p className="text-sm text-slate-400">TikTok Dashboard</p>
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
            <div className="flex items-center gap-3">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="h-12 w-12 rounded-2xl object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-base font-bold text-slate-200">
                  {displayName.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-semibold text-white">{displayName}</p>
                <p className="text-sm text-slate-400">{shortenValue(session.openId || session.profile?.openId || 'Connected')}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              Connected scopes: <span className="text-slate-100">{session.scope.join(', ')}</span>
            </p>
          </div>

          <nav className="mt-8 space-y-3">
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-2xl border border-sky-400/20 bg-sky-400/10 px-4 py-3 text-left text-sky-100"
            >
              <Video size={18} />
              <span className="font-semibold">Upload Video</span>
            </button>
          </nav>

          <button
            type="button"
            onClick={openLogoutDialog}
            className="mt-8 inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-800"
          >
            <LogOut size={16} />
            Log Out
          </button>
        </aside>

        <main className="flex-1 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_28%),linear-gradient(180deg,_rgba(15,23,42,0.98),_rgba(2,6,23,1))] px-6 py-8 sm:px-10">
          <div className="mx-auto max-w-4xl space-y-8">
            <header className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-200/80">Upload Workspace</p>
              <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">Upload Video</h1>
              <p className="max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
                Upload a video draft to TikTok. After TikTok finishes processing, the creator will receive an inbox
                notification in TikTok to continue editing and post it.
              </p>
            </header>

            <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur-xl sm:p-8">
                <div className="space-y-6">
                  <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-950/40 p-8 text-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-sky-400/15 text-sky-200">
                      <Upload size={28} />
                    </div>
                    <h2 className="mt-5 text-2xl font-bold text-white">Choose a video file</h2>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      Supported examples: MP4, WEBM, MOV. TikTok draft uploads support files up to 4 GB.
                    </p>
                    <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={handlePickFile}
                        className="inline-flex items-center justify-center rounded-2xl bg-sky-400 px-5 py-3 text-sm font-bold text-slate-950 transition-colors hover:bg-sky-300"
                      >
                        Select Video
                      </button>
                      <button
                        type="button"
                        onClick={handleUpload}
                        disabled={!selectedFile || uploadState.isUploading}
                        className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900 disabled:text-slate-500"
                      >
                        {uploadState.isUploading ? 'Uploading...' : 'Upload to TikTok'}
                      </button>
                    </div>
                  </div>

                  {selectedFile && (
                    <div className="rounded-3xl border border-slate-800 bg-slate-950/50 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Selected File</p>
                          <h3 className="mt-2 text-lg font-bold text-white">{selectedFile.name}</h3>
                          <p className="mt-1 text-sm text-slate-400">
                            {formatBytes(selectedFile.size)} {selectedFile.type ? `| ${selectedFile.type}` : ''}
                          </p>
                        </div>
                        <Video className="text-sky-300" size={22} />
                      </div>
                    </div>
                  )}

                  <div className="rounded-3xl border border-slate-800 bg-slate-950/50 p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Upload Progress</p>
                        <p className="mt-2 text-lg font-bold text-white">{uploadState.message}</p>
                      </div>
                      <span className="text-2xl font-black text-sky-200">{uploadState.progress}%</span>
                    </div>

                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-300 transition-all duration-300"
                        style={{width: `${uploadState.progress}%`}}
                      />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-400">
                      <span>Uploaded: {formatBytes(uploadState.uploadedBytes)}</span>
                      {uploadState.publishId && <span>Publish ID: {uploadState.publishId}</span>}
                    </div>

                    {uploadState.error && (
                      <p className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                        {uploadState.error}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
                  <div className="relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-slate-950/60 p-5">
                    <motion.div
                      aria-hidden="true"
                      className={`pointer-events-none absolute inset-0 ${statusTheme.glowClassName}`}
                      animate={statusTheme.isLive ? {opacity: [0.25, 0.55, 0.25], scale: [1, 1.04, 1]} : {opacity: 0.32, scale: 1}}
                      transition={{duration: 3.6, ease: 'easeInOut', repeat: statusTheme.isLive ? Infinity : 0}}
                    />

                    <div className="relative">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <motion.div
                            className={`flex h-12 w-12 items-center justify-center rounded-2xl ${statusTheme.iconSurfaceClassName}`}
                            animate={statusTheme.isLive ? {scale: [1, 1.05, 1]} : {scale: 1}}
                            transition={{duration: 2.4, ease: 'easeInOut', repeat: statusTheme.isLive ? Infinity : 0}}
                          >
                            <statusTheme.Icon className={statusTheme.iconClassName} size={22} />
                          </motion.div>
                          <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-200/70">TikTok Status</p>
                            <p className="mt-1 text-xs text-slate-400">Live draft delivery signal</p>
                          </div>
                        </div>

                        <motion.div
                          className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] ${statusTheme.badgeClassName}`}
                          animate={statusTheme.isLive ? {opacity: [0.72, 1, 0.72], y: [0, -1, 0]} : {opacity: 1, y: 0}}
                          transition={{duration: 1.8, ease: 'easeInOut', repeat: statusTheme.isLive ? Infinity : 0}}
                        >
                          {statusTheme.badge}
                        </motion.div>
                      </div>

                      <AnimatePresence mode="wait">
                        <motion.div
                          key={`${uploadState.status?.status || 'idle'}-${uploadState.publishId || 'draft'}-${uploadState.progress}`}
                          animate={{opacity: 1, y: 0}}
                          exit={{opacity: 0, y: -12}}
                          initial={{opacity: 0, y: 12}}
                          transition={{duration: 0.28, ease: 'easeOut'}}
                        >
                          <h3 className="mt-6 text-2xl font-black tracking-tight text-white">{statusTheme.title}</h3>
                          <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">{statusTheme.description}</p>
                        </motion.div>
                      </AnimatePresence>

                      <div className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Signal Strength</p>
                          <span className="text-xs font-semibold text-slate-300">{statusTheme.progressLabel}</span>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                          <motion.div
                            className={`h-full rounded-full bg-gradient-to-r ${statusTheme.progressClassName}`}
                            animate={{width: `${statusTheme.visualProgress}%`}}
                            initial={{width: 0}}
                            transition={{duration: 0.55, ease: 'easeOut'}}
                          />
                        </div>
                        {statusTheme.isLive && (
                          <motion.div
                            aria-hidden="true"
                            className="mt-3 h-px w-28 bg-gradient-to-r from-transparent via-sky-300 to-transparent"
                            animate={{x: ['-20%', '260%']}}
                            transition={{duration: 1.8, ease: 'linear', repeat: Infinity}}
                          />
                        )}
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        {statusMilestones.map((milestone, index) => (
                          <motion.div
                            key={milestone.label}
                            animate={{opacity: 1, y: 0}}
                            initial={{opacity: 0, y: 16}}
                            transition={{delay: index * 0.06, duration: 0.24, ease: 'easeOut'}}
                          >
                            <StatusMilestoneCard milestone={milestone} />
                          </motion.div>
                        ))}
                      </div>

                      <div className="mt-5 space-y-3 text-sm text-slate-300">
                        {statusRows.map((row, index) => (
                          <motion.div
                            key={row.label}
                            animate={{opacity: 1, x: 0}}
                            initial={{opacity: 0, x: 12}}
                            transition={{delay: index * 0.05, duration: 0.24, ease: 'easeOut'}}
                          >
                            <StatusRow label={row.label} value={row.value} />
                          </motion.div>
                        ))}
                      </div>

                      {uploadState.status ? (
                        <button
                          type="button"
                          onClick={handleRefreshStatus}
                          className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 font-semibold text-white transition-colors hover:bg-white/10"
                        >
                          <RefreshCcw size={16} />
                          Refresh Status
                        </button>
                      ) : (
                        <p className="mt-5 text-sm leading-6 text-slate-400">
                          Once the upload starts, TikTok processing details and publish status will animate here in real time.
                        </p>
                      )}
                    </div>
                  </div>
                </section>

                <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="text-emerald-300" size={20} />
                    <h2 className="text-xl font-bold text-white">What Happens Next</h2>
                  </div>
                  <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-300">
                    <li>1. Fancambo uploads the selected file to your Cloudflare-backed storage in secure parts.</li>
                    <li>2. Fancambo asks TikTok to pull that file into a draft workflow using the saved account session.</li>
                    <li>3. TikTok processes the upload and sends it to the creator inbox for final editing.</li>
                    <li>4. The creator finishes the edit and posts from TikTok.</li>
                  </ul>
                  <a
                    href="https://developers.tiktok.com/doc/content-posting-api-get-started-upload/"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-sky-200 hover:text-sky-100"
                  >
                    TikTok upload guide
                    <ArrowUpRight size={16} />
                  </a>
                </section>
              </div>
            </section>
          </div>
        </main>
      </div>

      {isLogoutDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-6 py-10 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-slate-900 p-7 shadow-2xl shadow-slate-950/60">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-400/10 text-rose-300">
                <AlertTriangle size={24} />
              </div>
              <div className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-rose-200/90">Log Out</p>
                <h2 className="text-2xl font-black tracking-tight text-white">Delete saved TikTok session from this browser?</h2>
                <p className="text-sm leading-7 text-slate-300">
                  If you log out now, Fancambo will delete the saved TikTok token, profile session, and local auth data from this device.
                </p>
                <p className="text-sm leading-7 text-slate-400">
                  You can always come back later and connect TikTok again when you are ready to upload more content.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/60 p-4 text-sm leading-6 text-slate-300">
              This action clears local data stored for the current browser session, including the access token used for TikTok uploads.
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeLogoutDialog}
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Come back later
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="inline-flex items-center justify-center rounded-2xl bg-rose-500 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-rose-400"
              >
                Delete Data and Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusRow({label, value}: {label: string; value: string}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-100">{value}</p>
    </div>
  );
}

function StatusMilestoneCard({milestone}: {milestone: StatusMilestone}) {
  const classes = getMilestoneClasses(milestone.state);

  return (
    <div className={`relative overflow-hidden rounded-3xl border px-4 py-4 ${classes.wrapper}`}>
      {milestone.state === 'active' && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-[-30%] w-20 bg-gradient-to-r from-transparent via-sky-300/30 to-transparent"
          animate={{x: ['-30%', '220%']}}
          transition={{duration: 1.9, ease: 'linear', repeat: Infinity}}
        />
      )}
      <div className="relative">
        <span className={`inline-flex h-2.5 w-2.5 rounded-full ${classes.dot}`} />
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{milestone.label}</p>
        <p className="mt-2 text-sm font-medium text-slate-100">{milestone.detail}</p>
      </div>
    </div>
  );
}

function buildStatusMessage(status: TikTokUploadStatus) {
  switch (status.status) {
    case 'SEND_TO_USER_INBOX':
      return 'TikTok finished processing. The creator should now see the draft in their TikTok inbox.';
    case 'PUBLISH_COMPLETE':
      return 'TikTok reports that the post has been published successfully.';
    case 'FAILED':
      return status.fail_reason || 'TikTok reported that the upload failed.';
    default:
      return 'TikTok is still processing the uploaded draft.';
  }
}

function getStatusCardTheme(uploadState: UploadState): StatusCardTheme {
  const statusCode = uploadState.status?.status;

  if (statusCode === 'SEND_TO_USER_INBOX') {
    return {
      Icon: CheckCircle2,
      badge: 'Ready',
      badgeClassName: 'bg-emerald-400/15 text-emerald-200',
      description: 'TikTok finished processing and delivered the draft to the creator inbox for final editing and posting.',
      glowClassName: 'bg-[radial-gradient(circle_at_top_right,_rgba(52,211,153,0.2),_transparent_55%)]',
      iconClassName: 'text-emerald-200',
      iconSurfaceClassName: 'bg-emerald-400/15',
      isLive: false,
      progressClassName: 'from-emerald-400 via-cyan-300 to-sky-300',
      progressLabel: 'Inbox handoff complete',
      title: 'Draft delivered to the creator inbox',
      visualProgress: 100,
    };
  }

  if (statusCode === 'PUBLISH_COMPLETE') {
    return {
      Icon: CheckCircle2,
      badge: 'Published',
      badgeClassName: 'bg-emerald-400/15 text-emerald-200',
      description: 'TikTok reports that the upload completed all the way through publishing successfully.',
      glowClassName: 'bg-[radial-gradient(circle_at_top_right,_rgba(34,197,94,0.18),_transparent_55%)]',
      iconClassName: 'text-emerald-200',
      iconSurfaceClassName: 'bg-emerald-400/15',
      isLive: false,
      progressClassName: 'from-emerald-400 via-lime-300 to-cyan-300',
      progressLabel: 'Publish complete',
      title: 'TikTok marked the post as published',
      visualProgress: 100,
    };
  }

  if (statusCode === 'FAILED') {
    return {
      Icon: AlertTriangle,
      badge: 'Issue',
      badgeClassName: 'bg-rose-400/15 text-rose-200',
      description: uploadState.status?.fail_reason || 'TikTok stopped processing this draft. Refresh the signal or retry with a new upload.',
      glowClassName: 'bg-[radial-gradient(circle_at_top_right,_rgba(251,113,133,0.18),_transparent_55%)]',
      iconClassName: 'text-rose-200',
      iconSurfaceClassName: 'bg-rose-400/15',
      isLive: false,
      progressClassName: 'from-rose-400 via-orange-300 to-amber-300',
      progressLabel: 'Needs review',
      title: 'TikTok reported an upload issue',
      visualProgress: 100,
    };
  }

  if (uploadState.status) {
    return {
      Icon: Clock3,
      badge: 'Live',
      badgeClassName: 'bg-sky-400/15 text-sky-100',
      description: 'TikTok has the draft request and is still processing the video before handing it to the creator inbox.',
      glowClassName: 'bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.18),_transparent_55%)]',
      iconClassName: 'text-sky-200',
      iconSurfaceClassName: 'bg-sky-400/15',
      isLive: true,
      progressClassName: 'from-sky-400 via-cyan-300 to-violet-300',
      progressLabel: 'TikTok processing',
      title: 'TikTok is actively processing the draft',
      visualProgress: clampProgress(uploadState.status.progress ?? 82),
    };
  }

  if (uploadState.isUploading || uploadState.publishId || uploadState.progress > 0) {
    return {
      Icon: Clock3,
      badge: 'Moving',
      badgeClassName: 'bg-sky-400/15 text-sky-100',
      description: 'Fancambo is moving the file into storage and preparing the TikTok import request for the connected account.',
      glowClassName: 'bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.16),_transparent_55%)]',
      iconClassName: 'text-sky-200',
      iconSurfaceClassName: 'bg-sky-400/15',
      isLive: true,
      progressClassName: 'from-sky-400 via-cyan-300 to-blue-300',
      progressLabel: uploadState.progress >= 100 ? 'Import request queued' : `${uploadState.progress}% uploaded`,
      title: 'Draft pipeline is warming up',
      visualProgress: clampProgress(Math.max(uploadState.publishId ? 72 : 14, uploadState.progress)),
    };
  }

  return {
    Icon: Clock3,
    badge: 'Idle',
    badgeClassName: 'bg-white/10 text-slate-200',
    description: 'Choose a video and start the upload flow to see the live TikTok processing story appear here.',
    glowClassName: 'bg-[radial-gradient(circle_at_top_right,_rgba(148,163,184,0.12),_transparent_55%)]',
    iconClassName: 'text-slate-200',
    iconSurfaceClassName: 'bg-white/10',
    isLive: false,
    progressClassName: 'from-slate-500 via-slate-400 to-slate-300',
    progressLabel: 'Waiting for activity',
    title: 'No TikTok activity yet',
    visualProgress: 8,
  };
}

function getStatusMilestones(uploadState: UploadState): StatusMilestone[] {
  const statusCode = uploadState.status?.status;

  return [
    {
      detail:
        uploadState.uploadedBytes > 0
          ? `${formatBytes(uploadState.uploadedBytes)} transferred`
          : 'Waiting for file selection',
      label: 'Storage Upload',
      state:
        uploadState.progress >= 100 || Boolean(uploadState.publishId) || Boolean(uploadState.status)
          ? 'done'
          : uploadState.isUploading
            ? 'active'
            : 'pending',
    },
    {
      detail: uploadState.publishId ? shortenValue(uploadState.publishId) : 'TikTok publish ID pending',
      label: 'TikTok Import',
      state:
        statusCode === 'FAILED'
          ? 'error'
          : uploadState.status
            ? 'done'
            : uploadState.publishId || (uploadState.isUploading && uploadState.progress >= 100)
              ? 'active'
              : 'pending',
    },
    {
      detail:
        statusCode === 'SEND_TO_USER_INBOX'
          ? 'Ready for final edit'
          : statusCode === 'PUBLISH_COMPLETE'
            ? 'Published on TikTok'
            : statusCode === 'FAILED'
              ? 'Needs another try'
              : uploadState.status
                ? 'TikTok is processing'
                : 'Waiting for TikTok signal',
      label: 'Creator Inbox',
      state:
        statusCode === 'FAILED'
          ? 'error'
          : statusCode === 'SEND_TO_USER_INBOX' || statusCode === 'PUBLISH_COMPLETE'
            ? 'done'
            : uploadState.status
              ? 'active'
              : 'pending',
    },
  ];
}

function getStatusRows(uploadState: UploadState) {
  const rows = [
    {
      label: 'Status',
      value: prettifyStatus(uploadState.status?.status || (uploadState.publishId ? 'IMPORT_REQUESTED' : uploadState.isUploading ? 'UPLOADING' : 'WAITING')),
    },
    {
      label: 'Uploaded Bytes',
      value: formatBytes(uploadState.status?.uploaded_bytes || uploadState.uploadedBytes),
    },
  ];

  if (uploadState.publishId) {
    rows.push({
      label: 'Publish ID',
      value: uploadState.publishId,
    });
  }

  if (uploadState.status?.publicaly_available_post_id) {
    rows.push({
      label: 'Public Post ID',
      value: uploadState.status.publicaly_available_post_id,
    });
  }

  if (uploadState.status?.fail_reason) {
    rows.push({
      label: 'Fail Reason',
      value: uploadState.status.fail_reason,
    });
  }

  return rows;
}

function getMilestoneClasses(state: StatusMilestone['state']) {
  switch (state) {
    case 'done':
      return {
        dot: 'bg-emerald-300 shadow-[0_0_0_6px_rgba(52,211,153,0.14)]',
        wrapper: 'border-emerald-400/20 bg-emerald-400/8',
      };
    case 'active':
      return {
        dot: 'bg-sky-300 shadow-[0_0_0_6px_rgba(56,189,248,0.14)]',
        wrapper: 'border-sky-400/20 bg-sky-400/8',
      };
    case 'error':
      return {
        dot: 'bg-rose-300 shadow-[0_0_0_6px_rgba(251,113,133,0.14)]',
        wrapper: 'border-rose-400/20 bg-rose-400/8',
      };
    default:
      return {
        dot: 'bg-slate-500',
        wrapper: 'border-white/10 bg-white/5',
      };
  }
}

function prettifyStatus(value: string) {
  switch (value) {
    case 'SEND_TO_USER_INBOX':
      return 'Send to User Inbox';
    case 'PUBLISH_COMPLETE':
      return 'Publish Complete';
    case 'IMPORT_REQUESTED':
      return 'Import Requested';
    case 'UPLOADING':
      return 'Uploading';
    case 'WAITING':
      return 'Waiting';
    default:
      return value
        .toLowerCase()
        .split('_')
        .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
        .join(' ');
  }
}

function shortenValue(value: string) {
  if (value.length <= 18) {
    return value;
  }

  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function formatBytes(value: number) {
  if (value <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const unitIndex = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const scaledValue = value / 1024 ** unitIndex;

  return `${scaledValue.toFixed(scaledValue >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function clampProgress(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}
