import { DevelopOption } from '../../debug/DevelopOption';

// パラメータ情報の定義
interface ParameterInfo {
  policyId: string;
  key: string;
  value: any;
  type: 'number' | 'string' | 'boolean' | 'object';
  constraints?: {
    min?: number;
    max?: number;
    allowedValues?: any[];
  };
}

// パラメータ変更結果の定義
interface ParameterUpdateResult {
  success: boolean;
  policyId: string;
  key: string;
  oldValue: any;
  newValue: any;
  message?: string;
  timestamp: Date;
}

// モック用の簡易クラス定義
class MockTuningUI {
  private updateHistory: ParameterUpdateResult[] = [];
  private isActive = false;
  
  constructor(public id: string) {}
  
  async changeParameter(
    policyId: string, 
    key: string, 
    value: any,
    paramService: MockParameterManagementService
  ): Promise<ParameterUpdateResult> {
    this.isActive = true;
    
    try {
      const result = await paramService.setParameter(policyId, key, value);
      this.updateHistory.push(result);
      return result;
    } finally {
      this.isActive = false;
    }
  }
  
  getUpdateHistory(): readonly ParameterUpdateResult[] {
    return this.updateHistory;
  }
  
  getLastUpdate(): ParameterUpdateResult | null {
    return this.updateHistory.length > 0 
      ? this.updateHistory[this.updateHistory.length - 1]
      : null;
  }
  
  isActiveOperation(): boolean {
    return this.isActive;
  }
  
  getTotalUpdateCount(): number {
    return this.updateHistory.length;
  }
  
  getSuccessfulUpdateCount(): number {
    return this.updateHistory.filter(update => update.success).length;
  }
  
  clear(): void {
    this.updateHistory = [];
    this.isActive = false;
  }
}

class MockParameterManagementService {
  private registeredPolicies = new Map<string, MockAdaptablePolicy>();
  private operationCount = 0;
  private updateHistory: ParameterUpdateResult[] = [];
  private isServiceEnabled = true;
  
  constructor(public id: string) {}
  
  registerPolicy(policy: MockAdaptablePolicy): void {
    this.registeredPolicies.set(policy.id, policy);
  }
  
  async setParameter(policyId: string, key: string, value: any): Promise<ParameterUpdateResult> {
    this.operationCount++;
    
    if (!this.isServiceEnabled) {
      const result = {
        success: false,
        policyId,
        key,
        oldValue: null,
        newValue: value,
        message: 'Parameter management service is disabled',
        timestamp: new Date()
      };
      this.updateHistory.push(result);
      return result;
    }
    
    const policy = this.registeredPolicies.get(policyId);
    if (!policy) {
      const result = {
        success: false,
        policyId,
        key,
        oldValue: null,
        newValue: value,
        message: `Policy ${policyId} not found`,
        timestamp: new Date()
      };
      this.updateHistory.push(result);
      return result;
    }
    
    const oldValue = policy.getParameter(key);
    const updateSuccess = policy.updateParameter(key, value);
    
    const result = {
      success: updateSuccess,
      policyId,
      key,
      oldValue,
      newValue: updateSuccess ? value : oldValue,
      message: updateSuccess ? 'Parameter updated successfully' : 'Parameter update failed',
      timestamp: new Date()
    };
    
    this.updateHistory.push(result);
    return result;
  }
  
  getParameter(policyId: string, key: string): any {
    const policy = this.registeredPolicies.get(policyId);
    return policy ? policy.getParameter(key) : null;
  }
  
  getAllParameters(policyId: string): Record<string, any> | null {
    const policy = this.registeredPolicies.get(policyId);
    return policy ? policy.getAllParameters() : null;
  }
  
  getRegisteredPolicyIds(): string[] {
    return Array.from(this.registeredPolicies.keys());
  }
  
  getOperationCount(): number {
    return this.operationCount;
  }
  
  getUpdateHistory(): readonly ParameterUpdateResult[] {
    return this.updateHistory;
  }
  
