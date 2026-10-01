import { inputs, widget } from '@wix/editor';
import { Box, Button, FillPreview, FormField, Input, NumberInput, SidePanel, Text, WixDesignSystemProvider } from '@wix/design-system';
import { type FC, useEffect, useRef, useState } from 'react';
import '@wix/design-system/styles.global.css';
import { DEFAULT_DESIGN, DESIGN_PROPS, type DesignProp, type ProductFileDesign, selectedFonts } from './product-file-upload.design';
import { DEFAULT_FONT } from '../../../../site/dom';

const COLOR_FALLBACKS: Partial<Record<DesignProp, string>> = {
  'title-color': '#000000',
  'body-color': '#333333',
  'accent-color': '#116dff',
  'accent-text-color': '#ffffff',
  'surface-color': '#ffffff',
  'dropzone-color': '#ffffff',
  'border-color': '#999999',
  'error-color': '#d6453d',
};

const PROP_CONFIRM_ATTEMPTS = 20;
const PROP_CONFIRM_DELAY_MS = 50;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

async function setPropConfirmed(prop: DesignProp, value: string): Promise<void> {
  await widget.setProp(prop, value);
  for (let attempt = 0; attempt < PROP_CONFIRM_ATTEMPTS; attempt += 1) {
    const stored = await widget.getProp(prop);
    if (stored === value) return;
    if (attempt < PROP_CONFIRM_ATTEMPTS - 1) await wait(PROP_CONFIRM_DELAY_MS);
  }
  throw new Error(`Wix did not save the ${prop} design setting.`);
}

interface ColorFieldProps {
  label: string;
  prop: DesignProp;
  design: ProductFileDesign;
  onChange: (patch: Partial<ProductFileDesign>) => void;
}

function ColorField({ label, prop, design, onChange }: ColorFieldProps) {
  const value = design[prop] || COLOR_FALLBACKS[prop] || '#ffffff';
  return (
    <SidePanel.Field>
      <FormField label={label} labelPlacement="left" labelWidth="1fr">
        <Box width="30px" height="30px">
          <FillPreview
            fill={value}
            aspectRatio={1}
            onClick={() => {
              void inputs.selectColor(value, {
                onChange: (next) => {
                  if (next) onChange({ [prop]: next });
                },
              });
            }}
          />
        </Box>
      </FormField>
    </SidePanel.Field>
  );
}

interface FontFieldProps {
  label: string;
  fontProp: 'title-font' | 'body-font';
  decorationProp: 'title-decoration' | 'body-decoration';
  fallback: string;
  design: ProductFileDesign;
  onChange: (patch: Partial<ProductFileDesign>) => void;
}

function FontField({ label, fontProp, decorationProp, fallback, design, onChange }: FontFieldProps) {
  return (
    <SidePanel.Field>
      <FormField label={label}>
        <Button
          size="small"
          priority="secondary"
          fullWidth
          onClick={() => {
            void inputs.selectFont(
              { font: design[fontProp] || fallback, textDecoration: design[decorationProp] },
              {
                onChange: (next) => onChange({
                  [fontProp]: next.font,
                  [decorationProp]: next.textDecoration ?? '',
                }),
              },
            );
          }}
        >
          Choose font
        </Button>
      </FormField>
    </SidePanel.Field>
  );
}

interface NumberFieldProps {
  label: string;
  prop: 'border-width' | 'corner-radius' | 'container-padding';
  min: number;
  max: number;
  design: ProductFileDesign;
  onChange: (patch: Partial<ProductFileDesign>) => void;
}

function NumberField({ label, prop, min, max, design, onChange }: NumberFieldProps) {
  return (
    <SidePanel.Field>
      <FormField label={label}>
        <NumberInput
          size="small"
          min={min}
          max={max}
          value={Number(design[prop])}
          suffix={<Input.Affix>px</Input.Affix>}
          onChange={(next) => {
            if (next !== null) onChange({ [prop]: String(next) });
          }}
        />
      </FormField>
    </SidePanel.Field>
  );
}

const Panel: FC = () => {
  const [design, setDesign] = useState<ProductFileDesign>(DEFAULT_DESIGN);
  const [error, setError] = useState<string | null>(null);
  const designRef = useRef(design);
  const writeQueue = useRef(Promise.resolve());

  useEffect(() => {
    let active = true;
    void Promise.all(DESIGN_PROPS.map(async (prop) => [prop, (await widget.getProp(prop)) || DEFAULT_DESIGN[prop]] as const))
      .then(async (entries) => {
        if (!active) return;
        const loaded = Object.fromEntries(entries) as ProductFileDesign;
        designRef.current = loaded;
        setDesign(loaded);
        await widget.setPreloadFonts(selectedFonts(loaded));
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load the design settings.');
      });
    return () => {
      active = false;
    };
  }, []);

  const update = (patch: Partial<ProductFileDesign>) => {
    const next = { ...designRef.current, ...patch };
    designRef.current = next;
    setDesign(next);
    setError(null);
    writeQueue.current = writeQueue.current
      .then(async () => {
        for (const prop of DESIGN_PROPS) {
          if (patch[prop] !== undefined) await setPropConfirmed(prop, next[prop]);
        }
        if (patch['title-font'] !== undefined || patch['body-font'] !== undefined) {
          await widget.setPreloadFonts(selectedFonts(next));
        }
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : 'Could not save the design setting.');
      });
  };

  return (
    <WixDesignSystemProvider>
      <SidePanel width="300px" height="100vh">
        <SidePanel.Header title="Uploader design" />
        <SidePanel.Content noPadding stretchVertically>
          <SidePanel.Field>
            <Text size="small" secondary>Changes apply to this Product Page plugin and update immediately in the editor.</Text>
          </SidePanel.Field>

          <SidePanel.Section title="Typography">
            <FontField label="Title font" fontProp="title-font" decorationProp="title-decoration" fallback={DEFAULT_FONT} design={design} onChange={update} />
            <ColorField label="Title color" prop="title-color" design={design} onChange={update} />
            <FontField label="Body font" fontProp="body-font" decorationProp="body-decoration" fallback={DEFAULT_FONT} design={design} onChange={update} />
            <ColorField label="Body color" prop="body-color" design={design} onChange={update} />
            <ColorField label="Error color" prop="error-color" design={design} onChange={update} />
          </SidePanel.Section>

          <SidePanel.Section title="Colors">
            <ColorField label="Background" prop="surface-color" design={design} onChange={update} />
            <ColorField label="Drop zone" prop="dropzone-color" design={design} onChange={update} />
            <ColorField label="Accent" prop="accent-color" design={design} onChange={update} />
            <ColorField label="Accent text" prop="accent-text-color" design={design} onChange={update} />
            <ColorField label="Border" prop="border-color" design={design} onChange={update} />
          </SidePanel.Section>

          <SidePanel.Section title="Border and spacing">
            <NumberField label="Border width" prop="border-width" min={0} max={12} design={design} onChange={update} />
            <NumberField label="Corner radius" prop="corner-radius" min={0} max={100} design={design} onChange={update} />
            <NumberField label="Container padding" prop="container-padding" min={0} max={80} design={design} onChange={update} />
          </SidePanel.Section>

          {error ? <SidePanel.Field><Text size="small" skin="error">{error}</Text></SidePanel.Field> : null}
          <SidePanel.Field>
            <Button priority="secondary" size="small" fullWidth onClick={() => update(DEFAULT_DESIGN)}>Reset to defaults</Button>
          </SidePanel.Field>
        </SidePanel.Content>
      </SidePanel>
    </WixDesignSystemProvider>
  );
};

export default Panel;
