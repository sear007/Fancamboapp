import axios from 'axios';

import {getWorkerApiUrl} from './cloudflareWorker';

const MIN_CHUNK_SIZE = 5 * 1024 * 1024;
const TARGET_CHUNK_SIZE = 8 * 1024 * 1024;
const MAX_VIDEO_SIZE = 4 * 1024 * 1024 * 1024;

type MultipartStartResponse = {
  objectKey: string;
  uploadId: string;
};

type MultipartPartResponse = {
  etag: string;
  partNumber: number;
};

type MultipartCompleteResponse = {
  mediaUrl: string;
  objectKey: string;
};

type WorkerTikTokCreatorInfoResponse = {
  commentDisabled: boolean;
  creatorAvatarUrl: string | null;
  creatorNickname: string | null;
  creatorUsername: string | null;
  duetDisabled: boolean;
  maxVideoPostDurationSec: number | null;
  privacyLevelOptions: TikTokPrivacyLevel[];
  stitchDisabled: boolean;
};

type WorkerTikTokInitResponse = {
  publishId: string | null;
};

export type TikTokPrivacyLevel =
  | 'FOLLOWER_OF_CREATOR'
  | 'MUTUAL_FOLLOW_FRIENDS'
  | 'PUBLIC_TO_EVERYONE'
  | 'SELF_ONLY';

export type TikTokCreatorInfo = {
  commentDisabled: boolean;
  creatorAvatarUrl: string | null;
  creatorNickname: string | null;
  creatorUsername: string | null;
  duetDisabled: boolean;
  maxVideoPostDurationSec: number | null;
  privacyLevelOptions: TikTokPrivacyLevel[];
  stitchDisabled: boolean;
};

export type TikTokPostSettings = {
  allowComment: boolean;
  allowDuet: boolean;
  allowStitch: boolean;
  discloseBrandContent: boolean;
  discloseBrandOrganic: boolean;
  isAigc: boolean;
  privacyLevel: TikTokPrivacyLevel;
  title: string;
};

export type TikTokChunk = {
  endExclusive: number;
  partNumber: number;
  size: number;
  start: number;
};

export type TikTokChunkPlan = {
  chunks: TikTokChunk[];
  totalChunkCount: number;
  videoSize: number;
};

export type TikTokUploadStatus = {
  downloaded_bytes?: number;
  fail_reason?: string;
  post_id?: string;
  progress?: number;
  publish_id?: string;
  publicaly_available_post_id?: Array<number | string>;
  status?: string;
  uploaded_bytes?: number;
};

type UploadedStorageAsset = {
  mediaUrl: string;
  objectKey: string;
};

export function createChunkPlan(videoSize: number): TikTokChunkPlan {
  if (!Number.isFinite(videoSize) || videoSize <= 0) {
    throw new Error('Please choose a valid video file.');
  }

  if (videoSize > MAX_VIDEO_SIZE) {
    throw new Error('TikTok only accepts uploads up to 4 GB.');
  }

  const chunks: TikTokChunk[] = [];
  let start = 0;
  let partNumber = 1;

  while (start < videoSize) {
    const endExclusive = Math.min(start + TARGET_CHUNK_SIZE, videoSize);
    const size = endExclusive - start;
    const isFinalChunk = endExclusive >= videoSize;

    if (!isFinalChunk && size < MIN_CHUNK_SIZE) {
      throw new Error('Each non-final upload chunk must be at least 5 MB.');
    }

    chunks.push({
      endExclusive,
      partNumber,
      size,
      start,
    });

    start = endExclusive;
    partNumber += 1;
  }

  return {
    chunks,
    totalChunkCount: chunks.length,
    videoSize,
  };
}

