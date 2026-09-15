import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

export type FormFieldType =
  | 'text' | 'email' | 'tel' | 'number' | 'date' | 'textarea' | 'select' | 'checkbox';

export interface FormFieldDef {
  name: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
}

export interface FormDefinition {
  title: string;
  description?: string;
  submitLabel?: string;
  fields: FormFieldDef[];
}

export function parseFields(value: unknown): FormFieldDef[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((f): f is Record<string, unknown> => !!f && typeof f === 'object')
    .map((f, i) => ({
      name: String(f.name ?? `field_${i + 1}`),
      label: String(f.label ?? `Field ${i + 1}`),
      type: (['text', 'email', 'tel', 'number', 'date', 'textarea', 'select', 'checkbox']
        .includes(String(f.type)) ? String(f.type) : 'text') as FormFieldType,
      required: Boolean(f.required),
      placeholder: f.placeholder ? String(f.placeholder) : undefined,
      options: Array.isArray(f.options) ? f.options.map((o) => String(o)) : undefined,
    }));
}

interface Props {
  definition: FormDefinition;
  /** Preview mode disables submitting. */
  preview?: boolean;
  submitting?: boolean;
  onSubmit?: (values: Record<string, unknown>) => void;
}

export default function FormRenderer({ definition, preview, submitting, onSubmit }: Props) {
  const [values, setValues] = useState<Record<string, unknown>>({});

  useEffect(() => {
    setValues({});
  }, [definition.fields.length, definition.title]);

  const set = (name: string, value: unknown) =>
    setValues((prev) => ({ ...prev, [name]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (preview) return;
    onSubmit?.(values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold">{definition.title || 'Untitled form'}</h2>
        {definition.description && (
          <p className="text-sm text-muted-foreground">{definition.description}</p>
        )}
      </div>

      {definition.fields.length === 0 && (
        <p className="text-sm text-muted-foreground">
          This form has no questions yet.
        </p>
      )}

      <div className="space-y-4">
        {definition.fields.map((field) => {
          const id = `field-${field.name}`;
          if (field.type === 'checkbox') {
            return (
              <div key={field.name} className="flex items-start gap-3 rounded-lg border p-3">
                <Checkbox
                  id={id}
                  checked={Boolean(values[field.name])}
                  onCheckedChange={(checked) => set(field.name, checked === true)}
                />
                <Label htmlFor={id} className="text-sm font-normal leading-snug">
                  {field.label}
                  {field.required && <span className="text-destructive"> *</span>}
                </Label>
              </div>
            );
          }

          return (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={id}>
                {field.label}
                {field.required && <span className="text-destructive"> *</span>}
              </Label>
              {field.type === 'textarea' ? (
                <Textarea
                  id={id}
                  rows={4}
                  placeholder={field.placeholder}
                  required={field.required && !preview}
                  value={String(values[field.name] ?? '')}
                  onChange={(e) => set(field.name, e.target.value)}
                />
              ) : field.type === 'select' ? (
                <Select
                  value={String(values[field.name] ?? '')}
                  onValueChange={(v) => set(field.name, v)}
                >
                  <SelectTrigger id={id}>
                    <SelectValue placeholder={field.placeholder || 'Select an option'} />
                  </SelectTrigger>
                  <SelectContent>
                    {(field.options ?? []).map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={id}
                  type={field.type}
                  placeholder={field.placeholder}
                  required={field.required && !preview}
                  value={String(values[field.name] ?? '')}
                  onChange={(e) => set(field.name, e.target.value)}
                />
              )}
            </div>
          );
        })}
      </div>

      <Button type="submit" className="w-full" disabled={preview || submitting}>
        {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {definition.submitLabel || 'Submit'}
      </Button>
      {preview && (
        <p className="text-xs text-muted-foreground text-center">
          Preview only — submitting is disabled here.
        </p>
      )}
    </form>
  );
}
