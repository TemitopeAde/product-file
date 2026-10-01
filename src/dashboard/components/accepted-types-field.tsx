import { X } from 'lucide-react';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const OPTIONS = [
  { value: 'images', label: 'Images', types: ['image/*'] },
  { value: 'pdf', label: 'PDF', types: ['application/pdf'] },
  { value: 'word', label: 'Word documents', types: ['.doc', '.docx'] },
  { value: 'design', label: 'Design files', types: ['.ai', '.eps', '.psd', '.svg'] },
  { value: 'zip', label: 'ZIP archives', types: ['.zip'] },
] as const;

interface AcceptedTypesFieldProps {
  id: string;
  types: string[];
  onChange: (types: string[]) => void;
}

export function AcceptedTypesField({ id, types, onChange }: AcceptedTypesFieldProps) {
  const addTypes = (optionValue: string) => {
    const option = OPTIONS.find((item) => item.value === optionValue);
    if (!option) return;
    onChange([...new Set([...types, ...option.types])]);
  };

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>Accepted file types</Label>
      <Select key={types.join('\u0000')} onValueChange={addTypes}>
        <SelectTrigger id={id} aria-label="Add an accepted file type">
          <SelectValue placeholder="Select file types to accept" />
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value} disabled={option.types.every((type) => types.includes(type))}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex flex-wrap gap-1.5" aria-live="polite">
        {types.map((type) => (
          <Badge key={type} variant="secondary">
            {type}
            <button type="button" className="cursor-pointer" aria-label={`Remove ${type}`} onClick={() => onChange(types.filter((item) => item !== type))}>
              <X aria-hidden="true" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}
