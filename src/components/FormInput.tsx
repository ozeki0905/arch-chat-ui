"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Building, MapPin, Ruler, Home, Layers, HelpCircle } from "lucide-react";

interface FormField {
  id: string;
  type: "text" | "number" | "select" | "textarea" | "radio";
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string; description?: string }[];
  unit?: string;
  icon?: React.ReactNode;
  helperText?: string;
}

interface FormInputProps {
  fields: FormField[];
  onSubmit: (data: Record<string, string>) => void;
  title?: string;
  description?: string;
  submitLabel?: string;
}

export function FormInput({
  fields,
  onSubmit,
  title,
  description,
  submitLabel = "送信"
}: FormInputProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleFieldChange = (fieldId: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    // エラーをクリア
    if (errors[fieldId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // バリデーション
    const newErrors: Record<string, string> = {};
    for (const field of fields) {
      if (field.required && !formData[field.id]) {
        newErrors[field.id] = `${field.label}は必須項目です`;
      }
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    onSubmit(formData);
    setFormData({});
  };

  const renderField = (field: FormField) => {
    switch (field.type) {
      case "text":
      case "number":
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id} className="flex items-center gap-2">
              {field.icon}
              {field.label}
              {field.required && <span className="text-destructive">*</span>}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id={field.id}
                type={field.type}
                placeholder={field.placeholder}
                value={formData[field.id] || ""}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                className={errors[field.id] ? "border-destructive" : ""}
              />
              {field.unit && (
                <span className="text-sm text-muted-foreground min-w-fit">
                  {field.unit}
                </span>
              )}
            </div>
            {field.helperText && (
              <p className="text-xs text-muted-foreground">{field.helperText}</p>
            )}
            {errors[field.id] && (
              <p className="text-xs text-destructive">{errors[field.id]}</p>
            )}
          </div>
        );

      case "select":
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id} className="flex items-center gap-2">
              {field.icon}
              {field.label}
              {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Select
              value={formData[field.id] || ""}
              onValueChange={(value) => handleFieldChange(field.id, value)}
            >
              <SelectTrigger id={field.id} className={errors[field.id] ? "border-destructive" : ""}>
                <SelectValue placeholder={field.placeholder || "選択してください"} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors[field.id] && (
              <p className="text-xs text-destructive">{errors[field.id]}</p>
            )}
          </div>
        );

      case "textarea":
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id} className="flex items-center gap-2">
              {field.icon}
              {field.label}
              {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id={field.id}
              placeholder={field.placeholder}
              value={formData[field.id] || ""}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              className={errors[field.id] ? "border-destructive" : ""}
              rows={3}
            />
            {errors[field.id] && (
              <p className="text-xs text-destructive">{errors[field.id]}</p>
            )}
          </div>
        );

      case "radio":
        return (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              {field.icon}
              {field.label}
              {field.required && <span className="text-destructive">*</span>}
            </Label>
            <RadioGroup
              value={formData[field.id] || ""}
              onValueChange={(value) => handleFieldChange(field.id, value)}
            >
              {field.options?.map(option => (
                <div key={option.value} className="flex items-start space-x-2 py-2">
                  <RadioGroupItem value={option.value} id={`${field.id}-${option.value}`} />
                  <div className="space-y-1 flex-1">
                    <Label
                      htmlFor={`${field.id}-${option.value}`}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {option.label}
                    </Label>
                    {option.description && (
                      <p className="text-xs text-muted-foreground">
                        {option.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </RadioGroup>
            {errors[field.id] && (
              <p className="text-xs text-destructive">{errors[field.id]}</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="w-full">
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map(field => (
            <div key={field.id}>{renderField(field)}</div>
          ))}
          <Button type="submit" className="w-full">
            {submitLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// プリセットフォーム: 敷地情報
export function SiteInfoForm({ onSubmit }: { onSubmit: (data: Record<string, string>) => void }) {
  const fields: FormField[] = [
    {
      id: "siteAddress",
      type: "text",
      label: "敷地住所",
      placeholder: "東京都港区六本木1-1-1",
      required: true,
      icon: <MapPin className="h-4 w-4" />,
    },
    {
      id: "siteArea",
      type: "number",
      label: "敷地面積",
      placeholder: "1500",
      required: true,
      unit: "㎡",
      icon: <Ruler className="h-4 w-4" />,
    },
    {
      id: "landUse",
      type: "select",
      label: "用途地域",
      required: true,
      icon: <Home className="h-4 w-4" />,
      options: [
        { value: "residential_1", label: "第一種低層住居専用地域" },
        { value: "residential_2", label: "第二種低層住居専用地域" },
        { value: "residential_3", label: "第一種中高層住居専用地域" },
        { value: "residential_4", label: "第二種中高層住居専用地域" },
        { value: "residential_5", label: "第一種住居地域" },
        { value: "residential_6", label: "第二種住居地域" },
        { value: "commercial_1", label: "近隣商業地域" },
        { value: "commercial_2", label: "商業地域" },
        { value: "industrial_1", label: "準工業地域" },
        { value: "industrial_2", label: "工業地域" },
        { value: "industrial_3", label: "工業専用地域" },
      ],
    },
  ];

  return (
    <FormInput
      fields={fields}
      onSubmit={onSubmit}
      title="敷地情報の入力"
      description="建設予定地の基本情報を入力してください"
      submitLabel="敷地情報を送信"
    />
  );
}

// プリセットフォーム: 建物概要
export function BuildingOverviewForm({ onSubmit }: { onSubmit: (data: Record<string, string>) => void }) {
  const fields: FormField[] = [
    {
      id: "requiredFloorArea",
      type: "number",
      label: "延床面積",
      placeholder: "5000",
      required: true,
      unit: "㎡",
      icon: <Building className="h-4 w-4" />,
    },
    {
      id: "numberOfFloors",
      type: "text",
      label: "階数",
      placeholder: "地上5階/地下1階",
      required: true,
      icon: <Layers className="h-4 w-4" />,
      helperText: "例: 地上5階、地上3階/地下1階、5F",
    },
    {
      id: "structureType",
      type: "radio",
      label: "構造種別（希望）",
      icon: <Building className="h-4 w-4" />,
      options: [
        { value: "RC", label: "RC造", description: "鉄筋コンクリート造" },
        { value: "S", label: "S造", description: "鉄骨造" },
        { value: "SRC", label: "SRC造", description: "鉄骨鉄筋コンクリート造" },
        { value: "W", label: "木造", description: "木造" },
        { value: "undecided", label: "未定", description: "最適な構造を提案してほしい" },
      ],
    },
  ];

  return (
    <FormInput
      fields={fields}
      onSubmit={onSubmit}
      title="建物概要の入力"
      description="計画建物の規模・構造を入力してください"
      submitLabel="建物概要を送信"
    />
  );
}

// 動的フォーム生成関数
export function generateDynamicForm(
  missingInfo: string[],
  onSubmit: (data: Record<string, string>) => void
) {
  const fieldMap: Record<string, FormField> = {
    "敷地住所": {
      id: "siteAddress",
      type: "text",
      label: "敷地住所",
      placeholder: "東京都港区六本木1-1-1",
      required: true,
      icon: <MapPin className="h-4 w-4" />,
    },
    "敷地面積": {
      id: "siteArea",
      type: "number",
      label: "敷地面積",
      placeholder: "1500",
      required: true,
      unit: "㎡",
      icon: <Ruler className="h-4 w-4" />,
    },
    "延床面積": {
      id: "requiredFloorArea",
      type: "number",
      label: "延床面積",
      placeholder: "5000",
      required: true,
      unit: "㎡",
      icon: <Building className="h-4 w-4" />,
    },
    "階数": {
      id: "numberOfFloors",
      type: "text",
      label: "階数",
      placeholder: "地上5階/地下1階",
      required: true,
      icon: <Layers className="h-4 w-4" />,
    },
    "用途地域": {
      id: "landUse",
      type: "select",
      label: "用途地域",
      required: true,
      icon: <Home className="h-4 w-4" />,
      options: [
        { value: "residential", label: "住居地域" },
        { value: "commercial", label: "商業地域" },
        { value: "industrial", label: "工業地域" },
      ],
    },
  };

  const fields = missingInfo
    .map(info => fieldMap[info])
    .filter(field => field !== undefined);

  if (fields.length === 0) return null;

  return (
    <FormInput
      fields={fields}
      onSubmit={onSubmit}
      title="不足情報の入力"
      description="以下の情報を入力してください"
      submitLabel="情報を送信"
    />
  );
}