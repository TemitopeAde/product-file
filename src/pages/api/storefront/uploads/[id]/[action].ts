import { requireStorefrontCaller } from '../../../../../server/auth';
import { ApiError } from '../../../../../server/errors';
import { handle, json, noContent, optionalString, readJson, requireParam, requireString, requireUuid } from '../../../../../server/http';
import {
  cancelUpload,
  completeUpload,
  failUpload,
  renewUpload,
  resumeUpload,
} from '../../../../../server/services/storefront-uploads';

export const POST = handle(async (context) => {
  const caller = await requireStorefrontCaller();
  const id = requireUuid(requireParam(context, 'id'), 'Upload');
  switch (context.params['action']) {
    case 'resume':
      return json(await resumeUpload(caller, id));
    case 'renew':
      return json(await renewUpload(caller, id));
    case 'complete': {
      const body = await readJson(context.request);
      return json(await completeUpload(caller, id, requireString(body, 'fileId', 300)));
    }
    case 'cancel':
      await cancelUpload(caller, id);
      return noContent();
    case 'fail': {
      const body = await readJson(context.request);
      await failUpload(caller, id, optionalString(body, 'reason', 500) ?? 'UPLOAD_FAILED');
      return noContent();
    }
    default:
      throw new ApiError('NOT_FOUND', 'Unknown action.');
  }
});
