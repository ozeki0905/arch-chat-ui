import { DataAgent } from '../DataAgent';
import { ExtractedItem } from '@/types/extraction';
import { ExtendedProjectInfo } from '@/types/projectData';

describe('DataAgent', () => {
  let dataAgent: DataAgent;

  beforeEach(() => {
    dataAgent = new DataAgent({
      apiBaseUrl: '/api',
      enableCache: false
    });
  });

  describe('buildDesignInput', () => {
    it('should create project with default values when no data is provided', () => {
      // Access private method for testing
      const buildDesignInput = (dataAgent as any).buildDesignInput.bind(dataAgent);
      
      const result = buildDesignInput([], {}, undefined);
      
      expect(result.project).toBeDefined();
      expect(result.project.name).toBe('新規プロジェクト');
      expect(result.project.created_by).toBe('system');
      expect(result.project.project_id).toMatch(/^TF-\d+$/);
    });

    it('should use projectInfo when provided', () => {
      const buildDesignInput = (dataAgent as any).buildDesignInput.bind(dataAgent);
      
      const projectInfo: Partial<ExtendedProjectInfo> = {
        projectName: 'テストプロジェクト',
        siteName: 'テストサイト',
        siteAddress: '東京都千代田区'
      };
      
      const result = buildDesignInput([], projectInfo, undefined);
      
      expect(result.project.name).toBe('テストプロジェクト');
      expect(result.site.site_name).toBe('テストサイト');
      expect(result.site.location).toBe('東京都千代田区');
    });

    it('should process extracted items correctly', () => {
      const buildDesignInput = (dataAgent as any).buildDesignInput.bind(dataAgent);
      
      const extractedItems: ExtractedItem[] = [
        {
          id: '1',
          category: 'tank',
          key: 'tankCapacity',
          label: 'タンク容量',
          value: '1000',
          confidence: 0.9,
          source: 'user',
          status: 'confirmed',
          required: true
        },
        {
          id: '2',
          category: 'tank',
          key: 'tankContent',
          label: '内容物',
          value: 'ガソリン',
          confidence: 0.9,
          source: 'user',
          status: 'confirmed',
          required: true
        }
      ];
      
      const result = buildDesignInput(extractedItems, {}, undefined);
      
      expect(result.tank).toBeDefined();
      expect(result.tank.capacity_kl).toBe(1000);
      expect(result.tank.content_type).toBe('ガソリン');
    });
  });

  describe('saveProjectData', () => {
    it('should handle empty inputs gracefully', async () => {
      // Mock fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ projectId: 'test-id', projectName: '新規プロジェクト' })
      });

      const result = await dataAgent.saveProjectData(
        null,
        [],
        {},
        undefined
      );

      expect(result.success).toBe(true);
      expect(result.projectId).toBe('test-id');
      
      // Verify the request was made with proper defaults
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/projects',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"name":"新規プロジェクト"')
        })
      );
    });
  });
});