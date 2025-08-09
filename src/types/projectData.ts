// Extended project information that combines building and tank data
import { ProjectInfo } from "./extraction";

export interface ExtendedProjectInfo extends Partial<ProjectInfo> {
  // Database ID
  projectId?: string;
  
  // Basic building info (simplified from ProjectInfo)
  projectName?: string;
  siteName?: string;
  siteAddress?: string;
  siteArea?: number;
  buildingUse?: string;
  totalFloorArea?: number;
  numberOfFloors?: string;
  structureType?: string;
  zoningDistrict?: string;
  buildingCoverageRatio?: number;
  floorAreaRatio?: number;
  
  // Tank-specific information
  tankCapacity?: number;
  tankContent?: string;
  tankDiameter?: number;
  tankHeight?: number;
  tankUnitWeight?: number;
  tankRoofType?: string;
  
  // Regulations
  legalClassification?: string;
  appliedCodes?: string[];
  codeVersions?: Record<string, string>;
  
  // Design criteria
  seismicLevel?: string;
  safetyFactorBearing?: number;
  settlementLimit?: number;
  
  // Soil data summary
  groundwaterLevel?: number;
  soilLayerCount?: number;
  weakestNValue?: number;
  
  // Status tracking
  phase?: string;
  lastUpdated?: Date;
  completionPercentage?: number;
}

// Mapping function from ExtractedItems to ExtendedProjectInfo
export function mapExtractedToProjectInfo(
  items: Array<{ key: string; value: string | null }>,
  existing?: Partial<ExtendedProjectInfo>
): ExtendedProjectInfo {
  const info: ExtendedProjectInfo = existing || {};
  
  items.forEach(item => {
    if (!item.value) return;
    
    switch (item.key) {
      // Basic info
      case "projectName":
        info.projectName = item.value;
        break;
      case "siteAddress":
        info.siteAddress = item.value;
        break;
      case "siteName":
        info.siteName = item.value;
        break;
      case "siteArea":
        info.siteArea = parseFloat(item.value);
        break;
        
      // Building info
      case "buildingUse":
        info.buildingUse = item.value;
        break;
      case "totalFloorArea":
      case "requiredFloorArea":
        info.totalFloorArea = parseFloat(item.value);
        break;
      case "numberOfFloors":
        info.numberOfFloors = item.value;
        break;
      case "structureType":
        info.structureType = item.value;
        break;
        
      // Tank info
      case "tankCapacity":
        info.tankCapacity = parseFloat(item.value);
        break;
      case "tankContent":
        info.tankContent = item.value;
        break;
      case "tankDiameter":
        info.tankDiameter = parseFloat(item.value);
        break;
      case "tankHeight":
        info.tankHeight = parseFloat(item.value);
        break;
      case "tankUnitWeight":
        info.tankUnitWeight = parseFloat(item.value);
        break;
      case "tankRoofType":
        info.tankRoofType = item.value;
        break;
        
      // Regulations
      case "legalClassification":
        info.legalClassification = item.value;
        break;
      case "appliedCodes":
        info.appliedCodes = item.value.split(",").map(s => s.trim());
        break;
        
      // Design criteria
      case "seismicLevel":
        info.seismicLevel = item.value;
        break;
      case "safetyFactorBearing":
        info.safetyFactorBearing = parseFloat(item.value);
        break;
      case "settlementLimit":
        info.settlementLimit = parseFloat(item.value);
        break;
        
      // Soil data
      case "groundwaterLevel":
        info.groundwaterLevel = parseFloat(item.value);
        break;
    }
  });
  
  return info;
}