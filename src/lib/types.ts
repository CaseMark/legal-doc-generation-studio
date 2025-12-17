// Template Types
export interface TemplateVariable {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'currency' | 'boolean';
  required: boolean;
  placeholder?: string;
  description?: string;
  defaultValue?: string | number | boolean;
  options?: { value: string; label: string }[]; // For select type
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  // Conditional logic
  showIf?: {
    field: string;
    operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan';
    value: string | number | boolean;
  };
}

export interface TemplateSection {
  id: string;
  title: string;
  description?: string;
  variables: TemplateVariable[];
  // Conditional logic for entire section
  showIf?: {
    field: string;
    operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan';
    value: string | number | boolean;
  };
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  category: 'employment' | 'nda' | 'services' | 'lease' | 'general';
  icon: string;
  sections: TemplateSection[];
  content: string; // Markdown template with {{variable}} placeholders
  version: string;
  createdAt: string;
  updatedAt: string;
}

// Document Generation Types
export interface GeneratedDocument {
  id: string;
  templateId: string;
  templateName: string;
  variables: Record<string, string | number | boolean>;
  status: 'draft' | 'generating' | 'completed' | 'error';
  previewHtml?: string;
  pdfUrl?: string;
  docxUrl?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  variables: Record<string, string | number | boolean>;
  createdAt: string;
  createdBy?: string;
}

// API Response Types
export interface FormatResponse {
  content: string;
  format: 'pdf' | 'docx' | 'html_preview';
  url?: string;
}

export interface LLMParseResponse {
  variables: Record<string, string | number | boolean>;
  confidence: number;
  suggestions?: string[];
}

// Form State Types
export interface QuestionnaireState {
  currentSection: number;
  values: Record<string, string | number | boolean>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
}

// Natural Language Input Types
export interface NaturalLanguageInput {
  text: string;
  templateId: string;
}

export interface ParsedInput {
  variables: Record<string, string | number | boolean>;
  unmatchedText?: string;
  confidence: number;
}
