"use client";

import React, { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Layers, 
  Plus,
  Trash2,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle,
  FileSpreadsheet
} from "lucide-react";
import {
  TankFoundationDesignInput,
  SoilLayer,
  ValidationResponse
} from "@/types/tankFoundationDesign";

interface SoilDataStepProps {
  data: Partial<TankFoundationDesignInput>;
  onUpdate: (data: Partial<TankFoundationDesignInput>) => void;
  validation?: ValidationResponse;
}

const SOIL_TYPES = [
  { value: "砂", label: "砂" },
  { value: "シルト", label: "シルト" },
  { value: "粘土", label: "粘土" },
  { value: "ローム", label: "ローム" },
  { value: "礫", label: "礫" },
  { value: "その他", label: "その他" }
];

const DEFAULT_LAYER: SoilLayer = {
  z_from_m: 0,
  z_to_m: 2,
  soil_type: "砂",
  N_value: 10,
  gamma_t_kn_m3: 18,
  gamma_sat_kn_m3: 19
};

export function SoilDataStep({ 
  data, 
  onUpdate, 
  validation 
}: SoilDataStepProps) {
  const [csvError, setCsvError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const layers = data.soil_profile?.layers || [];

  const handleGroundwaterChange = (value: string) => {
    onUpdate({
      soil_profile: {
        ...data.soil_profile,
        gw_level_m: parseFloat(value)
      }
    });
  };

  const handleLayerChange = (index: number, field: keyof SoilLayer, value: any) => {
    const newLayers = [...layers];
    newLayers[index] = {
      ...newLayers[index],
      [field]: value
    };
    
    onUpdate({
      soil_profile: {
        ...data.soil_profile!,
        layers: newLayers
      }
    });
  };

  const addLayer = () => {
    const lastLayer = layers[layers.length - 1];
    const newLayer: SoilLayer = {
      ...DEFAULT_LAYER,
      z_from_m: lastLayer ? lastLayer.z_to_m : 0,
      z_to_m: lastLayer ? lastLayer.z_to_m + 2 : 2
    };
    
    onUpdate({
      soil_profile: {
        ...data.soil_profile!,
        layers: [...layers, newLayer]
      }
    });
  };

  const removeLayer = (index: number) => {
    const newLayers = layers.filter((_, i) => i !== index);
    onUpdate({
      soil_profile: {
        ...data.soil_profile!,
        layers: newLayers
      }
    });
  };

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        // Skip header row
        const dataLines = lines.slice(1);
        const newLayers: SoilLayer[] = [];
        
        dataLines.forEach((line, index) => {
          const cols = line.split(',').map(col => col.trim());
          if (cols.length >= 6) {
            newLayers.push({
              z_from_m: parseFloat(cols[0]),
              z_to_m: parseFloat(cols[1]),
              soil_type: cols[2] as SoilLayer['soil_type'],
              N_value: parseFloat(cols[3]),
              gamma_t_kn_m3: parseFloat(cols[4]),
              gamma_sat_kn_m3: parseFloat(cols[5]),
              Dr_percent: cols[6] ? parseFloat(cols[6]) : undefined,
              FC_percent: cols[7] ? parseFloat(cols[7]) : undefined,
              K30_MN_m3: cols[8] ? parseFloat(cols[8]) : undefined
            });
          }
        });
        
        if (newLayers.length > 0) {
          onUpdate({
            soil_profile: {
              ...data.soil_profile!,
              layers: newLayers
            }
          });
          setCsvError(null);
        } else {
          setCsvError("有効なデータが見つかりませんでした");
        }
      } catch (error) {
        setCsvError("CSVファイルの読み込みに失敗しました");
      }
    };
    
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const csv = [
      "深度開始(m),深度終了(m),土質,N値,単位体積重量(kN/m³),飽和単位体積重量(kN/m³),相対密度(%),細粒分含有率(%),K30(MN/m³)",
      "0,2,砂,10,18,19,60,15,",
      "2,5,粘土,5,17,18,,,10",
      "5,10,砂,15,18.5,19.5,70,10,",
      "10,15,砂,25,19,20,80,5,"
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'soil_profile_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Check for layer consistency
  const checkLayerConsistency = () => {
    if (layers.length === 0) return null;
    
    for (let i = 1; i < layers.length; i++) {
      if (Math.abs(layers[i].z_from_m - layers[i-1].z_to_m) > 0.01) {
        return `層${i}と層${i+1}の境界が一致していません`;
      }
    }
    return null;
  };

  const consistencyError = checkLayerConsistency();

  return (
    <div className="space-y-6">
      {/* Groundwater Level */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">地下水位</h3>
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="gw-level">地下水位 GL- (m)</Label>
          <Input
            id="gw-level"
            type="number"
            step="0.1"
            value={data.soil_profile?.gw_level_m || ""}
            onChange={(e) => handleGroundwaterChange(e.target.value)}
            placeholder="例: 2.5"
          />
          <p className="text-xs text-muted-foreground">
            地表面からの深さを入力してください
          </p>
        </div>
      </Card>

      {/* CSV Upload */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">地層データ</h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              CSVアップロード
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadTemplate}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              テンプレート
            </Button>
          </div>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleCsvUpload}
          className="hidden"
        />
        
        {csvError && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{csvError}</AlertDescription>
          </Alert>
        )}
      </Card>

      {/* Soil Layers */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">地層構成</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={addLayer}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            層を追加
          </Button>
        </div>
        
        {consistencyError && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{consistencyError}</AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-4">
          {layers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>地層データがありません</p>
              <p className="text-sm mt-1">CSVファイルをアップロードするか、手動で層を追加してください</p>
            </div>
          ) : (
            layers.map((layer, index) => (
              <div
                key={index}
                className="p-4 border rounded-lg bg-card"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">層 {index + 1}</h4>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLayer(index)}
                    className="h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="grid gap-1">
                    <Label className="text-xs">深度 (m)</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        step="0.1"
                        value={layer.z_from_m}
                        onChange={(e) => handleLayerChange(index, 'z_from_m', parseFloat(e.target.value))}
                        className="h-8"
                      />
                      <span className="text-xs">〜</span>
                      <Input
                        type="number"
                        step="0.1"
                        value={layer.z_to_m}
                        onChange={(e) => handleLayerChange(index, 'z_to_m', parseFloat(e.target.value))}
                        className="h-8"
                      />
                    </div>
                  </div>
                  
                  <div className="grid gap-1">
                    <Label className="text-xs">土質</Label>
                    <Select
                      value={layer.soil_type}
                      onValueChange={(value) => handleLayerChange(index, 'soil_type', value)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SOIL_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-1">
                    <Label className="text-xs">N値</Label>
                    <Input
                      type="number"
                      value={layer.N_value || ""}
                      onChange={(e) => handleLayerChange(index, 'N_value', parseFloat(e.target.value))}
                      className="h-8"
                    />
                  </div>
                  
                  <div className="grid gap-1">
                    <Label className="text-xs">γt (kN/m³)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={layer.gamma_t_kn_m3 || ""}
                      onChange={(e) => handleLayerChange(index, 'gamma_t_kn_m3', parseFloat(e.target.value))}
                      className="h-8"
                    />
                  </div>
                  
                  <div className="grid gap-1">
                    <Label className="text-xs">γsat (kN/m³)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={layer.gamma_sat_kn_m3 || ""}
                      onChange={(e) => handleLayerChange(index, 'gamma_sat_kn_m3', parseFloat(e.target.value))}
                      className="h-8"
                    />
                  </div>
                  
                  <div className="grid gap-1">
                    <Label className="text-xs">K30 (MN/m³)</Label>
                    <Input
                      type="number"
                      value={layer.K30_MN_m3 || ""}
                      onChange={(e) => handleLayerChange(index, 'K30_MN_m3', parseFloat(e.target.value))}
                      className="h-8"
                    />
                  </div>
                </div>
                
                {/* Optional fields for sand */}
                {layer.soil_type === "砂" && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="grid gap-1">
                      <Label className="text-xs">相対密度 Dr (%)</Label>
                      <Input
                        type="number"
                        value={layer.Dr_percent || ""}
                        onChange={(e) => handleLayerChange(index, 'Dr_percent', parseFloat(e.target.value))}
                        className="h-8"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">細粒分含有率 FC (%)</Label>
                      <Input
                        type="number"
                        value={layer.FC_percent || ""}
                        onChange={(e) => handleLayerChange(index, 'FC_percent', parseFloat(e.target.value))}
                        className="h-8"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Data Validation Summary */}
      {layers.length > 0 && !consistencyError && (
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <CheckCircle className="h-4 w-4" />
          <span>{layers.length}層の地層データが正しく設定されています</span>
        </div>
      )}
    </div>
  );
}