export async function uploadVideoToStorage(
  file: File,
  plan: TikTokChunkPlan,
  onProgress?: (progress: number, uploadedBytes: number) => void,
) {
  try {
    const {objectKey, uploadId} = await startMultipartUpload(file);
    const parts: Array<{etag: string; partNumber: number}> = [];
    let confirmedUploadedBytes = 0;

    for (const chunk of plan.chunks) {
      const blob = file.slice(chunk.start, chunk.endExclusive);
      const response = await axios.put<MultipartPartResponse>(
        buildMultipartPartUrl(objectKey, uploadId, chunk.partNumber),
        blob,
        {
          headers: {
            'Content-Type': 'application/octet-stream',
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
          onUploadProgress: (event) => {
            const loadedBytes = Math.min(chunk.size, event.loaded || 0);
            const totalUploadedBytes = confirmedUploadedBytes + loadedBytes;
            const progress = Math.min(100, Math.round((totalUploadedBytes / file.size) * 100));
            onProgress?.(progress, totalUploadedBytes);
          },
        },
      );

      parts.push({
        etag: response.data.etag,
        partNumber: response.data.partNumber,
      });

      confirmedUploadedBytes = chunk.endExclusive;
      const progress = Math.min(100, Math.round((confirmedUploadedBytes / file.size) * 100));
      onProgress?.(progress, confirmedUploadedBytes);
    }

    const completionResponse = await axios.post<MultipartCompleteResponse>(getWorkerApiUrl('/api/r2/multipart/complete'), {
      objectKey,
      parts,
      uploadId,
    });

    return completionResponse.data as UploadedStorageAsset;
  } catch (error) {
    throw new Error(resolveAxiosMessage(error, 'Cloudflare upload failed.'));
  }
}

export async function fetchTikTokCreatorInfo(accessToken: string) {
  try {
    const response = await axios.post<WorkerTikTokCreatorInfoResponse>(getWorkerApiUrl('/api/tiktok/post/creator-info'), {
      accessToken,
    });

    return response.data;
  } catch (error) {
    throw new Error(resolveAxiosMessage(error, 'Could not load TikTok creator settings.'));
  }
}

export async function initializeTikTokDirectPost(
  accessToken: string,
  videoUrl: string,
  settings: TikTokPostSettings,
) {
  try {
    const response = await axios.post<WorkerTikTokInitResponse>(getWorkerApiUrl('/api/tiktok/post/init'), {
      accessToken,
      allowComment: settings.allowComment,
      allowDuet: settings.allowDuet,
      allowStitch: settings.allowStitch,
      discloseBrandContent: settings.discloseBrandContent,
      discloseBrandOrganic: settings.discloseBrandOrganic,
      isAigc: settings.isAigc,
      privacyLevel: settings.privacyLevel,
      title: settings.title,
      videoUrl,
    });

    if (!response.data.publishId) {
      throw new Error('TikTok did not return a publish ID for the direct post request.');
    }

    return {
      publishId: response.data.publishId,
    };
  } catch (error) {
    throw new Error(resolveAxiosMessage(error, 'TikTok direct post request failed.'));
  }
}

export async function fetchTikTokPostStatus(accessToken: string, publishId: string) {
  try {
    const response = await axios.post<TikTokUploadStatus>(getWorkerApiUrl('/api/tiktok/post/status'), {
      accessToken,
      publishId,
    });

    return response.data || {};
  } catch (error) {
    throw new Error(resolveAxiosMessage(error, 'Could not load TikTok post status.'));
  }
}

export async function pollTikTokPostStatus(
  accessToken: string,
  publishId: string,
  onStatus?: (status: TikTokUploadStatus) => void,
) {
  const terminalStatuses = new Set(['FAILED', 'PUBLISH_COMPLETE']);
  let latestStatus: TikTokUploadStatus = {};

  for (let attempt = 0; attempt < 12; attempt += 1) {
    latestStatus = await fetchTikTokPostStatus(accessToken, publishId);
    onStatus?.(latestStatus);

    if (latestStatus.status && terminalStatuses.has(latestStatus.status)) {
      break;
    }

    await delay(2500);
  }

  return latestStatus;
}

async function startMultipartUpload(file: File) {
  try {
    const response = await axios.post<MultipartStartResponse>(getWorkerApiUrl('/api/r2/multipart/start'), {
      contentType: file.type || 'application/octet-stream',
      fileName: file.name,
    });

    if (!response.data.objectKey || !response.data.uploadId) {
      throw new Error('Could not create a Cloudflare R2 upload session.');
    }

    return response.data;
  } catch (error) {
    throw new Error(resolveAxiosMessage(error, 'Could not create a Cloudflare upload session.'));
  }
}

function buildMultipartPartUrl(objectKey: string, uploadId: string, partNumber: number) {
  const url = new URL(getWorkerApiUrl('/api/r2/multipart/part'));
  url.searchParams.set('objectKey', objectKey);
  url.searchParams.set('uploadId', uploadId);
  url.searchParams.set('partNumber', String(partNumber));
  return url.toString();
}

function delay(durationMs: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}

function resolveAxiosMessage(error: unknown, fallbackMessage: string) {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data;

    if (responseData && typeof responseData === 'object') {
      if (typeof responseData.message === 'string' && responseData.message.trim()) {
        return responseData.message;
      }

      if (typeof responseData.error === 'string' && responseData.error.trim()) {
        return responseData.error;
      }
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallbackMessage;
}
