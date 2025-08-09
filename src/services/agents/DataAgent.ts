import { ExtractedItem } from "@/types/extraction";
import { ExtendedProjectInfo } from "@/types/projectData";
import { TankFoundationDesignInput } from "@/types/tankFoundationDesign";
import { ChatSession } from "@/types/chat";
import { debugFetch, enableDebugFetch } from "@/utils/debugFetch";

export interface DataAgentConfig {
  apiBaseUrl?: string;
  enableCache?: boolean;
  cacheTimeout?: number;
}

export class DataAgent {
  private config: DataAgentConfig;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();

  constructor(config: DataAgentConfig = {}) {
    this.config = {
      apiBaseUrl: config.apiBaseUrl || "/api",
      enableCache: config.enableCache ?? true,
      cacheTimeout: config.cacheTimeout || 5 * 60 * 1000 // 5分
    };
    
    console.log("DataAgent initialized with config:", {
      apiBaseUrl: this.config.apiBaseUrl,
      enableCache: this.config.enableCache,
      cacheTimeout: this.config.cacheTimeout
    });
  }

  /**
   * プロジェクトデータを保存
   */
  async saveProjectData(
    projectId: string | null,
    extractedItems: ExtractedItem[],
    projectInfo: Partial<ExtendedProjectInfo>,
    designInput?: Partial<TankFoundationDesignInput>
  ): Promise<{ projectId: string; success: boolean }> {
    console.log("DataAgent.saveProjectData - Called with:", {
      projectId,
      hasExtractedItems: !!extractedItems,
      extractedItemsCount: extractedItems?.length || 0,
      extractedItems: extractedItems?.map(item => ({ 
        key: item.key, 
        value: item.value, 
        category: item.category,
        status: item.status 
      })),
      projectInfo,
      hasDesignInput: !!designInput
    });

    try {
      // Validate inputs
      if (!extractedItems || extractedItems.length === 0) {
        console.warn("DataAgent.saveProjectData - No extracted items provided");
      }
      
      if (!projectInfo || Object.keys(projectInfo).length === 0) {
        console.warn("DataAgent.saveProjectData - No project info provided");
      }

      // 既存プロジェクトの更新か新規作成かを判定
      if (projectId) {
        return await this.updateProject(projectId, extractedItems, projectInfo, designInput);
      } else {
        return await this.createProject(extractedItems, projectInfo, designInput);
      }
    } catch (error) {
      console.error("Failed to save project data:", error);
      // Re-throw the error to propagate it to the UI
      throw error;
    }
  }

