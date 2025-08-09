"use client";

import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Cylinder, 
  AlertTriangle, 
  CheckCircle,
  Info,
  Calculator
} from "lucide-react";
import {
  TankFoundationDesignInput,
  ValidationResponse
} from "@/types/tankFoundationDesign";

interface TankSpecStepProps {
  data: Partial<TankFoundationDesignInput>;
  onUpdate: (data: Partial<TankFoundationDesignInput>) => void;
  validation?: ValidationResponse;
}

const CONTENT_TYPES = [
  { value: "原油", label: "原油", density: 8.5 },
  { value: "重油", label: "重油", density: 9.5 },
  { value: "軽油", label: "軽油", density: 8.3 },
  { value: "ガソリン", label: "ガソリン", density: 7.5 },
  { value: "灯油", label: "灯油", density: 8.0 },
  { value: "水", label: "水", density: 10.0 },
  { value: "その他", label: "その他", density: null }
];

export function TankSpecStep({ 
  data, 
  onUpdate, 
  validation 
}: TankSpecStepProps) {
  const [volumeDifference, setVolumeDifference] = useState<number | null>(null);
  const [calculatedVolume, setCalculatedVolume] = useState<number | null>(null);

  const handleTankChange = (field: string, value: string | number) => {
    onUpdate({
      tank: {
        ...data.tank!,
        [field]: value
      }
    });
  };

  // Calculate volume and check difference
  useEffect(() => {
    if (data.tank?.diameter_m && data.tank?.height_m) {
      const radius = data.tank.diameter_m / 2;
      const calculated = Math.PI * radius * radius * data.tank.height_m * 1000; // Convert to kL
      setCalculatedVolume(calculated);

      if (data.tank?.capacity_kl) {
        const diff = Math.abs((calculated - data.tank.capacity_kl) / data.tank.capacity_kl) * 100;
        setVolumeDifference(diff);
      }
    } else {
      setCalculatedVolume(null);
      setVolumeDifference(null);
    }
  }, [data.tank?.capacity_kl, data.tank?.diameter_m, data.tank?.height_m]);

  // Auto-fill unit weight based on content type
  const handleContentTypeChange = (value: string) => {
    handleTankChange("content_type", value);
    
    const content = CONTENT_TYPES.find(c => c.value === value);
    if (content?.density) {
      handleTankChange("unit_weight_kn_m3", content.density);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tank Specifications */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Cylinder className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">タンク仕様</h3>
        </div>
        
        <div className="grid gap-4">
          {/* Capacity */}
          <div className="grid gap-2">
            <Label htmlFor="capacity">公称容量 (kL) *</Label>
            <Input
              id="capacity"
              type="number"
              value={data.tank?.capacity_kl || ""}
              onChange={(e) => handleTankChange("capacity_kl", parseFloat(e.target.value))}
              placeholder="例: 10000"
            />
          </div>

          {/* Content Type */}
          <div className="grid gap-2">
            <Label htmlFor="content">内容物 *</Label>
            <Select
              value={data.tank?.content_type || ""}
              onValueChange={handleContentTypeChange}
            >
              <SelectTrigger id="content">
                <SelectValue placeholder="内容物を選択" />
              </SelectTrigger>
              <SelectContent>
                {CONTENT_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                    {type.density && (
                      <span className="text-muted-foreground ml-2">
                        ({type.density} kN/m³)
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Unit Weight */}
          <div className="grid gap-2">
            <Label htmlFor="unit-weight">単位重量 (kN/m³)</Label>
            <Input
              id="unit-weight"
              type="number"
              step="0.1"
              value={data.tank?.unit_weight_kn_m3 || ""}
              onChange={(e) => handleTankChange("unit_weight_kn_m3", parseFloat(e.target.value))}
              placeholder="例: 8.5"
            />
            <p className="text-xs text-muted-foreground">
              内容物を選択すると自動入力されます
            </p>
          </div>

          {/* Dimensions */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="diameter">内径 (m)</Label>
              <Input
                id="diameter"
                type="number"
                step="0.1"
                value={data.tank?.diameter_m || ""}
                onChange={(e) => handleTankChange("diameter_m", parseFloat(e.target.value))}
                placeholder="例: 40.0"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="height">側板高さ (m)</Label>
              <Input
                id="height"
                type="number"
                step="0.1"
                value={data.tank?.height_m || ""}
                onChange={(e) => handleTankChange("height_m", parseFloat(e.target.value))}
                placeholder="例: 10.0"
              />
            </div>
          </div>

          {/* Roof Type */}
          <div className="grid gap-2">
            <Label>屋根形式</Label>
            <RadioGroup
              value={data.tank?.roof_type || "固定"}
              onValueChange={(value) => handleTankChange("roof_type", value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="固定" id="fixed-roof" />
                <Label htmlFor="fixed-roof" className="font-normal">固定屋根</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="浮屋根" id="floating-roof" />
                <Label htmlFor="floating-roof" className="font-normal">浮屋根</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="不明" id="unknown-roof" />
                <Label htmlFor="unknown-roof" className="font-normal">不明</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </Card>

      {/* Volume Validation */}
      {calculatedVolume !== null && (
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <Calculator className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-sm">容量計算結果</p>
              <p className="text-sm text-muted-foreground mt-1">
                計算容量: {calculatedVolume.toFixed(0)} kL
              </p>
              {volumeDifference !== null && (
                <>
                  <p className="text-sm text-muted-foreground">
                    公称容量との差: {volumeDifference.toFixed(1)}%
                  </p>
                  {volumeDifference > 1 && (
                    <Alert className="mt-3">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        公称容量と計算容量の差が1%を超えています。
                        タンク寸法を確認してください。
                      </AlertDescription>
                    </Alert>
                  )}
                  {volumeDifference <= 1 && (
                    <div className="flex items-center gap-2 mt-2 text-green-600 dark:text-green-400">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm">容量が適切に設定されています</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Information */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          タンク形状は円筒形のみ対応しています。
          内径と高さから容量を自動計算し、公称容量との差を確認します。
        </AlertDescription>
      </Alert>
    </div>
  );
}