"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { MapPin, Building2, Calendar, User } from "lucide-react";
import {
  TankFoundationDesignInput,
  ValidationResponse
} from "@/types/tankFoundationDesign";
import { ExtendedProjectInfo } from "@/types/projectData";

interface BasicInfoStepProps {
  data: Partial<TankFoundationDesignInput>;
  onUpdate: (data: Partial<TankFoundationDesignInput>) => void;
  validation?: ValidationResponse;
  projectInfo: Partial<ExtendedProjectInfo>;
}

export function BasicInfoStep({ 
  data, 
  onUpdate, 
  validation,
  projectInfo 
}: BasicInfoStepProps) {
  const handleProjectChange = (field: string, value: string) => {
    onUpdate({
      project: {
        ...data.project!,
        [field]: value
      }
    });
  };

  const handleSiteChange = (field: string, value: string | number) => {
    onUpdate({
      site: {
        ...data.site!,
        [field]: value
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Project Information */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">プロジェクト情報</h3>
        </div>
        
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="project-name">プロジェクト名 *</Label>
            <Input
              id="project-name"
              value={data.project?.name || ""}
              onChange={(e) => handleProjectChange("name", e.target.value)}
              placeholder="例: ○○石油備蓄基地 第3タンク基礎"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="project-id">プロジェクトID</Label>
              <Input
                id="project-id"
                value={data.project?.project_id || ""}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="created-by">作成者</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="created-by"
                  value={data.project?.created_by || ""}
                  onChange={(e) => handleProjectChange("created_by", e.target.value)}
                  placeholder="担当者名"
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Site Information */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">サイト情報</h3>
        </div>
        
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="site-name">サイト名 *</Label>
            <Input
              id="site-name"
              value={data.site?.site_name || ""}
              onChange={(e) => handleSiteChange("site_name", e.target.value)}
              placeholder="例: ○○石油備蓄基地"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="location">所在地 *</Label>
            <Textarea
              id="location"
              value={data.site?.location || ""}
              onChange={(e) => handleSiteChange("location", e.target.value)}
              placeholder="例: 東京都港区○○1-2-3"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="lat">緯度</Label>
              <Input
                id="lat"
                type="number"
                step="0.000001"
                value={data.site?.lat || ""}
                onChange={(e) => handleSiteChange("lat", parseFloat(e.target.value))}
                placeholder="例: 35.681236"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="lng">経度</Label>
              <Input
                id="lng"
                type="number"
                step="0.000001"
                value={data.site?.lng || ""}
                onChange={(e) => handleSiteChange("lng", parseFloat(e.target.value))}
                placeholder="例: 139.767125"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="elevation">地盤高 (GL±0 m)</Label>
              <Input
                id="elevation"
                type="number"
                step="0.1"
                value={data.site?.elevation_gl || ""}
                onChange={(e) => handleSiteChange("elevation_gl", parseFloat(e.target.value))}
                placeholder="例: 12.5"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="airport">空港制限</Label>
              <Input
                id="airport"
                value={data.site?.airport_constraints || ""}
                onChange={(e) => handleSiteChange("airport_constraints", e.target.value)}
                placeholder="例: 制限なし"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Pre-filled information notice */}
      {projectInfo && Object.keys(projectInfo).length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <span className="font-medium">情報の自動入力:</span> 
            フェーズ1で抽出された情報を基に、一部の項目が自動的に入力されています。
            必要に応じて修正してください。
          </p>
        </div>
      )}
    </div>
  );
}