  getSuccessfulUpdates(): ParameterUpdateResult[] {
    return this.updateHistory.filter(update => update.success);
  }
  
  getFailedUpdates(): ParameterUpdateResult[] {
    return this.updateHistory.filter(update => !update.success);
  }
  
  enableService(): void {
    this.isServiceEnabled = true;
  }
  
  disableService(): void {
    this.isServiceEnabled = false;
  }
  
  isEnabled(): boolean {
    return this.isServiceEnabled;
  }
  
  unregisterPolicy(policyId: string): boolean {
    return this.registeredPolicies.delete(policyId);
  }
  
  reset(): void {
    this.operationCount = 0;
    this.updateHistory = [];
  }
}

class MockAdaptablePolicy {
  private parameters = new Map<string, any>();
  private updateCount = 0;
  private lastUpdateTime: Date | null = null;
  
  constructor(
    public id: string,
    initialParameters: Record<string, any> = {}
  ) {
    Object.entries(initialParameters).forEach(([key, value]) => {
      this.parameters.set(key, value);
    });
  }
  
  updateParameter(key: string, value: any): boolean {
    // バリデーションをシミュレート
    if (!this.validateParameter(key, value)) {
      return false;
    }
    
    this.parameters.set(key, value);
    this.updateCount++;
    this.lastUpdateTime = new Date();
    return true;
  }
  
  private validateParameter(key: string, value: any): boolean {
    // 簡単なバリデーションロジック
    if (key.toLowerCase().includes('rate') && (typeof value !== 'number' || value < 0 || value > 1)) {
      return false;
    }
    
    if (key.toLowerCase().includes('threshold') && (typeof value !== 'number' || value < 0)) {
      return false;
    }
    
    if (key.toLowerCase().includes('enabled') && typeof value !== 'boolean') {
      return false;
    }
    
    return true;
  }
  
  getParameter(key: string): any {
    return this.parameters.get(key);
  }
  
  getAllParameters(): Record<string, any> {
    const result: Record<string, any> = {};
    this.parameters.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
  
  getUpdateCount(): number {
    return this.updateCount;
  }
  
  getLastUpdateTime(): Date | null {
    return this.lastUpdateTime;
  }
  
  hasParameter(key: string): boolean {
    return this.parameters.has(key);
  }
  
  reset(): void {
    this.updateCount = 0;
    this.lastUpdateTime = null;
  }
}

// 運用者のシミュレータ
class MockOperator {
  constructor(public id: string) {}
  
