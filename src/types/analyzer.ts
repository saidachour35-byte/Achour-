export type BugSeverity = 'critical' | 'warning' | 'suggestion';

export interface BugItem {
  id: string;
  title: string;
  severity: BugSeverity;
  line?: number;
  description: string;
  originalSnippet?: string;
  fixedSnippet?: string;
  category?: 'syntax' | 'react' | 'async' | 'css' | 'performance' | 'security' | 'logic';
}

export interface AnalysisResult {
  summary: string;
  score: number;
  language: string;
  bugs: BugItem[];
  fixedCode: string;
  recommendations: string[];
  isAiPowered?: boolean;
}

export interface CodeFile {
  name: string;
  content: string;
  language: string;
  size: number;
}

export interface ConsoleMessage {
  id: string;
  type: 'log' | 'error' | 'warn' | 'info';
  message: string;
  timestamp: string;
  count?: number;
}

export interface PresetSample {
  id: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  filename: string;
  language: string;
  code: string;
}
