import { auth } from '@wix/essentials';
import { files } from '@wix/media';
import { DOWNLOAD_URL_TTL_MINUTES, MEDIA_FOLDER_PATH } from '../config';
import { ApiError } from '../errors';

export interface ResumableSession {
  uploadUrl: string;
  uploadToken: string;
}

/** Private file, labelled with the reservation so the finished file can be proven to belong to it. */
export async function createResumableUpload(mimeType: string, fileName: string, reservationLabel: string): Promise<ResumableSession> {
  try {
    const response = await auth.elevate(files.generateFileResumableUploadUrl)(mimeType, {
      fileName,
      private: true,
      labels: [reservationLabel],
      uploadProtocol: 'TUS',
      filePath: MEDIA_FOLDER_PATH,
    });
    if (!response.uploadUrl || !response.uploadToken) throw new Error('Incomplete resumable upload response');
    return { uploadUrl: response.uploadUrl, uploadToken: response.uploadToken };
  } catch (error) {
    console.error('generateFileResumableUploadUrl failed', error);
    throw new ApiError('SERVICE_UNAVAILABLE', 'Wix Media could not start this upload. Please try again.');
  }
}

export interface MediaFile {
  id: string;
  isPrivate: boolean;
  labels: string[];
  status: 'READY' | 'PENDING' | 'FAILED';
  deleted: boolean;
  sizeBytes: number | null;
  mediaType: string;
}

export async function getMediaFile(fileId: string): Promise<MediaFile | null> {
  try {
    const file = await auth.elevate(files.getFileDescriptor)(fileId);
    const size = file.sizeInBytes ? Number(file.sizeInBytes) : null;
    return {
      id: file._id ?? fileId,
      isPrivate: file.private === true,
      labels: file.labels ?? [],
      status: file.operationStatus === 'READY' ? 'READY' : file.operationStatus === 'FAILED' ? 'FAILED' : 'PENDING',
      deleted: file.state === 'DELETED',
      sizeBytes: size !== null && Number.isFinite(size) ? size : null,
      mediaType: file.mediaType ?? 'UNKNOWN',
    };
  } catch (error) {
    console.error('getFileDescriptor failed', { fileId, error });
    return null;
  }
}

export async function createDownloadUrl(fileId: string, downloadFileName: string): Promise<string> {
  try {
    const response = await auth.elevate(files.generateFileDownloadUrl)(fileId, {
      downloadFileName,
      expirationInMinutes: DOWNLOAD_URL_TTL_MINUTES,
    });
    const url = response.downloadUrls?.[0]?.url;
    if (!url) throw new Error('No download URL returned');
    return url;
  } catch (error) {
    console.error('generateFileDownloadUrl failed', { fileId, error });
    throw new ApiError('SERVICE_UNAVAILABLE', 'Wix Media could not create a download link. Please try again.');
  }
}

/** Moves files to the Media Manager trash, where the site owner can still restore them. */
export async function trashFiles(fileIds: string[]): Promise<void> {
  if (fileIds.length === 0) return;
  try {
    await auth.elevate(files.bulkDeleteFiles)(fileIds, { permanent: false });
  } catch (error) {
    console.error('bulkDeleteFiles failed', { fileIds, error });
    throw new ApiError('SERVICE_UNAVAILABLE', 'Wix Media could not delete the file. Please try again.');
  }
}
