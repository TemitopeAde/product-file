// Moves a reservation to READY only after Wix Media reports the file ready and the file is
// proven to belong to this reservation. Used by the browser completion call, status polling,
// and the Media File Ready event.
import { compatibleMediaTypes } from '../../shared/file-rules';
import * as uploads from '../data/uploads';
import { ApiError } from '../errors';
import { getMediaFile, trashFiles, type MediaFile } from '../wix/media';
import { commitQuota, endUpload } from './upload-lifecycle';

async function reject(upload: uploads.UploadRow, fileId: string, reason: string): Promise<uploads.UploadRow> {
  await endUpload(upload, 'FAILED', reason);
  await trashFiles([fileId]).catch((error: unknown) => console.error('Could not trash rejected file', { fileId, error }));
  return (await uploads.getUpload(upload.id, true)) ?? upload;
}

export async function finalizeWithFile(instanceId: string, upload: uploads.UploadRow, file: MediaFile): Promise<uploads.UploadRow> {
  if (!file.labels.includes(upload.reservationLabel)) {
    throw new ApiError('CONFLICT', 'This file does not belong to this upload.');
  }
  if (!(await uploads.claimFile(upload.id, file.id))) {
    return (await uploads.getUpload(upload.id, true)) ?? upload;
  }
  if (!file.isPrivate) return reject(upload, file.id, 'FILE_NOT_PRIVATE');
  if (file.deleted) {
    await endUpload(upload, 'FAILED', 'FILE_DELETED');
  } else if (file.status === 'FAILED') {
    await endUpload(upload, 'FAILED', 'MEDIA_PROCESSING_FAILED');
  } else if (file.status === 'PENDING') {
    await uploads.markProcessing(upload.id);
  } else {
    const size = file.sizeBytes ?? upload.sizeBytes;
    if (size > upload.maxFileSizeBytes) return reject(upload, file.id, 'FILE_TOO_LARGE');
    if (!compatibleMediaTypes(upload.mimeType).includes(file.mediaType)) return reject(upload, file.id, 'FILE_TYPE_MISMATCH');
    if (!(await commitQuota(instanceId, upload))) return reject(upload, file.id, 'MONTHLY_UPLOAD_LIMIT_REACHED');
    await uploads.markReady(upload.id, size, file.mediaType);
  }
  return (await uploads.getUpload(upload.id, true)) ?? upload;
}

export async function finalizeUpload(instanceId: string, upload: uploads.UploadRow, fileId: string): Promise<uploads.UploadRow> {
  const file = await getMediaFile(fileId);
  if (!file) {
    // Wix may not expose the descriptor immediately after the upload finishes.
    await uploads.markProcessing(upload.id);
    return (await uploads.getUpload(upload.id, true)) ?? upload;
  }
  return finalizeWithFile(instanceId, upload, file);
}
