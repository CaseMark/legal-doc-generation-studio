// Case.dev API Client for Document Generation Studio

const CASE_API_BASE = 'https://api.case.dev';

function getApiKey(): string {
  const apiKey = process.env.CASEDEV_API_KEY;
  if (!apiKey) {
    throw new Error('CASEDEV_API_KEY environment variable is not set');
  }
  return apiKey;
}

// Format API - Document Generation
export interface FormatDocumentOptions {
  content: string;
  inputFormat: 'md' | 'text' | 'json';
  outputFormat: 'pdf' | 'docx' | 'html_preview';
  variables?: Record<string, string | number | boolean>;
  template?: 'standard' | 'pleading';
  header?: string;
  footer?: string;
  margins?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
}

export interface FormatDocumentResponse {
  content?: string; // Base64 for PDF/DOCX, HTML string for preview
  url?: string;
  format: string;
}

export async function formatDocument(options: FormatDocumentOptions): Promise<FormatDocumentResponse> {
  const response = await fetch(`${CASE_API_BASE}/format/v1/document`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: options.content,
      input_format: options.inputFormat,
      output_format: options.outputFormat,
      options: {
        template: options.template,
        header: options.header,
        footer: options.footer,
        margins: options.margins,
        components: options.variables ? [{
          variables: options.variables
        }] : undefined
      }
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Format API error: ${response.status} - ${error}`);
  }

  // For PDF and DOCX, the response is binary
  if (options.outputFormat === 'pdf' || options.outputFormat === 'docx') {
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return {
      content: base64,
      format: options.outputFormat
    };
  }

  // For HTML preview, return the text
  const html = await response.text();
  return {
    content: html,
    format: 'html_preview'
  };
}

// LLM API - Natural Language Processing
export interface LLMChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMChatOptions {
  messages: LLMChatMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMChatResponse {
  id: string;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cost: number;
  };
}

export async function chatCompletion(options: LLMChatOptions): Promise<LLMChatResponse> {
  const response = await fetch(`${CASE_API_BASE}/llm/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: options.messages,
      model: options.model || 'openai/gpt-4o',
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature ?? 0,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LLM API error: ${response.status} - ${error}`);
  }

  return response.json();
}

// Parse natural language input into structured variables
export interface ParsedVariables {
  variables: Record<string, string | number | boolean>;
  confidence: number;
  suggestions?: string[];
}

export async function parseNaturalLanguageInput(
  input: string,
  templateVariables: { name: string; label: string; type: string; description?: string }[]
): Promise<ParsedVariables> {
  const variableDescriptions = templateVariables.map(v => 
    `- ${v.name} (${v.type}): ${v.label}${v.description ? ` - ${v.description}` : ''}`
  ).join('\n');

  const systemPrompt = `You are a legal document assistant that extracts structured data from natural language input.

Given a user's description, extract values for the following template variables:
${variableDescriptions}

Return a JSON object with:
1. "variables": An object mapping variable names to their extracted values
2. "confidence": A number from 0 to 1 indicating how confident you are in the extraction
3. "suggestions": An array of strings suggesting what additional information might be needed

Rules:
- Only include variables that you can confidently extract from the input
- For dates, use ISO format (YYYY-MM-DD)
- For currency/numbers, extract just the numeric value
- For boolean fields, infer true/false from context
- If a value is ambiguous, don't include it and add a suggestion instead

Return ONLY valid JSON, no other text.`;

  const response = await chatCompletion({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: input }
    ],
    model: 'openai/gpt-4o',
    temperature: 0
  });

  const content = response.choices[0]?.message?.content || '{}';
  
  try {
    // Try to parse the JSON response
    const parsed = JSON.parse(content);
    return {
      variables: parsed.variables || {},
      confidence: parsed.confidence || 0,
      suggestions: parsed.suggestions || []
    };
  } catch {
    // If parsing fails, return empty result
    return {
      variables: {},
      confidence: 0,
      suggestions: ['Could not parse the input. Please try again with more specific details.']
    };
  }
}

// Process template content with variables
export function processTemplateContent(
  content: string,
  variables: Record<string, string | number | boolean>
): string {
  let processed = content;

  // Replace simple variables: {{variable_name}}
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    processed = processed.replace(regex, String(value));
  }

  // Handle conditional blocks: {{#if variable}}...{{/if}}
  // This is a simplified implementation - for production, use a proper template engine
  const conditionalRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  processed = processed.replace(conditionalRegex, (match, varName, content) => {
    const value = variables[varName];
    // Check for boolean true or truthy string values
    if (value === true || value === 'true' || (typeof value === 'string' && value.length > 0) || (typeof value === 'number' && value > 0)) {
      return content;
    }
    return '';
  });

  // Handle conditional blocks with value check: {{#if variable_value}}...{{/if}}
  // e.g., {{#if work_location_remote}} for when work_location === 'remote'
  const valueConditionalRegex = /\{\{#if\s+(\w+)_(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  processed = processed.replace(valueConditionalRegex, (match, varName, expectedValue, content) => {
    const actualValue = variables[varName];
    if (String(actualValue) === expectedValue) {
      return content;
    }
    return '';
  });

  // Handle else blocks: {{#if variable}}...{{else}}...{{/if}}
  const elseRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g;
  processed = processed.replace(elseRegex, (match, varName, ifContent, elseContent) => {
    const value = variables[varName];
    if (value === true || value === 'true' || (typeof value === 'string' && value.length > 0) || (typeof value === 'number' && value > 0)) {
      return ifContent;
    }
    return elseContent;
  });

  // Clean up any remaining unprocessed variables (replace with empty string)
  processed = processed.replace(/\{\{[^}]+\}\}/g, '');

  return processed;
}

// Format currency values
export function formatCurrency(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
}

// Format date values
export function formatDate(value: string): string {
  const date = new Date(value);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
