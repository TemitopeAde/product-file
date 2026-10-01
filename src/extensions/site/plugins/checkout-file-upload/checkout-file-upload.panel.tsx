import type { FC } from 'react';
import { Box, SidePanel, Text, WixDesignSystemProvider } from '@wix/design-system';
import '@wix/design-system/styles.global.css';

// All configuration lives in the app dashboard; the editor panel explains where.
const Panel: FC = () => (
  <WixDesignSystemProvider>
    <SidePanel width="300" height="100vh">
      <SidePanel.Content noPadding stretchVertically>
        <SidePanel.Field>
          <Box direction="vertical" gap="12px">
            <Text size="small">
              At checkout, customers attach their files to each item that needs them. Items that require a file cannot be ordered until a file is attached. Configure products in the Product File Upload dashboard.
            </Text>
          </Box>
        </SidePanel.Field>
      </SidePanel.Content>
    </SidePanel>
  </WixDesignSystemProvider>
);

export default Panel;
