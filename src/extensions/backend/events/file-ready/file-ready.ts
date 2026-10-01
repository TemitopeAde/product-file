import { files } from '@wix/media';
import { getUploadByLabel } from '../../../../server/data/uploads';
import { finalizeWithFile } from '../../../../server/services/finalize';

// Completes uploads whose browser went away before calling the completion endpoint. The
// reservation label is the only link between a resumable upload and the finished file.
export default files.onFileDescriptorFileReady(async (event) => {
  const instanceId = event.metadata.instanceId;
  const file = event.data.file;
  const label = file?.labels?.find((l) => l.startsWith('pfu-'));
  if (!instanceId || !file?._id || !label) return;
  try {
    const upload = await getUploadByLabel(label);
    if (!upload || upload.status === 'READY') return;
    const size = file.sizeInBytes ? Number(file.sizeInBytes) : null;
    await finalizeWithFile(instanceId, upload, {
      id: file._id,
      isPrivate: file.private === true,
      labels: file.labels ?? [],
      status: file.operationStatus === 'FAILED' ? 'FAILED' : file.operationStatus === 'PENDING' ? 'PENDING' : 'READY',
      deleted: file.state === 'DELETED',
      sizeBytes: size !== null && Number.isFinite(size) ? size : null,
      mediaType: file.mediaType ?? 'UNKNOWN',
    });
  } catch (error) {
    console.error('Failed to finalize upload from File Ready event', { fileId: file._id, error });
    throw error;
  }
});