  /**
   * プロジェクトを新規作成
   */
  private async createProject(
    extractedItems: ExtractedItem[],
    projectInfo: Partial<ExtendedProjectInfo>,
    designInput?: Partial<TankFoundationDesignInput>
  ): Promise<{ projectId: string; success: boolean }> {
    try {
      console.log("DataAgent.createProject - Input validation:", {
        hasExtractedItems: !!extractedItems,
        extractedItemsCount: extractedItems?.length || 0,
        hasProjectInfo: !!projectInfo,
        projectInfo,
        hasDesignInput: !!designInput
      });

      // Validate inputs
      if (!extractedItems && !projectInfo && !designInput) {
        throw new Error("No data provided to create project");
      }

      // ExtractedItemsとProjectInfoからTankFoundationDesignInputを構築
      const fullDesignInput = this.buildDesignInput(extractedItems || [], projectInfo || {}, designInput);
      
      // Validate required fields
      if (!fullDesignInput.project?.name) {
        console.error("DataAgent.createProject - Missing project name", {
          fullDesignInput,
          projectInfo,
          extractedItems
        });
        throw new Error("プロジェクト名が設定されていません");
      }

      if (!fullDesignInput.project?.created_by) {
        console.error("DataAgent.createProject - Missing created_by", fullDesignInput);
        throw new Error("作成者情報が設定されていません");
      }
      
      console.log("DataAgent.createProject - Sending request to:", `${this.config.apiBaseUrl}/projects`);
      console.log("DataAgent.createProject - Request data:", JSON.stringify(fullDesignInput, null, 2));

      const fetchFn = enableDebugFetch ? debugFetch : fetch;
      const response = await fetchFn(`${this.config.apiBaseUrl}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fullDesignInput)
      });

      if (!response.ok) {
        let errorData: any;
        const contentType = response.headers.get("content-type");
        
        if (contentType && contentType.includes("application/json")) {
          errorData = await response.json().catch(() => ({ error: "Failed to parse error response" }));
        } else {
          const text = await response.text().catch(() => "Unknown error");
          errorData = { error: text };
        }
        
        console.error("Failed to create project - Full error details:", {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          errorData,
          sentData: fullDesignInput,
          url: `${this.config.apiBaseUrl}/projects`
        });
        
        // Provide user-friendly error messages
        if (response.status === 503) {
          throw new Error("データベース接続エラー: データベースに接続できません。管理者にお問い合わせください。");
        } else if (response.status === 400) {
          throw new Error(`入力エラー: ${errorData.details || errorData.error || "必須項目が不足しています"}`);
        } else if (response.status === 404) {
          throw new Error(`APIエンドポイントが見つかりません: ${this.config.apiBaseUrl}/projects`);
        } else if (response.status === 500) {
          throw new Error(`サーバーエラー: ${errorData.details || errorData.error || "内部エラーが発生しました"}`);
        } else {
          throw new Error(`${errorData.details || errorData.error || "プロジェクトの作成に失敗しました"} (Status: ${response.status})`);
        }
      }

      const result = await response.json();
      
      console.log("DataAgent.createProject - Success response:", result);
      
      // Validate response
      if (!result.projectId) {
        console.error("DataAgent.createProject - Invalid response, missing projectId:", result);
        throw new Error("サーバーからプロジェクトIDが返されませんでした");
      }
      
      // キャッシュをクリア
      this.clearCache();
      
      return { 
        projectId: result.projectId, 
        success: true 
      };
    } catch (error) {
      console.error("Error in createProject:", error);
      throw error;
    }
  }

  /**
   * プロジェクトを更新
   */
  private async updateProject(
    projectId: string,
    extractedItems: ExtractedItem[],
    projectInfo: Partial<ExtendedProjectInfo>,
    designInput?: Partial<TankFoundationDesignInput>
  ): Promise<{ projectId: string; success: boolean }> {
    try {
      console.log("DataAgent.updateProject - Input:", {
        projectId,
        hasExtractedItems: !!extractedItems,
        extractedItemsCount: extractedItems?.length || 0,
        hasProjectInfo: !!projectInfo,
        hasDesignInput: !!designInput
      });

      const updates = this.buildDesignInput(extractedItems || [], projectInfo || {}, designInput);

      // Ensure we have valid update data
      if (!updates || Object.keys(updates).length === 0) {
        console.warn("DataAgent.updateProject - No updates to apply");
        return { projectId, success: true };
      }

      console.log("DataAgent.updateProject - Sending update:", JSON.stringify(updates, null, 2));

      const response = await fetch(`${this.config.apiBaseUrl}/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        console.error("Failed to update project:", {
          status: response.status,
          errorData,
          sentData: updates
        });
        throw new Error(errorData.error || "Failed to update project");
      }

      // キャッシュをクリア
      this.clearCache(projectId);
      
      return { projectId, success: true };
    } catch (error) {
      console.error("Error in updateProject:", error);
      throw error;
    }
  }

