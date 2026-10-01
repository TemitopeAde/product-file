import { X } from 'lucide-react';
import { formatBytes } from '../../shared/file-rules';
import { FORMAT_GROUPS, groupExtensions, type FormatGroup } from '../../shared/wix-media-formats';
import { useI18n } from '../i18n/runtime';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const ALL = 'all';

interface AcceptedTypesFieldProps {
  id: string;
  types: string[];
  onChange: (types: string[]) => void;
  /** The merchant's size limit, used to point out formats Wix caps lower. */
  maxFileSizeBytes?: number;
}

function hasGroup(types: readonly string[], group: FormatGroup): boolean {
  return groupExtensions(group).every((ext) => types.includes(ext));
}

export function AcceptedTypesField({ id, types, onChange, maxFileSizeBytes }: AcceptedTypesFieldProps) {
  const { m, fill } = useI18n();
  const fullGroups = FORMAT_GROUPS.filter((group) => hasGroup(types, group));
  const grouped = new Set(fullGroups.flatMap(groupExtensions));
  const loose = types.filter((type) => !grouped.has(type));
  const allSelected = fullGroups.length === FORMAT_GROUPS.length;

  const addGroup = (value: string) => {
    const groups = value === ALL ? FORMAT_GROUPS : FORMAT_GROUPS.filter((group) => group.id === value);
    onChange([...new Set([...types, ...groups.flatMap(groupExtensions)])]);
  };

  const cappedByWix =
    maxFileSizeBytes === undefined ? [] : FORMAT_GROUPS.filter((group) => group.maxBytes < maxFileSizeBytes && groupExtensions(group).some((ext) => types.includes(ext)));

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{m.types.label}</Label>
      <Select key={types.join('\u0000')} onValueChange={addGroup}>
        <SelectTrigger id={id} aria-label={m.types.addLabel}>
          <SelectValue placeholder={m.types.placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-80">
          <SelectItem value={ALL} disabled={allSelected}>
            {m.types.all}
          </SelectItem>
          {FORMAT_GROUPS.map((group) => (
            <SelectItem key={group.id} value={group.id} disabled={hasGroup(types, group)}>
              {m.types.groups[group.id]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex flex-wrap gap-1.5" aria-live="polite">
        {fullGroups.map((group) => {
          const label = m.types.groups[group.id];
          return (
            <Badge key={group.id} variant="secondary">
              {label}
              <button
                type="button"
                className="cursor-pointer"
                aria-label={fill(m.common.removeType, { type: label })}
                onClick={() => onChange(types.filter((type) => !groupExtensions(group).includes(type)))}
              >
                <X aria-hidden="true" />
              </button>
            </Badge>
          );
        })}
        {loose.map((type) => (
          <Badge key={type} variant="secondary">
            {type}
            <button type="button" className="cursor-pointer" aria-label={fill(m.common.removeType, { type })} onClick={() => onChange(types.filter((item) => item !== type))}>
              <X aria-hidden="true" />
            </button>
          </Badge>
        ))}
      </div>

      {cappedByWix.length > 0 ? (
        <ul className="flex flex-col gap-0.5 text-xs text-muted-foreground">
          {cappedByWix.map((group) => (
            <li key={group.id}>{fill(m.types.wixLimit, { size: formatBytes(group.maxBytes), group: m.types.groups[group.id] })}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
