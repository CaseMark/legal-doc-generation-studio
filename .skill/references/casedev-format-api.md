# Case.dev Format API Reference

Patterns for generating documents using Case.dev Format API.

## Overview

The Format API converts Markdown templates with variable interpolation into professional PDF and Word documents.

## Base Configuration

```typescript
// lib/case-api.ts
const BASE_URL = 'https://api.case.dev/v1';
const API_KEY = process.env.CASEDEV_API_KEY;

async function casedevFetch(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    throw new Error(`Format API error: ${response.statusText}`);
  }
  
  return response;
}
```

## Generate Document

### Request
```typescript
interface GenerateDocumentRequest {
  template: string;  // Markdown with {{variables}}
  variables: Record<string, any>;
  format: 'pdf' | 'docx';
  options?: {
    page_size?: 'letter' | 'a4';
    margins?: { top: string; bottom: string; left: string; right: string };
    header?: string;
    footer?: string;
    font_family?: string;
    font_size?: number;
  };
}

async function generateDocument(
  template: string,
  variables: Record<string, any>,
  format: 'pdf' | 'docx'
): Promise<Blob> {
  const response = await casedevFetch('/format/generate', {
    method: 'POST',
    body: JSON.stringify({
      template,
      variables,
      format,
      options: {
        page_size: 'letter',
        margins: { top: '1in', bottom: '1in', left: '1in', right: '1in' },
      },
    }),
  });
  
  return response.blob();
}
```

### Response
Returns binary blob of the generated document.

```typescript
// Usage in API route
export async function POST(request: NextRequest) {
  const { templateId, variables, format } = await request.json();
  
  const template = getTemplate(templateId);
  const blob = await generateDocument(template.content, variables, format);
  
  return new Response(blob, {
    headers: {
      'Content-Type': format === 'pdf' 
        ? 'application/pdf' 
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${template.name}.${format}"`,
    },
  });
}
```

## Template Syntax

### Variable Interpolation
```markdown
# Employment Agreement

This Employment Agreement ("Agreement") is entered into between 
**{{employer_name}}** ("Employer") and **{{employee_name}}** ("Employee").

**Position:** {{job_title}}
**Start Date:** {{start_date}}
**Salary:** ${{salary}} per year
```

### Conditional Sections
```markdown
{{#if bonus_eligible}}
## Bonus Compensation

Employee shall be eligible for an annual performance bonus of up to 
{{bonus_percentage}}% of base salary, subject to performance criteria.
{{/if}}
```

### Conditional with Else
```markdown
{{#if is_exempt}}
Employee is classified as exempt and not entitled to overtime pay.
{{else}}
Employee is classified as non-exempt and entitled to overtime pay at 1.5x.
{{/if}}
```

### Loops
```markdown
## Responsibilities

{{#each responsibilities}}
- {{this}}
{{/each}}
```

### Nested Objects
```markdown
**Primary Contact:** {{contact.name}} ({{contact.email}})
```

## Formatting Options

### Page Settings
```typescript
const options = {
  page_size: 'letter',  // 'letter' | 'a4' | 'legal'
  orientation: 'portrait',  // 'portrait' | 'landscape'
  margins: {
    top: '1in',
    bottom: '1in',
    left: '1.25in',
    right: '1.25in',
  },
};
```

### Typography
```typescript
const options = {
  font_family: 'Times New Roman',  // Legal standard
  font_size: 12,
  line_height: 1.5,
};
```

### Headers and Footers
```typescript
const options = {
  header: '{{document_title}} | CONFIDENTIAL',
  footer: 'Page {{page}} of {{pages}}',
  header_height: '0.5in',
  footer_height: '0.5in',
};
```

## Natural Language Parsing

### Parse Input to Variables
```typescript
interface ParseRequest {
  input: string;  // Natural language description
  schema: TemplateVariable[];  // Expected variables
}

interface ParseResponse {
  variables: Record<string, any>;
  confidence: number;
  missing_fields: string[];
}

async function parseNaturalLanguage(
  input: string,
  schema: TemplateVariable[]
): Promise<ParseResponse> {
  return casedevFetch('/llm/parse', {
    method: 'POST',
    body: JSON.stringify({
      input,
      schema,
      instructions: `Extract the following fields from the user's description. 
                     If a field is not mentioned, leave it null.`,
    }),
  }).then(r => r.json());
}
```

### Usage Example
```typescript
const input = "Create an NDA between Acme Corp and John Smith, effective January 1, 2025, lasting 2 years";

const schema = [
  { id: 'party1', type: 'text' },
  { id: 'party2', type: 'text' },
  { id: 'effective_date', type: 'date' },
  { id: 'term_years', type: 'number' },
];

const result = await parseNaturalLanguage(input, schema);
// {
//   variables: {
//     party1: "Acme Corp",
//     party2: "John Smith",
//     effective_date: "2025-01-01",
//     term_years: 2
//   },
//   confidence: 0.95,
//   missing_fields: []
// }
```

## Error Handling

```typescript
class FormatAPIError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
  }
}

const ERROR_CODES = {
  INVALID_TEMPLATE: 'template_syntax_error',
  MISSING_VARIABLE: 'required_variable_missing',
  UNSUPPORTED_FORMAT: 'format_not_supported',
  TEMPLATE_TOO_LARGE: 'template_exceeds_limit',
  GENERATION_FAILED: 'document_generation_failed',
} as const;
```

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| Generate PDF | 30 | per minute |
| Generate DOCX | 30 | per minute |
| Parse NL | 60 | per minute |

## Best Practices

1. **Validate variables** before sending to API
2. **Cache templates** - don't re-fetch on every generation
3. **Preview first** - render Markdown before PDF generation
4. **Handle missing fields** - show form for incomplete NL parsing
5. **Use consistent naming** - match variable IDs to template placeholders exactly
