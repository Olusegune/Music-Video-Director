import { Input } from "@/platform/components/ui/input";
import { Label } from "@/platform/components/ui/label";
import { Textarea } from "@/platform/components/ui/textarea";
import { Select } from "@/platform/components/ui/select";

export type IntakeField =
  | {
      id: string;
      label: string;
      placeholder?: string;
      type?: "text" | "url" | "email";
      required?: boolean;
    }
  | {
      id: string;
      label: string;
      placeholder?: string;
      type: "textarea";
      required?: boolean;
    }
  | {
      id: string;
      label: string;
      type: "select";
      options: { id: string; label: string }[];
      required?: boolean;
    };

interface IntakeFormStepProps {
  fields: IntakeField[];
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}

export function IntakeFormStep({ fields, value, onChange }: IntakeFormStepProps) {
  function setField(id: string, next: string) {
    onChange({ ...value, [id]: next });
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {fields.map((field) => (
        <div key={field.id} className={field.type === "textarea" ? "md:col-span-2" : undefined}>
          <Label htmlFor={field.id}>
            {field.label}
            {field.required ? " *" : ""}
          </Label>
          {field.type === "textarea" ? (
            <Textarea
              id={field.id}
              value={value[field.id] ?? ""}
              onChange={(event) => setField(field.id, event.target.value)}
              placeholder={field.placeholder}
              className="mt-2"
            />
          ) : field.type === "select" ? (
            <Select
              id={field.id}
              value={value[field.id] ?? ""}
              onChange={(value: string) => setField(field.id, value)}
              className="mt-2 h-9 w-full rounded-[var(--radius-input)] border border-border bg-surface px-3 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none"
            >
              <option value="">Choose...</option>
              {field.options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              id={field.id}
              type={field.type ?? "text"}
              value={value[field.id] ?? ""}
              onChange={(event) => setField(field.id, event.target.value)}
              placeholder={field.placeholder}
              className="mt-2"
            />
          )}
        </div>
      ))}
    </div>
  );
}
