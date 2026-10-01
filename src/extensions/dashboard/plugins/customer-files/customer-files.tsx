import { useCallback, useEffect, useState, type FC } from 'react';
import type { plugins } from '@wix/ecom/dashboard';
import { dashboard } from '@wix/dashboard';
import { Badge, Box, Card, Loader, SectionHelper, Text, TextButton, WixDesignSystemProvider } from '@wix/design-system';
import '@wix/design-system/styles.global.css';
import { formatBytes } from '../../../../shared/file-rules';
import type { OrderDetail, UploadRecord } from '../../../../shared/types';
import { LocaleProvider, translateError, useI18n } from '../../../../dashboard/i18n/runtime';
import { api } from '../../../../dashboard/lib/api';

type Props = plugins.OrderDetails.OrderRightPanelParams;

function CustomerFilesPanel({ orderId }: Props) {
  const { m } = useI18n();
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<unknown | null>(null);

  const load = useCallback(() => {
    setError(null);
    api<OrderDetail>(`/api/orders/${encodeURIComponent(orderId)}`)
      .then(setDetail)
      .catch((err: unknown) => setError(err));
  }, [orderId]);

  useEffect(load, [load]);

  const download = async (file: UploadRecord) => {
    try {
      const { url } = await api<{ url: string }>(`/api/uploads/${file.id}/download`, { method: 'POST' });
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      dashboard.showToast({ message: translateError(err), type: 'error' });
    }
  };

  const files = detail?.files ?? [];
  if (detail && files.length === 0) return null;

  return (
    <Card>
      <Card.Header title={m.plugin.title} subtitle={m.plugin.subtitle} />
      <Card.Divider />
      <Card.Content>
        {error ? (
          <Box direction="vertical" gap="SP2">
            <Text size="small" skin="error">{translateError(error)}</Text>
            <TextButton size="small" onClick={load}>{m.common.tryAgain}</TextButton>
          </Box>
        ) : !detail ? (
          <Box align="center" aria-busy="true" aria-label={m.plugin.loading}><Loader size="small" /></Box>
        ) : (
          <Box direction="vertical" gap="SP3">
            {detail.order && detail.order.unresolvedFiles > 0 ? (
              <SectionHelper skin="warning">{m.plugin.unresolved}</SectionHelper>
            ) : null}
            {files.map((file) => (
              <Box key={file.id} direction="vertical" gap="SP1">
                <Box verticalAlign="middle" gap="SP2">
                  <Text size="small" weight="bold" ellipsis maxWidth="200px">{file.fileName}</Text>
                  {file.status === 'READY' ? null : <Badge size="tiny" skin="neutralLight">{m.uploadStatus[file.status]}</Badge>}
                  {file.binding?.linkStatus === 'UNRESOLVED' ? <Badge size="tiny" skin="warningLight">{m.linkStatus.UNRESOLVED}</Badge> : null}
                </Box>
                <Text size="tiny" secondary>{file.productName ?? m.plugin.product} · {formatBytes(file.sizeBytes)}</Text>
                {file.status === 'READY' ? <TextButton size="small" onClick={() => void download(file)}>{m.plugin.download}</TextButton> : null}
              </Box>
            ))}
          </Box>
        )}
      </Card.Content>
    </Card>
  );
}

const CustomerFiles: FC<Props> = (props) => (
  <LocaleProvider>
    <WixDesignSystemProvider>
      <CustomerFilesPanel {...props} />
    </WixDesignSystemProvider>
  </LocaleProvider>
);

export default CustomerFiles;