  async requestParameterChange(
    ui: MockTuningUI,
    policyId: string,
    key: string,
    value: any,
    paramService: MockParameterManagementService
  ): Promise<ParameterUpdateResult> {
    // 運用者がUIを通じてパラメータ変更を要求
    return await ui.changeParameter(policyId, key, value, paramService);
  }
}

describe('SD-27: パラメータ調整UI', () => {
  let operator: MockOperator;
  let tuningUI: MockTuningUI;
  let paramService: MockParameterManagementService;
  let adaptablePolicy: MockAdaptablePolicy;

  beforeEach(() => {
    operator = new MockOperator('operator-01');
    tuningUI = new MockTuningUI('tuning-ui-01');
    paramService = new MockParameterManagementService('param-service-01');
    adaptablePolicy = new MockAdaptablePolicy('policy-01', {
      learningRate: 0.01,
      threshold: 0.5,
      enabled: true,
      maxIterations: 1000
    });
    
    paramService.registerPolicy(adaptablePolicy);
  });

  afterEach(() => {
    tuningUI.clear();
    paramService.reset();
    adaptablePolicy.reset();
  });

  // === SD-27シーケンス図対応テストケース ===

  describe('UI パラメータ変更処理', () => {
    (DevelopOption.isExecute_SD_27_ui_parameter_change ? test : test.skip)('正常系：運用者によるパラメータ変更指示とUI処理', async () => {
      // シーケンス図 19-22行目: Operator -> UI: パラメータ変更を指示 -> ParamService: setParameter
      
      expect(adaptablePolicy.getParameter('learningRate')).toBe(0.01);
      expect(tuningUI.getTotalUpdateCount()).toBe(0);
      
      const result = await operator.requestParameterChange(
        tuningUI,
        'policy-01',
        'learningRate',
        0.05,
        paramService
      );
      
      expect(result.success).toBe(true);
      expect(result.policyId).toBe('policy-01');
      expect(result.key).toBe('learningRate');
      expect(result.oldValue).toBe(0.01);
      expect(result.newValue).toBe(0.05);
      
      expect(tuningUI.getTotalUpdateCount()).toBe(1);
      expect(tuningUI.getSuccessfulUpdateCount()).toBe(1);
      
      const lastUpdate = tuningUI.getLastUpdate();
      expect(lastUpdate?.success).toBe(true);
      expect(lastUpdate?.newValue).toBe(0.05);
    });
  });

  describe('パラメータサービス管理処理', () => {
    (DevelopOption.isExecute_SD_27_service_management ? test : test.skip)('正常系：パラメータ管理サービスによる設定変更と応答', async () => {
      // シーケンス図 22-30行目: ParamService: setParameter -> TargetPolicy: 更新 -> 成功応答
      
      expect(paramService.getOperationCount()).toBe(0);
      expect(adaptablePolicy.getUpdateCount()).toBe(0);
      
      const result = await paramService.setParameter('policy-01', 'threshold', 0.8);
      
      expect(result.success).toBe(true);
      expect(result.oldValue).toBe(0.5);
      expect(result.newValue).toBe(0.8);
      
      expect(paramService.getOperationCount()).toBe(1);
      expect(adaptablePolicy.getUpdateCount()).toBe(1);
      expect(adaptablePolicy.getParameter('threshold')).toBe(0.8);
      
      // 無効なポリシーIDでのテスト
      const invalidResult = await paramService.setParameter('invalid-policy', 'someKey', 'someValue');
      expect(invalidResult.success).toBe(false);
      expect(invalidResult.message).toContain('not found');
    });
  });

  describe('ポリシー更新処理', () => {
    (DevelopOption.isExecute_SD_27_policy_update ? test : test.skip)('正常系：適応可能ポリシーの内部パラメータ更新', () => {
      // シーケンス図 25-27行目: TargetPolicy: 更新(キー, 値) -> 内部パラメータを更新
      
      const initialParams = adaptablePolicy.getAllParameters();
      expect(initialParams.enabled).toBe(true);
      expect(initialParams.maxIterations).toBe(1000);
      
      const beforeUpdateTime = adaptablePolicy.getLastUpdateTime();
      const updateSuccess = adaptablePolicy.updateParameter('enabled', false);
      
      expect(updateSuccess).toBe(true);
      expect(adaptablePolicy.getParameter('enabled')).toBe(false);
      expect(adaptablePolicy.getUpdateCount()).toBe(1);
      expect(adaptablePolicy.getLastUpdateTime()).not.toBe(beforeUpdateTime);
      
      // バリデーションエラーのテスト
      const invalidUpdate = adaptablePolicy.updateParameter('learningRate', -0.5); // 負の値は無効
      expect(invalidUpdate).toBe(false);
      expect(adaptablePolicy.getParameter('learningRate')).toBe(0.01); // 変更されていない
      
      // 複数パラメータの更新
      adaptablePolicy.updateParameter('maxIterations', 2000);
      adaptablePolicy.updateParameter('threshold', 0.75);
      
      expect(adaptablePolicy.getUpdateCount()).toBe(3); // enabled, maxIterations, threshold
      
      const updatedParams = adaptablePolicy.getAllParameters();
      expect(updatedParams.enabled).toBe(false);
      expect(updatedParams.maxIterations).toBe(2000);
      expect(updatedParams.threshold).toBe(0.75);
      expect(updatedParams.learningRate).toBe(0.01); // 無効な更新により変更されなかった
    });
  });
});