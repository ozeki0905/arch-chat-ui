"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { 
  Package, 
  Info,
  CheckCircle,
  Ruler,
  Weight
} from "lucide-react";
import {
  TankFoundationDesignInput,
  PileCatalogItem,
  ValidationResponse
} from "@/types/tankFoundationDesign";

interface PileCatalogStepProps {
  data: Partial<TankFoundationDesignInput>;
  onUpdate: (data: Partial<TankFoundationDesignInput>) => void;
  validation?: ValidationResponse;
}

const PILE_CATALOG: PileCatalogItem[] = [
  {
    type_code: "PHC",
    diameter_mm: 300,
    thickness_mm: 60,
    length_range_m: [6, 15],
    method: "打込み",
    qa_formula_code: "打込み杭",
    material_allowable_stress_mpa: 80
  },
  {
    type_code: "PHC",
    diameter_mm: 350,
    thickness_mm: 60,
    length_range_m: [6, 15],
    method: "打込み",
    qa_formula_code: "打込み杭",
    material_allowable_stress_mpa: 80
  },
  {
    type_code: "PHC",
    diameter_mm: 400,
    thickness_mm: 65,
    length_range_m: [6, 20],
    method: "打込み",
    qa_formula_code: "打込み杭",
    material_allowable_stress_mpa: 80
  },
  {
    type_code: "PHC",
    diameter_mm: 450,
    thickness_mm: 70,
    length_range_m: [6, 20],
    method: "打込み",
    qa_formula_code: "打込み杭",
    material_allowable_stress_mpa: 80
  },
  {
    type_code: "PHC",
    diameter_mm: 500,
    thickness_mm: 80,
    length_range_m: [6, 25],
    method: "打込み",
    qa_formula_code: "打込み杭",
    material_allowable_stress_mpa: 80
  },
  {
    type_code: "PHC",
    diameter_mm: 600,
    thickness_mm: 90,
    length_range_m: [6, 30],
    method: "打込み",
    qa_formula_code: "打込み杭",
    material_allowable_stress_mpa: 80
  },
  {
    type_code: "SC",
    diameter_mm: 300,
    thickness_mm: 60,
    length_range_m: [6, 20],
    method: "中掘り",
    qa_formula_code: "中掘り杭",
    material_allowable_stress_mpa: 85
  },
  {
    type_code: "SC",
    diameter_mm: 400,
    thickness_mm: 65,
    length_range_m: [6, 25],
    method: "中掘り",
    qa_formula_code: "中掘り杭",
    material_allowable_stress_mpa: 85
  },
  {
    type_code: "SC",
    diameter_mm: 500,
    thickness_mm: 80,
    length_range_m: [6, 30],
    method: "中掘り",
    qa_formula_code: "中掘り杭",
    material_allowable_stress_mpa: 85
  },
  {
    type_code: "SC",
    diameter_mm: 600,
    thickness_mm: 90,
    length_range_m: [6, 35],
    method: "中掘り",
    qa_formula_code: "中掘り杭",
    material_allowable_stress_mpa: 85
  },
  {
    type_code: "鋼管",
    diameter_mm: 400,
    thickness_mm: 9,
    length_range_m: [6, 40],
    method: "回転貫入",
    qa_formula_code: "回転貫入鋼管杭",
    material_allowable_stress_mpa: 140
  },
  {
    type_code: "鋼管",
    diameter_mm: 500,
    thickness_mm: 9,
    length_range_m: [6, 45],
    method: "回転貫入",
    qa_formula_code: "回転貫入鋼管杭",
    material_allowable_stress_mpa: 140
  },
  {
    type_code: "鋼管",
    diameter_mm: 600,
    thickness_mm: 12,
    length_range_m: [6, 50],
    method: "回転貫入",
    qa_formula_code: "回転貫入鋼管杭",
    material_allowable_stress_mpa: 140
  },
  {
    type_code: "場所打ち",
    diameter_mm: 1000,
    length_range_m: [10, 60],
    method: "オールケーシング",
    qa_formula_code: "場所打ち杭",
    material_allowable_stress_mpa: 8
  },
  {
    type_code: "場所打ち",
    diameter_mm: 1200,
    length_range_m: [10, 60],
    method: "オールケーシング",
    qa_formula_code: "場所打ち杭",
    material_allowable_stress_mpa: 8
  },
  {
    type_code: "場所打ち",
    diameter_mm: 1500,
    length_range_m: [10, 60],
    method: "オールケーシング",
    qa_formula_code: "場所打ち杭",
    material_allowable_stress_mpa: 8
  }
];

