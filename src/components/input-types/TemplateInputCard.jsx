import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

import { updateInput } from "@/state/inputs/inputActions";
import {
  TEMPLATE_SCHEMAS,
  TEMPLATE_IDS,
  getTemplateDefaults,
} from "@/domain/input/templates";

function TemplateFieldControl({ field, value, onChange }) {
  const id = `template-field-${field.key}`;

  if (field.type === "checkbox") {
    return (
      <div className="flex items-center gap-2">
        <Checkbox
          id={id}
          checked={value === true || value === "true"}
          onCheckedChange={(checked) => onChange(checked === true)}
        />
        <Label htmlFor={id}>{field.label}</Label>
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div className="space-y-1">
        <Label htmlFor={id}>{field.label}</Label>
        <Select value={String(value ?? "")} onValueChange={onChange}>
          <SelectTrigger id={id}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(field.options || []).map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className="space-y-1">
        <Label htmlFor={id}>{field.label}</Label>
        <textarea
          id={id}
          rows={3}
          value={value ?? ""}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "flex min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm transition-colors",
            "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          )}
        />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{field.label}</Label>
      <Input
        id={id}
        type={field.type === "number" ? "number" : "text"}
        value={value ?? ""}
        placeholder={field.placeholder}
        step={field.type === "number" ? "any" : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function TemplateInputCard({ input, dispatch, preview, parseError }) {
  const kind = input.template || "wifi";
  const schema = TEMPLATE_SCHEMAS[kind] || TEMPLATE_SCHEMAS.wifi;
  const fields = input.templateFields || getTemplateDefaults(kind);

  const setKind = (nextKind) => {
    dispatch(
      updateInput(input.id, {
        template: nextKind,
        templateFields: getTemplateDefaults(nextKind),
      })
    );
  };

  const setField = (key, value) => {
    dispatch(
      updateInput(input.id, {
        templateFields: { ...fields, [key]: value },
      })
    );
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">QR Template</h3>

      <div className="space-y-1">
        <Label>Template</Label>
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TEMPLATE_IDS.map((id) => (
              <SelectItem key={id} value={id}>
                {TEMPLATE_SCHEMAS[id].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {schema.fields.map((field) => (
          <TemplateFieldControl
            key={field.key}
            field={field}
            value={fields[field.key]}
            onChange={(value) => setField(field.key, value)}
          />
        ))}
      </div>

      <Separator />

      {parseError ? (
        <div className="rounded border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {parseError}
        </div>
      ) : (
        <div className="rounded bg-muted p-3 text-sm">
          <strong>Payload:</strong>{" "}
          <code className="whitespace-pre-wrap break-all text-muted-foreground">
            {preview?.data || "(incomplete…)"}
          </code>
        </div>
      )}
    </div>
  );
}