  /**
   * プロジェクトデータを読み込み
   */
  async loadProjectData(projectId: string): Promise<TankFoundationDesignInput | null> {
    // キャッシュチェック
    const cached = this.getFromCache(`project-${projectId}`);
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(`${this.config.apiBaseUrl}/projects/${projectId}`);
      
      if (!response.ok) {
        throw new Error("Failed to load project");
      }

      const data = await response.json();
      
      // キャッシュに保存
      this.setCache(`project-${projectId}`, data);
      
      return data;
    } catch (error) {
      console.error("Failed to load project data:", error);
      return null;
    }
  }

  /**
   * セッションを保存
   */
  async saveSession(session: ChatSession): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(session)
      });

      return response.ok;
    } catch (error) {
      console.error("Failed to save session:", error);
      // フォールバックとしてlocalStorageに保存
      this.saveSessionToLocalStorage(session);
      return false;
    }
  }

  /**
   * セッション一覧を取得
   */
  async loadSessions(projectId?: string): Promise<ChatSession[]> {
    try {
      const params = projectId ? `?projectId=${projectId}` : "";
      const response = await fetch(`${this.config.apiBaseUrl}/sessions${params}`);
      
      if (!response.ok) {
        throw new Error("Failed to load sessions");
      }

      const data = await response.json();
      return data.sessions;
    } catch (error) {
      console.error("Failed to load sessions:", error);
      // フォールバックとしてlocalStorageから取得
      return this.loadSessionsFromLocalStorage();
    }
  }

  /**
   * 計算実行をリクエスト
   */
  async runCalculation(
    projectId: string,
    designInput: TankFoundationDesignInput
  ): Promise<{ runId: string; success: boolean }> {
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/calc-runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, designInput })
      });

      if (!response.ok) {
        throw new Error("Failed to start calculation");
      }

      const result = await response.json();
      return { 
        runId: result.runId, 
        success: true 
      };
    } catch (error) {
      console.error("Failed to run calculation:", error);
      return { runId: "", success: false };
    }
  }

  /**
   * 計算結果を取得
   */
  async getCalculationResult(runId: string): Promise<any | null> {
    // キャッシュチェック
    const cached = this.getFromCache(`calc-${runId}`);
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(`${this.config.apiBaseUrl}/calc-runs/${runId}`);
      
      if (!response.ok) {
        throw new Error("Failed to get calculation result");
      }

      const data = await response.json();
      
      // 完了していればキャッシュに保存
      if (data.status === "succeeded") {
        this.setCache(`calc-${runId}`, data);
      }
      
      return data;
    } catch (error) {
      console.error("Failed to get calculation result:", error);
      return null;
    }
  }

  /**
   * ExtractedItemsからDesignInputを構築
   */
  private buildDesignInput(
    extractedItems: ExtractedItem[],
    projectInfo: Partial<ExtendedProjectInfo>,
    existingInput?: Partial<TankFoundationDesignInput>
  ): Partial<TankFoundationDesignInput> {
    console.log("DataAgent.buildDesignInput - Input params:", {
      extractedItemsCount: extractedItems?.length || 0,
      projectInfo,
      existingInput,
      extractedItems: extractedItems?.map(item => ({ key: item.key, value: item.value, status: item.status }))
    });

    const input: Partial<TankFoundationDesignInput> = existingInput || {};

    // ProjectInfoから基本情報を設定
    // プロジェクト情報は必須なので、デフォルト値を設定
    const projectName = projectInfo?.projectName || input.project?.name || "新規プロジェクト";
    const createdBy = input.project?.created_by || "system";
    
    input.project = {
      project_id: input.project?.project_id || `TF-${Date.now()}`,
      name: projectName,
      created_by: createdBy,
      ...input.project
    };

    console.log("DataAgent.buildDesignInput - Created project object:", input.project);

    // サイト情報もデフォルト値を設定
    input.site = {
      site_name: projectInfo?.siteName || input.site?.site_name || "未設定",
      location: projectInfo?.siteAddress || input.site?.location || "未設定",
      ...input.site
    };

    // ExtractedItemsから詳細情報を設定
    if (extractedItems && Array.isArray(extractedItems)) {
      extractedItems.forEach(item => {
        if (item.status !== "extracted" && item.status !== "confirmed") return;

        switch (item.category) {
          case "tank":
            this.updateTankInfo(input, item);
            break;
          case "site":
            this.updateSiteInfo(input, item);
            break;
          case "regulation":
            this.updateRegulationInfo(input, item);
            break;
          case "building":
            this.updateBuildingInfo(input, item);
            break;
        }
      });
    }

    console.log("DataAgent.buildDesignInput - Final output:", JSON.stringify(input, null, 2));
    return input;
  }

  /**
   * タンク情報を更新
   */
  private updateTankInfo(
    input: Partial<TankFoundationDesignInput>,
    item: ExtractedItem
  ): void {
    if (!input.tank) {
      input.tank = {} as any;
    }

    switch (item.key) {
      case "tankCapacity":
        input.tank.capacity_kl = parseFloat(item.value || "0");
        break;
      case "tankContent":
        input.tank.content_type = item.value || "";
        break;
      case "tankDiameter":
        input.tank.diameter_m = parseFloat(item.value || "0");
        break;
      case "tankHeight":
        input.tank.height_m = parseFloat(item.value || "0");
        break;
    }
  }

  /**
   * サイト情報を更新
   */
  private updateSiteInfo(
    input: Partial<TankFoundationDesignInput>,
    item: ExtractedItem
  ): void {
    if (!input.site) {
      input.site = {} as any;
    }

    switch (item.key) {
      case "siteArea":
        // サイト面積は別途管理される可能性があるため、ここでは処理しない
        break;
      case "elevation":
        input.site.elevation_gl = parseFloat(item.value || "0");
        break;
    }
  }

  /**
   * 規制情報を更新
   */
  private updateRegulationInfo(
    input: Partial<TankFoundationDesignInput>,
    item: ExtractedItem
  ): void {
    if (!input.regulations) {
      input.regulations = {} as any;
    }

    switch (item.key) {
      case "legalClassification":
        input.regulations.legal_classification = item.value || "";
        break;
      case "appliedCodes":
        // カンマ区切りの文字列を配列に変換
        input.regulations.applied_codes = item.value?.split(",").map(s => s.trim()) || [];
        break;
    }
  }

  /**
   * 建物情報を更新（タンク基礎設計には直接関係ないが、参考情報として保持）
   */
  private updateBuildingInfo(
    input: Partial<TankFoundationDesignInput>,
    item: ExtractedItem
  ): void {
    // 建物情報はui_flagsやメタデータとして保存する可能性がある
    if (!input.ui_flags) {
      input.ui_flags = {};
    }
    
    // 建物情報をメタデータとして保存
    (input.ui_flags as any)[`building_${item.key}`] = item.value;
  }

  /**
   * キャッシュ操作
   */
  private getFromCache(key: string): any | null {
    if (!this.config.enableCache) return null;

    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.config.cacheTimeout!) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any): void {
    if (!this.config.enableCache) return;
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  private clearCache(projectId?: string): void {
    if (projectId) {
      this.cache.delete(`project-${projectId}`);
    } else {
      this.cache.clear();
    }
  }

  /**
   * LocalStorage フォールバック
   */
  private saveSessionToLocalStorage(session: ChatSession): void {
    try {
      const sessions = this.loadSessionsFromLocalStorage();
      const index = sessions.findIndex(s => s.id === session.id);
      
      if (index >= 0) {
        sessions[index] = session;
      } else {
        sessions.push(session);
      }
      
      localStorage.setItem("chatSessions", JSON.stringify(sessions));
    } catch (error) {
      console.error("Failed to save to localStorage:", error);
    }
  }

  private loadSessionsFromLocalStorage(): ChatSession[] {
    try {
      const stored = localStorage.getItem("chatSessions");
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Failed to load from localStorage:", error);
      return [];
    }
  }
}