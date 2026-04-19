import React, {useEffect, useRef, useState} from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
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
  fetchTikTokCreatorInfo,
  fetchTikTokPostStatus,
  initializeTikTokDirectPost,
  pollTikTokPostStatus,
  type TikTokCreatorInfo,
  type TikTokPrivacyLevel,
  type TikTokUploadStatus,
  uploadVideoToStorage,
} from '../lib/tiktokUpload';

type TikTokDashboardProps = {
  onLogout: () => void;
  session: TikTokSession;
};

type CreatorInfoState = {
  data: TikTokCreatorInfo | null;
  error: string | null;
  isLoading: boolean;
};

type PostFormState = {
  allowComment: boolean;
  allowDuet: boolean;
  allowStitch: boolean;
  discloseBrandContent: boolean;
  discloseBrandOrganic: boolean;
  hasAcceptedMusicUsage: boolean;
  isAigc: boolean;
  privacyLevel: TikTokPrivacyLevel | '';
  title: string;
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

type SettingToggleProps = {
  checked: boolean;
  description: string;
  disabled?: boolean;
  label: string;
  onChange: (nextValue: boolean) => void;
};

const MUSIC_USAGE_CONFIRMATION_URL = 'https://www.tiktok.com/legal/page/global/music-usage-confirmation/en';

const initialCreatorInfoState: CreatorInfoState = {
  data: null,
  error: null,
  isLoading: false,
};

const initialPostFormState: PostFormState = {
  allowComment: false,
  allowDuet: false,
  allowStitch: false,
  discloseBrandContent: false,
  discloseBrandOrganic: false,
  hasAcceptedMusicUsage: false,
  isAigc: false,
  privacyLevel: '',
  title: '',
};

const initialUploadState: UploadState = {
  error: null,
  isUploading: false,
  message: 'Choose a video, review the TikTok settings, and confirm the publishing declaration.',
  progress: 0,
  publishId: null,
  status: null,
  uploadedBytes: 0,
};

export function TikTokDashboard({onLogout, session}: TikTokDashboardProps) {
  const [creatorInfoState, setCreatorInfoState] = useState<CreatorInfoState>(initialCreatorInfoState);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [postForm, setPostForm] = useState<PostFormState>(initialPostFormState);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>(initialUploadState);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const requiresReconnect = !session.scope.includes('video.publish');
  const creatorInfo = creatorInfoState.data;
  const displayName =
    creatorInfo?.creatorNickname ||
    session.profile?.displayName ||
    creatorInfo?.creatorUsername ||
    'TikTok Creator';
  const avatarUrl = creatorInfo?.creatorAvatarUrl || session.profile?.avatarUrl || null;
  const isCaptionTooLong = postForm.title.length > 2200;
  const isReadyToPost =
    Boolean(selectedFile) &&
    Boolean(creatorInfo) &&
    Boolean(postForm.privacyLevel) &&
    postForm.hasAcceptedMusicUsage &&
    !isCaptionTooLong &&
    !requiresReconnect;
  const statusTheme = getStatusCardTheme(uploadState);
  const statusMilestones = getStatusMilestones(uploadState);
  const statusRows = getStatusRows(uploadState);

  useEffect(() => {
    let isCancelled = false;

    async function loadCreatorInfo() {
      if (requiresReconnect) {
        setCreatorInfoState({
          data: null,
          error: 'Reconnect TikTok to grant the `video.publish` scope before using direct post.',
          isLoading: false,
        });
        return;
      }

      setCreatorInfoState((currentState) => ({
        data: currentState.data,
        error: null,
        isLoading: true,
      }));

      try {
        const data = await fetchTikTokCreatorInfo(session.accessToken);

        if (isCancelled) {
          return;
        }

        setCreatorInfoState({
          data,
          error: null,
          isLoading: false,
        });
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setCreatorInfoState({
          data: null,
          error: error instanceof Error ? error.message : 'Could not load TikTok creator settings.',
          isLoading: false,
        });
      }
    }

    void loadCreatorInfo();

    return () => {
      isCancelled = true;
    };
  }, [requiresReconnect, session.accessToken]);

  useEffect(() => {
    if (!creatorInfo) {
      return;
    }

    setPostForm((currentState) => ({
      ...currentState,
      allowComment: creatorInfo.commentDisabled ? false : currentState.allowComment,
      allowDuet: creatorInfo.duetDisabled ? false : currentState.allowDuet,
      allowStitch: creatorInfo.stitchDisabled ? false : currentState.allowStitch,
      privacyLevel: creatorInfo.privacyLevelOptions.includes(currentState.privacyLevel as TikTokPrivacyLevel)
        ? currentState.privacyLevel
        : '',
    }));
  }, [creatorInfo]);

  const handlePickFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] || null;
    setSelectedFile(nextFile);
    setUploadState(initialUploadState);
  };

  const refreshCreatorInfo = async () => {
    if (requiresReconnect) {
      setCreatorInfoState({
        data: null,
        error: 'Reconnect TikTok to grant the `video.publish` scope before using direct post.',
        isLoading: false,
      });
      return;
    }

    try {
      setCreatorInfoState((currentState) => ({
        data: currentState.data,
        error: null,
        isLoading: true,
      }));

      const data = await fetchTikTokCreatorInfo(session.accessToken);
      setCreatorInfoState({
        data,
        error: null,
        isLoading: false,
      });
    } catch (error) {
      setCreatorInfoState({
        data: null,
        error: error instanceof Error ? error.message : 'Could not refresh TikTok creator settings.',
        isLoading: false,
      });
    }
  };

  const handleUpload = async () => {
    if (requiresReconnect) {
      setUploadState((currentState) => ({
        ...currentState,
        error: 'Reconnect TikTok to grant the `video.publish` scope before posting.',
      }));
      return;
    }

    if (!creatorInfo) {
      setUploadState((currentState) => ({
        ...currentState,
        error: 'TikTok creator settings are still loading. Refresh and try again.',
      }));
      return;
    }

    if (!selectedFile) {
      setUploadState((currentState) => ({
        ...currentState,
        error: 'Choose a video file first.',
      }));
      return;
    }

    if (!postForm.privacyLevel) {
      setUploadState((currentState) => ({
        ...currentState,
        error: 'Choose who can view this post before publishing.',
      }));
      return;
    }

    if (!creatorInfo.privacyLevelOptions.includes(postForm.privacyLevel)) {
      setUploadState((currentState) => ({
        ...currentState,
        error: 'Refresh the TikTok creator settings and choose a valid visibility option.',
      }));
      return;
    }

    if (isCaptionTooLong) {
      setUploadState((currentState) => ({
        ...currentState,
        error: 'TikTok captions must be 2200 characters or fewer.',
      }));
      return;
    }

    if (!postForm.hasAcceptedMusicUsage) {
      setUploadState((currentState) => ({
        ...currentState,
        error: "Confirm TikTok's Music Usage Confirmation before posting.",
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
        message: 'Cloudflare upload complete. Sending the direct post request to TikTok...',
        progress: 100,
        uploadedBytes: selectedFile.size,
      }));

      const uploadInit = await initializeTikTokDirectPost(session.accessToken, uploadedAsset.mediaUrl, {
        allowComment: creatorInfo.commentDisabled ? false : postForm.allowComment,
        allowDuet: creatorInfo.duetDisabled ? false : postForm.allowDuet,
        allowStitch: creatorInfo.stitchDisabled ? false : postForm.allowStitch,
        discloseBrandContent: postForm.discloseBrandContent,
        discloseBrandOrganic: postForm.discloseBrandOrganic,
        isAigc: postForm.isAigc,
        privacyLevel: postForm.privacyLevel,
        title: postForm.title,
      });

      setUploadState((currentState) => ({
        ...currentState,
        message: 'TikTok accepted the direct post request. Waiting for download, processing, and moderation...',
        publishId: uploadInit.publishId,
      }));

      const latestStatus = await pollTikTokPostStatus(session.accessToken, uploadInit.publishId, (status) => {
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
        error: error instanceof Error ? error.message : 'TikTok direct post failed.',
        isUploading: false,
        message: 'The TikTok direct post flow stopped before completion.',
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
        message: 'Refreshing TikTok post status...',
      }));

      const latestStatus = await fetchTikTokPostStatus(session.accessToken, uploadState.publishId);

      setUploadState((currentState) => ({
        ...currentState,
        message: buildStatusMessage(latestStatus),
        status: latestStatus,
      }));
    } catch (error) {
      setUploadState((currentState) => ({
        ...currentState,
        error: error instanceof Error ? error.message : 'Could not refresh TikTok post status.',
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
              <p className="text-sm text-slate-400">TikTok Direct Post</p>
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
                <p className="text-sm text-slate-400">
                  {shortenValue(creatorInfo?.creatorUsername || session.openId || session.profile?.openId || 'Connected')}
                </p>
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
              <span className="font-semibold">Direct Post Video</span>
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
          <div className="mx-auto max-w-5xl space-y-8">
            <header className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-200/80">Direct Post Workspace</p>
              <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">Publish Video</h1>
              <p className="max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
                Upload a video to secure storage, choose the TikTok visibility and interaction settings returned for this
                creator, and publish directly from Fancambo.
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
                      Supported examples: MP4, WEBM, MOV. TikTok direct posting supports files up to 4 GB when using this
                      pull-from-URL workflow.
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
                        disabled={!isReadyToPost || uploadState.isUploading}
                        className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900 disabled:text-slate-500"
                      >
                        {uploadState.isUploading ? 'Posting...' : 'Post to TikTok'}
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

                  <section className="rounded-3xl border border-slate-800 bg-slate-950/50 p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Creator Settings</p>
                        <h3 className="mt-2 text-lg font-bold text-white">Live controls from TikTok</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-400">
                          TikTok requires the latest visibility options and interaction permissions for direct post.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void refreshCreatorInfo()}
                        disabled={creatorInfoState.isLoading || requiresReconnect}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900 disabled:text-slate-500"
                      >
                        <RefreshCcw className={creatorInfoState.isLoading ? 'animate-spin' : ''} size={16} />
                        Refresh
                      </button>
                    </div>

                    {requiresReconnect && (
                      <div className="mt-5 rounded-3xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
                        This saved session does not include the <code className="font-bold text-amber-50">video.publish</code>{' '}
                        scope. Log out and connect TikTok again before posting directly.
                      </div>
                    )}

                    {!requiresReconnect && creatorInfoState.error && !creatorInfo && (
                      <div className="mt-5 rounded-3xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm leading-6 text-rose-100">
                        {creatorInfoState.error}
                      </div>
                    )}

                    {!requiresReconnect && creatorInfoState.isLoading && !creatorInfo && (
                      <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-300">
                        Loading the latest TikTok creator settings...
                      </div>
                    )}

                    {creatorInfo && (
                      <div className="mt-5 space-y-5">
                        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div>
                              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Connected Creator</p>
                              <p className="mt-2 text-lg font-bold text-white">{displayName}</p>
                              <p className="mt-1 text-sm text-slate-400">
                                @{creatorInfo.creatorUsername || 'unknown'}{' '}
                                {creatorInfo.maxVideoPostDurationSec
                                  ? `| Max video duration: ${formatDuration(creatorInfo.maxVideoPostDurationSec)}`
                                  : ''}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {creatorInfo.privacyLevelOptions.map((value) => (
                                <span
                                  key={value}
                                  className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-100"
                                >
                                  {formatTikTokPrivacyLevel(value)}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <label className="block">
                          <span className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Caption</span>
                          <textarea
                            value={postForm.title}
                            onChange={(event) =>
                              setPostForm((currentState) => ({
                                ...currentState,
                                title: event.target.value,
                              }))
                            }
                            rows={4}
                            className="mt-3 w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-sm leading-6 text-white outline-none transition-colors placeholder:text-slate-500 focus:border-sky-300/40"
                            placeholder="Write an optional TikTok caption with hashtags and mentions."
                          />
                          <div className="mt-2 flex items-center justify-between gap-4 text-xs text-slate-400">
                            <span>Optional. TikTok allows up to 2200 characters.</span>
                            <span className={isCaptionTooLong ? 'font-semibold text-rose-200' : ''}>{postForm.title.length}/2200</span>
                          </div>
                        </label>

                        <label className="block">
                          <span className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Visibility</span>
                          <select
                            value={postForm.privacyLevel}
                            onChange={(event) =>
                              setPostForm((currentState) => ({
                                ...currentState,
                                privacyLevel: event.target.value as TikTokPrivacyLevel | '',
                              }))
                            }
                            className="mt-3 w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-white outline-none transition-colors focus:border-sky-300/40"
                          >
                            <option value="" className="bg-slate-900 text-slate-300">
                              Select who can view this post
                            </option>
                            {creatorInfo.privacyLevelOptions.map((value) => (
                              <option key={value} value={value} className="bg-slate-900 text-white">
                                {formatTikTokPrivacyLevel(value)}
                              </option>
                            ))}
                          </select>
                          <p className="mt-2 text-xs leading-5 text-slate-400">
                            TikTok requires a manual selection based on the latest creator settings returned by the API.
                          </p>
                        </label>

                        <div>
                          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Interactions</p>
                          <div className="mt-3 grid gap-4 md:grid-cols-3">
                            <SettingToggle
                              checked={postForm.allowComment}
                              description={
                                creatorInfo.commentDisabled
                                  ? 'Locked off because this creator disabled comments in TikTok privacy settings.'
                                  : 'Allow comments on the published video.'
                              }
                              disabled={creatorInfo.commentDisabled}
                              label="Allow Comment"
                              onChange={(nextValue) =>
                                setPostForm((currentState) => ({
                                  ...currentState,
                                  allowComment: nextValue,
                                }))
                              }
                            />
                            <SettingToggle
                              checked={postForm.allowDuet}
                              description={
                                creatorInfo.duetDisabled
                                  ? 'Locked off because TikTok currently does not allow Duets for this creator.'
                                  : 'Allow other TikTok users to create Duets with this post.'
                              }
                              disabled={creatorInfo.duetDisabled}
                              label="Allow Duet"
                              onChange={(nextValue) =>
                                setPostForm((currentState) => ({
                                  ...currentState,
                                  allowDuet: nextValue,
                                }))
                              }
                            />
                            <SettingToggle
                              checked={postForm.allowStitch}
                              description={
                                creatorInfo.stitchDisabled
                                  ? 'Locked off because TikTok currently does not allow Stitches for this creator.'
                                  : 'Allow other TikTok users to create Stitches from this post.'
                              }
                              disabled={creatorInfo.stitchDisabled}
                              label="Allow Stitch"
                              onChange={(nextValue) =>
                                setPostForm((currentState) => ({
                                  ...currentState,
                                  allowStitch: nextValue,
                                }))
                              }
                            />
                          </div>
                        </div>

                        <div>
                          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Disclosures</p>
                          <div className="mt-3 grid gap-4 md:grid-cols-3">
                            <SettingToggle
                              checked={postForm.discloseBrandContent}
                              description="Mark this post as a paid partnership promoting a third-party business."
                              label="Branded Content"
                              onChange={(nextValue) =>
                                setPostForm((currentState) => ({
                                  ...currentState,
                                  discloseBrandContent: nextValue,
                                }))
                              }
                            />
                            <SettingToggle
                              checked={postForm.discloseBrandOrganic}
                              description="Mark this post as promoting the creator's own business."
                              label="Brand Organic"
                              onChange={(nextValue) =>
                                setPostForm((currentState) => ({
                                  ...currentState,
                                  discloseBrandOrganic: nextValue,
                                }))
                              }
                            />
                            <SettingToggle
                              checked={postForm.isAigc}
                              description="Label the post as AI-generated content when needed."
                              label="AI-Generated"
                              onChange={(nextValue) =>
                                setPostForm((currentState) => ({
                                  ...currentState,
                                  isAigc: nextValue,
                                }))
                              }
                            />
                          </div>
                        </div>

                        <label className="flex items-start gap-3 rounded-3xl border border-sky-300/20 bg-sky-300/10 p-4">
                          <input
                            type="checkbox"
                            checked={postForm.hasAcceptedMusicUsage}
                            onChange={(event) =>
                              setPostForm((currentState) => ({
                                ...currentState,
                                hasAcceptedMusicUsage: event.target.checked,
                              }))
                            }
                            className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-950 text-sky-300"
                          />
                          <span className="text-sm leading-6 text-sky-50">
                            By posting, you agree to TikTok&apos;s Music Usage Confirmation.{' '}
                            <a
                              href={MUSIC_USAGE_CONFIRMATION_URL}
                              target="_blank"
                              rel="noreferrer"
                              className="font-semibold text-sky-100 underline decoration-sky-200/60 underline-offset-4"
                            >
                              Review the policy
                            </a>
                            .
                          </span>
                        </label>

                        {creatorInfoState.error && (
                          <p className="rounded-3xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                            {creatorInfoState.error}
                          </p>
                        )}
                      </div>
                    )}
                  </section>

                  <div className="rounded-3xl border border-slate-800 bg-slate-950/50 p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Post Progress</p>
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
                      <span>Transferred: {formatBytes(uploadState.status?.downloaded_bytes || uploadState.uploadedBytes)}</span>
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
                            <p className="mt-1 text-xs text-slate-400">Live direct post signal</p>
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
                          key={`${uploadState.status?.status || 'idle'}-${uploadState.publishId || 'direct-post'}-${uploadState.progress}`}
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
                          Once the post starts, TikTok download, processing, and publish details will animate here in real time.
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
                    <li>1. Fancambo uploads the selected file to Cloudflare-backed storage in secure parts.</li>
                    <li>2. Fancambo sends TikTok the caption, visibility, interaction settings, disclosures, and verified media URL.</li>
                    <li>3. TikTok downloads the video, processes it, and runs any remaining moderation checks.</li>
                    <li>4. When TikTok finishes, the direct post is marked complete and becomes available on the connected account.</li>
                  </ul>
                  <a
                    href="https://developers.tiktok.com/doc/content-posting-api-reference-direct-post"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-sky-200 hover:text-sky-100"
                  >
                    TikTok direct post guide
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
                  You can always come back later and reconnect TikTok when you are ready to publish more content.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/60 p-4 text-sm leading-6 text-slate-300">
              This action clears local data stored for the current browser session, including the access token used for TikTok direct posting.
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

function SettingToggle({checked, description, disabled = false, label, onChange}: SettingToggleProps) {
  return (
    <label
      className={`block rounded-3xl border p-4 transition-colors ${
        disabled ? 'border-slate-800 bg-slate-950/50 text-slate-500' : 'border-white/10 bg-white/5 text-slate-100'
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-950 text-sky-300"
        />
        <div>
          <p className="text-sm font-semibold text-white">{label}</p>
          <p className={`mt-2 text-sm leading-6 ${disabled ? 'text-slate-500' : 'text-slate-400'}`}>{description}</p>
        </div>
      </div>
    </label>
  );
}

function buildStatusMessage(status: TikTokUploadStatus) {
  switch (status.status) {
    case 'PROCESSING_DOWNLOAD':
      return 'TikTok is downloading the video from Fancambo and preparing the direct post.';
    case 'PROCESSING_UPLOAD':
      return 'TikTok is receiving the uploaded video.';
    case 'PUBLISH_COMPLETE':
      return 'TikTok reports that the post has been published successfully.';
    case 'FAILED':
      return status.fail_reason || 'TikTok reported that the direct post failed.';
    default:
      return 'TikTok is processing the direct post.';
  }
}

function getStatusCardTheme(uploadState: UploadState): StatusCardTheme {
  const statusCode = uploadState.status?.status;

  if (statusCode === 'PUBLISH_COMPLETE') {
    return {
      Icon: CheckCircle2,
      badge: 'Published',
      badgeClassName: 'bg-emerald-400/15 text-emerald-200',
      description: 'TikTok finished processing the request and marked the direct post as published.',
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
      description: uploadState.status?.fail_reason || 'TikTok stopped processing this direct post. Review the settings and try again.',
      glowClassName: 'bg-[radial-gradient(circle_at_top_right,_rgba(251,113,133,0.18),_transparent_55%)]',
      iconClassName: 'text-rose-200',
      iconSurfaceClassName: 'bg-rose-400/15',
      isLive: false,
      progressClassName: 'from-rose-400 via-orange-300 to-amber-300',
      progressLabel: 'Needs review',
      title: 'TikTok reported a publishing issue',
      visualProgress: 100,
    };
  }

  if (uploadState.status) {
    const isDownloading = statusCode === 'PROCESSING_DOWNLOAD';

    return {
      Icon: Clock3,
      badge: 'Live',
      badgeClassName: 'bg-sky-400/15 text-sky-100',
      description: isDownloading
        ? 'TikTok is downloading the video from Fancambo’s verified URL before the post can be finalized.'
        : 'TikTok is processing the direct post and may still be completing moderation or internal publish steps.',
      glowClassName: 'bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.18),_transparent_55%)]',
      iconClassName: 'text-sky-200',
      iconSurfaceClassName: 'bg-sky-400/15',
      isLive: true,
      progressClassName: 'from-sky-400 via-cyan-300 to-violet-300',
      progressLabel: isDownloading ? 'Downloading from URL' : 'TikTok processing',
      title: isDownloading ? 'TikTok is downloading the media' : 'TikTok is processing the direct post',
      visualProgress: clampProgress(uploadState.status.progress ?? (isDownloading ? 78 : 90)),
    };
  }

  if (uploadState.isUploading || uploadState.publishId || uploadState.progress > 0) {
    return {
      Icon: Clock3,
      badge: 'Moving',
      badgeClassName: 'bg-sky-400/15 text-sky-100',
      description: 'Fancambo is moving the file into storage and preparing the direct publish request for the connected TikTok account.',
      glowClassName: 'bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.16),_transparent_55%)]',
      iconClassName: 'text-sky-200',
      iconSurfaceClassName: 'bg-sky-400/15',
      isLive: true,
      progressClassName: 'from-sky-400 via-cyan-300 to-blue-300',
      progressLabel: uploadState.progress >= 100 ? 'Publish request queued' : `${uploadState.progress}% uploaded`,
      title: 'Direct post pipeline is warming up',
      visualProgress: clampProgress(Math.max(uploadState.publishId ? 72 : 14, uploadState.progress)),
    };
  }

  return {
    Icon: Clock3,
    badge: 'Idle',
    badgeClassName: 'bg-white/10 text-slate-200',
    description: 'Choose a video, load the latest TikTok creator settings, and confirm the post details to begin.',
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
      label: 'Publish Request',
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
        statusCode === 'PUBLISH_COMPLETE'
          ? 'Published on TikTok'
          : statusCode === 'FAILED'
            ? 'Needs another try'
            : uploadState.status
              ? 'TikTok is processing'
              : 'Waiting for TikTok signal',
      label: 'Live Post',
      state:
        statusCode === 'FAILED'
          ? 'error'
          : statusCode === 'PUBLISH_COMPLETE'
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
      value: prettifyStatus(uploadState.status?.status || (uploadState.publishId ? 'PUBLISH_REQUESTED' : uploadState.isUploading ? 'UPLOADING' : 'WAITING')),
    },
    {
      label: 'Transferred Bytes',
      value: formatBytes(uploadState.status?.downloaded_bytes || uploadState.status?.uploaded_bytes || uploadState.uploadedBytes),
    },
  ];

  if (uploadState.publishId) {
    rows.push({
      label: 'Publish ID',
      value: uploadState.publishId,
    });
  }

  if (uploadState.status?.post_id) {
    rows.push({
      label: 'Post ID',
      value: String(uploadState.status.post_id),
    });
  }

  if (Array.isArray(uploadState.status?.publicaly_available_post_id) && uploadState.status.publicaly_available_post_id.length) {
    rows.push({
      label: 'Public Post IDs',
      value: uploadState.status.publicaly_available_post_id.map((value) => String(value)).join(', '),
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
    case 'PROCESSING_DOWNLOAD':
      return 'Processing Download';
    case 'PROCESSING_UPLOAD':
      return 'Processing Upload';
    case 'PUBLISH_COMPLETE':
      return 'Publish Complete';
    case 'PUBLISH_REQUESTED':
      return 'Publish Requested';
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

function formatTikTokPrivacyLevel(value: TikTokPrivacyLevel) {
  switch (value) {
    case 'PUBLIC_TO_EVERYONE':
      return 'Everyone';
    case 'MUTUAL_FOLLOW_FRIENDS':
      return 'Mutual Friends';
    case 'FOLLOWER_OF_CREATOR':
      return 'Followers';
    case 'SELF_ONLY':
      return 'Only Me';
    default:
      return value;
  }
}

function shortenValue(value: string) {
  if (value.length <= 18) {
    return value;
  }

  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const unitIndex = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const scaledValue = value / 1024 ** unitIndex;

  return `${scaledValue.toFixed(scaledValue >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDuration(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return 'Unknown';
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);

  if (minutes <= 0) {
    return `${seconds}s`;
  }

  if (seconds === 0) {
    return `${minutes}m`;
  }

  return `${minutes}m ${seconds}s`;
}

function clampProgress(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}
