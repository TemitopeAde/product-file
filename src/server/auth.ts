// Caller identity comes only from the Wix access token attached by
// `httpClient.fetchWithAuth()`. Browser-supplied instance IDs or emails are never trusted.
import { auth } from '@wix/essentials';
import { ApiError } from './errors';

export type SubjectType = 'USER' | 'MEMBER' | 'VISITOR';

export interface Caller {
  instanceId: string;
  subjectType: SubjectType;
  subjectId: string;
}

async function readCaller(): Promise<Caller> {
  const info = await auth.getTokenInfo().catch((error: unknown) => {
    console.error('Token validation failed', error);
    throw new ApiError('UNAUTHENTICATED', 'A valid Wix access token is required.');
  });
  if (!info.active || !info.instanceId || !info.subjectId) {
    throw new ApiError('UNAUTHENTICATED', 'A valid Wix access token is required.');
  }
  const subjectType = info.subjectType;
  if (subjectType !== 'USER' && subjectType !== 'MEMBER' && subjectType !== 'VISITOR') {
    throw new ApiError('FORBIDDEN', 'This caller type is not allowed.');
  }
  return { instanceId: info.instanceId, subjectType, subjectId: info.subjectId };
}

/** Wix users (site owner and collaborators) acting from the app's dashboard extensions. */
export async function requireDashboardCaller(): Promise<Caller> {
  const caller = await readCaller();
  if (caller.subjectType !== 'USER') {
    throw new ApiError('FORBIDDEN', 'This endpoint is only available from the Wix dashboard.');
  }
  return caller;
}

/** Site visitors and members acting from site plugins (Wix users previewing the site are allowed). */
export async function requireStorefrontCaller(): Promise<Caller> {
  return readCaller();
}
