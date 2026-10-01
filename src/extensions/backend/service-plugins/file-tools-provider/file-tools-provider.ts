import { toolsProvider } from '@wix/app-tools/service-plugins';
import { formatBytes } from '../../../../shared/file-rules';
import type { UploadStatus } from '../../../../shared/types';
import { findOrderFiles } from '../../../../server/services/tools';
import { getBillingSummary } from '../../../../server/services/access';
import { listEnabledRules } from '../../../../server/data/rules';
import { listUploads, toPublicUpload } from '../../../../server/data/uploads';

const TOOL_STATUSES: readonly UploadStatus[] = ['READY', 'PROCESSING', 'FAILED'];

// Read-only tools for the Wix AI assistant, available to site collaborators only.
toolsProvider.provideHandlers({
  runTool: async ({ request, metadata }) => {
    const instanceId = metadata.instanceId;
    if (!instanceId || !metadata.identity?.wixUserId) throw new Error('These tools are only available to site collaborators.');
    const payload = request.payload ?? {};

    switch (request.methodName) {
      case 'get-upload-usage': {
        const billing = await getBillingSummary(instanceId);
        return {
          response: {
            tier: billing.tier,
            used: billing.usage.used,
            limit: billing.usage.limit,
            remaining: billing.usage.remaining,
            periodEnd: billing.usage.periodEnd,
          },
        };
      }
      case 'list-recent-uploads': {
        const rawStatus = payload['status'];
        const status = TOOL_STATUSES.find((s) => s === rawStatus) ?? null;
        const rawLimit = payload['limit'];
        const limit = typeof rawLimit === 'number' && Number.isInteger(rawLimit) ? Math.min(Math.max(rawLimit, 1), 20) : 10;
        const { rows } = await listUploads({ status, productId: null, search: null, offset: 0, limit });
        return {
          response: {
            uploads: rows.slice(0, limit).map(toPublicUpload).map((u) => ({
              fileName: u.fileName,
              product: u.productName ?? u.productId,
              status: u.status,
              size: formatBytes(u.sizeBytes),
              uploadedAt: u.createdAt,
              orderNumber: u.binding?.orderNumber ?? null,
            })),
          },
        };
      }
      case 'get-order-files': {
        const orderNumber = payload['orderNumber'];
        if (typeof orderNumber !== 'string' || orderNumber.trim().length === 0 || orderNumber.length > 50) {
          throw new Error('orderNumber is required.');
        }
        return { response: await findOrderFiles(orderNumber.trim().replace(/^#/, '')) };
      }
      case 'list-upload-products': {
        const rules = await listEnabledRules();
        return {
          response: {
            products: rules.map((r) => ({
              product: r.productName || r.productId,
              required: r.requirement === 'REQUIRED',
              acceptedTypes: r.acceptedTypes,
              maxFileSize: formatBytes(r.maxFileSizeBytes),
              maxFiles: r.maxFiles,
            })),
          },
        };
      }
      default:
        throw new Error(`Unknown tool: ${request.methodName ?? ''}`);
    }
  },
});
