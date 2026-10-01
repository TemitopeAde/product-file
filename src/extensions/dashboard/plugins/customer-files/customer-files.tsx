import { useCallback, useEffect, useState, type FC } from 'react';
import type { plugins } from '@wix/ecom/dashboard';
import { dashboard } from '@wix/dashboard';
import { Badge, Box, Card, Loader, SectionHelper, Text, TextButton, WixDesignSystemProvider } from '@wix/design-system';
import '@wix/design-system/styles.global.css';
import { formatBytes } from '../../../../shared/file-rules';
import type { OrderDetail, UploadRecord } from '../../../../shared/types';
import { api, errorText } from '../../../../dashboard/lib/api';

type Props = plugins.OrderDetails.OrderRightPanelParams;

// Shows the customer files linked to this order on the Wix order page.
const CustomerFiles: FC<Props> = ({ orderId }) => {
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api<OrderDetail>(`/api/orders/${encodeURIComponent(orderId)}`)
      .then(setDetail)
      .catch((err: unknown) => setError(errorText(err)));
  }, [orderId]);

  useEffect(load, [load]);

  const download = async (file: UploadRecord) => {
    try {
      const { url } = await api<{ url: string }>(`/api/uploads/${file.id}/download`, { method: 'POST' });
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      dashboard.showToast({ message: errorText(err), type: 'error' });
    }
  };

  const files = detail?.files ?? [];
  if (detail && files.length === 0) return null;

  return (
    <WixDesignSystemProvider>
      <Card>
        <Card.Header title="Customer files" subtitle="Uploaded with Product File Upload" />
        <Card.Divider />
        <Card.Content>
          {error ? (
            <Box direction="vertical" gap="SP2">
              <Text size="small" skin="error">{error}</Text>
              <TextButton size="small" onClick={load}>Try again</TextButton>
            </Box>
          ) : !detail ? (
            <Box align="center"><Loader size="small" /></Box>
          ) : (
            <Box direction="vertical" gap="SP3">
              {detail.order && detail.order.unresolvedFiles > 0 ? (
                <SectionHelper skin="warning">Some files couldn’t be matched to an exact line item. Check which item they belong to before fulfilling.</SectionHelper>
              ) : null}
              {files.map((file) => (
                <Box key={file.id} direction="vertical" gap="SP1">
                  <Box verticalAlign="middle" gap="SP2">
                    <Text size="small" weight="bold" ellipsis maxWidth="200px">{file.fileName}</Text>
                    {file.status === 'READY' ? null : <Badge size="tiny" skin="neutralLight">{file.status.toLowerCase()}</Badge>}
                    {file.binding?.linkStatus === 'UNRESOLVED' ? <Badge size="tiny" skin="warningLight">needs review</Badge> : null}
                  </Box>
                  <Text size="tiny" secondary>{file.productName ?? 'Product'} · {formatBytes(file.sizeBytes)}</Text>
                  {file.status === 'READY' ? <TextButton size="small" onClick={() => void download(file)}>Download</TextButton> : null}
                </Box>
              ))}
            </Box>
          )}
        </Card.Content>
      </Card>
    </WixDesignSystemProvider>
  );
};

export default CustomerFiles;
