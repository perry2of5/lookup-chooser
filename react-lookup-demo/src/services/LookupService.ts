export type LookupValueType = "text" | "number" | "password";

export interface LookupHint {
  valueType?: LookupValueType;
  categoryAllowList?: string[];
  targetAllowList?: string[];
}

export interface LookupSubTarget {
  id: string;
  label: string;
  valueType: LookupValueType;
  masked: boolean;
}

export interface LookupTarget {
  id: string;
  label: string;
  description: string;
}

export interface LookupCategory {
  id: string;
  label: string;
  icon?: string;
}

export interface LookupResolvedValue {
  value: string;
  lookupPath: string;
}

export interface LookupService {
  getCategories(hint?: LookupHint): Promise<LookupCategory[]>;
  getTargets(categoryId: string, hint?: LookupHint): Promise<LookupTarget[]>;
  getSubTargets(categoryId: string, targetId: string, hint?: LookupHint): Promise<LookupSubTarget[]>;
  resolveValue(categoryId: string, targetId: string, subTargetId: string): Promise<LookupResolvedValue>;
}

export type InputSource = "manual" | "lookup";

export interface LookupInputValue {
  source: InputSource;
  value: string;
  lookupPath?: string;
}