const PILE_TYPE_INFO = {
  PHC: {
    name: "PHC杭",
    description: "プレテンション方式遠心力高強度プレストレストコンクリート杭",
    advantages: ["高強度", "品質安定", "施工実績豊富"],
    color: "blue"
  },
  SC: {
    name: "SC杭",
    description: "外殻鋼管付きコンクリート杭",
    advantages: ["高耐力", "中掘り施工可能", "低騒音・低振動"],
    color: "green"
  },
  鋼管: {
    name: "鋼管杭",
    description: "鋼管を用いた基礎杭",
    advantages: ["高強度", "大深度対応", "回転貫入で低騒音"],
    color: "orange"
  },
  場所打ち: {
    name: "場所打ち杭",
    description: "現場でコンクリートを打設する杭",
    advantages: ["大径対応", "高支持力", "地盤条件に柔軟"],
    color: "purple"
  }
};

export function PileCatalogStep({ 
  data, 
  onUpdate, 
  validation 
}: PileCatalogStepProps) {
  const selectedPiles = data.pile_catalog || [];

  const togglePile = (pile: PileCatalogItem) => {
    const isSelected = selectedPiles.some(
      p => p.type_code === pile.type_code && 
           p.diameter_mm === pile.diameter_mm &&
           p.method === pile.method
    );

    if (isSelected) {
      onUpdate({
        pile_catalog: selectedPiles.filter(
          p => !(p.type_code === pile.type_code && 
                 p.diameter_mm === pile.diameter_mm &&
                 p.method === pile.method)
        )
      });
    } else {
      onUpdate({
        pile_catalog: [...selectedPiles, pile]
      });
    }
  };

  const toggleTypeAll = (typeCode: string) => {
    const typePiles = PILE_CATALOG.filter(p => p.type_code === typeCode);
    const allSelected = typePiles.every(pile =>
      selectedPiles.some(
        p => p.type_code === pile.type_code && 
             p.diameter_mm === pile.diameter_mm &&
             p.method === pile.method
      )
    );

    if (allSelected) {
      // Remove all piles of this type
      onUpdate({
        pile_catalog: selectedPiles.filter(p => p.type_code !== typeCode)
      });
    } else {
      // Add all piles of this type
      const newPiles = typePiles.filter(pile =>
        !selectedPiles.some(
          p => p.type_code === pile.type_code && 
               p.diameter_mm === pile.diameter_mm &&
               p.method === pile.method
        )
      );
      onUpdate({
        pile_catalog: [...selectedPiles, ...newPiles]
      });
    }
  };

  // Group piles by type
  const pilesByType = PILE_CATALOG.reduce((acc, pile) => {
    if (!acc[pile.type_code]) {
      acc[pile.type_code] = [];
    }
    acc[pile.type_code].push(pile);
    return acc;
  }, {} as Record<string, PileCatalogItem[]>);

  return (
    <div className="space-y-6">
      {/* Information */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          使用可能な杭種を選択してください。
          計算時に最適な杭が自動選定されます。
        </AlertDescription>
      </Alert>

      {/* Pile Types */}
      {Object.entries(pilesByType).map(([typeCode, piles]) => {
        const typeInfo = PILE_TYPE_INFO[typeCode as keyof typeof PILE_TYPE_INFO];
        const selectedCount = piles.filter(pile =>
          selectedPiles.some(
            p => p.type_code === pile.type_code && 
                 p.diameter_mm === pile.diameter_mm &&
                 p.method === pile.method
          )
        ).length;

        return (
          <Card key={typeCode} className="p-6">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="text-lg font-semibold">{typeInfo.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {typeInfo.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {selectedCount} / {piles.length} 選択
                  </Badge>
                  <Checkbox
                    checked={selectedCount === piles.length}
                    onCheckedChange={() => toggleTypeAll(typeCode)}
                  />
                </div>
              </div>
              
              <div className="flex gap-2 mt-2">
                {typeInfo.advantages.map((advantage, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {advantage}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {piles.map((pile, index) => {
                const isSelected = selectedPiles.some(
                  p => p.type_code === pile.type_code && 
                       p.diameter_mm === pile.diameter_mm &&
                       p.method === pile.method
                );

                return (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                      isSelected 
                        ? "border-primary bg-primary/5" 
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => togglePile(pile)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => togglePile(pile)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              φ{pile.diameter_mm}
                              {pile.thickness_mm && `×t${pile.thickness_mm}`}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {pile.method}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Ruler className="h-3 w-3" />
                              L={pile.length_range_m?.[0]}-{pile.length_range_m?.[1]}m
                            </span>
                            <span className="flex items-center gap-1">
                              <Weight className="h-3 w-3" />
                              {pile.material_allowable_stress_mpa} MPa
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}

      {/* Summary */}
      {selectedPiles.length > 0 && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">{selectedPiles.length}種類の杭が選択されています</p>
              <p className="text-sm text-muted-foreground mt-1">
                選択された杭種から最適な組み合わせが自動的に選定されます
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}