import axios from 'axios';

const MIN_CHUNK_SIZE = 5 * 1024 * 1024;
const MAX_CHUNK_SIZE = 64 * 1024 * 1024;
const MAX_FINAL_CHUNK_SIZE = 128 * 1024 * 1024;
const MAX_VIDEO_SIZE = 4 * 1024 * 1024 * 1024;

type TikTokApiError = {
  code?: string;
  log_id?: string;
  message?: string;
};

type TikTokUploadInitResponse = {
  data?: {
    publish_id?: string;
    upload_url?: string;
  };
  error?: TikTokApiError;
};

type TikTokUploadStatusResponse = {
  data?: TikTokUploadStatus;
  error?: TikTokApiError;
};

export type TikTokChunk = {
  contentRange: string;
  endExclusive: number;
  size: number;
  start: number;
};

export type TikTokChunkPlan = {
  chunkSize: number;
  chunks: TikTokChunk[];
  totalChunkCount: number;
  videoSize: number;
};

export type TikTokUploadStatus = {
  fail_reason?: string;
  post_id?: string;
  progress?: number;
  publish_id?: string;
  publicaly_available_post_id?: string;
  status?: string;
  uploaded_bytes?: number;
};

export function createChunkPlan(videoSize: number): TikTokChunkPlan {
  if (!Number.isFinite(videoSize) || videoSize <= 0) {
    throw new Error('Please choose a valid video file.');
  }

  if (videoSize > MAX_VIDEO_SIZE) {
    throw new Error('TikTok only accepts uploads up to 4 GB.');
  }

  const totalChunkCount = videoSize <= MAX_CHUNK_SIZE ? 1 : Math.ceil(videoSize / MAX_CHUNK_SIZE);
  const chunkSize = totalChunkCount === 1 ? videoSize : Math.floor(videoSize / totalChunkCount);

  if (chunkSize < MIN_CHUNK_SIZE && totalChunkCount > 1) {
    throw new Error('Video is too small for TikTok multi-part upload requirements.');
  }

  const chunks: TikTokChunk[] = [];

  for (let index = 0; index < totalChunkCount; index += 1) {
    const start = index * chunkSize;
    const endExclusive = index === totalChunkCount - 1 ? videoSize : start + chunkSize;
    const size = endExclusive - start;

    if (size < MIN_CHUNK_SIZE && totalChunkCount > 1) {
      throw new Error('Each TikTok upload chunk must be at least 5 MB.');
    }

    if (index === totalChunkCount - 1 && size > MAX_FINAL_CHUNK_SIZE) {
      throw new Error('Final TikTok upload chunk exceeds the 128 MB limit.');
    }

    chunks.push({
      contentRange: `bytes ${start}-${endExclusive - 1}/${videoSize}`,
      endExclusive,
      size,
      start,
    });
  }

  return {
    chunkSize,
    chunks,
    totalChunkCount,
    videoSize,
  };
}

export async function initializeTikTokUpload(accessToken: string, plan: TikTokChunkPlan) {
  const response = await axios.post<TikTokUploadInitResponse>(
    'https://open.tiktokapis.com/v2/post/publish/inbox/video/init/',
    {
      source_info: {
        chunk_size: plan.chunkSize,
        source: 'FILE_UPLOAD',
        total_chunk_count: plan.totalChunkCount,
        video_size: plan.videoSize,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
    },
  );

  const error = response.data.error;
  const uploadData = response.data.data;

  if (error?.code && error.code !== 'ok') {
    throw new Error(error.message || error.code);
  }

  if (!uploadData?.publish_id || !uploadData.upload_url) {
    throw new Error('TikTok did not return a publish ID or upload URL.');
  }

  return {
    publishId: uploadData.publish_id,
    uploadUrl: uploadData.upload_url,
  };
}

export async function uploadVideoChunks(
  uploadUrl: string,
  file: File,
  plan: TikTokChunkPlan,
  onProgress?: (progress: number, uploadedBytes: number) => void,
) {
  let confirmedUploadedBytes = 0;

  for (const chunk of plan.chunks) {
    const blob = file.slice(chunk.start, chunk.endExclusive);

    await axios.put(uploadUrl, blob, {
      headers: {
        'Content-Range': chunk.contentRange,
        'Content-Type': file.type || 'video/mp4',
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      onUploadProgress: (event) => {
        const loadedBytes = Math.min(chunk.size, event.loaded || 0);
        const totalUploadedBytes = confirmedUploadedBytes + loadedBytes;
        const progress = Math.min(100, Math.round((totalUploadedBytes / file.size) * 100));
        onProgress?.(progress, totalUploadedBytes);
      },
      validateStatus: (status) => status === 201 || status === 206,
    });

    confirmedUploadedBytes = chunk.endExclusive;
    const progress = Math.min(100, Math.round((confirmedUploadedBytes / file.size) * 100));
    onProgress?.(progress, confirmedUploadedBytes);
  }
}

export async function fetchTikTokUploadStatus(accessToken: string, publishId: string) {
  const response = await axios.post<TikTokUploadStatusResponse>(
    'https://open.tiktokapis.com/v2/post/publish/status/fetch/',
    {
      publish_id: publishId,
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
    },
  );

  const error = response.data.error;

  if (error?.code && error.code !== 'ok') {
    throw new Error(error.message || error.code);
  }

  return response.data.data || {};
}

export async function pollTikTokUploadStatus(
  accessToken: string,
  publishId: string,
  onStatus?: (status: TikTokUploadStatus) => void,
) {
  const terminalStatuses = new Set(['FAILED', 'PUBLISH_COMPLETE', 'SEND_TO_USER_INBOX']);
  let latestStatus: TikTokUploadStatus = {};

  for (let attempt = 0; attempt < 12; attempt += 1) {
    latestStatus = await fetchTikTokUploadStatus(accessToken, publishId);
    onStatus?.(latestStatus);

    if (latestStatus.status && terminalStatuses.has(latestStatus.status)) {
      break;
    }

    await delay(2500);
  }

  return latestStatus;
}

export async function fetchTikTokProfile(accessToken: string) {
  const response = await axios.get('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.data?.data?.user || null;
}

function delay(durationMs: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}
