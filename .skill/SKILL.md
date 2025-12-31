---
name: legal-doc-generation-studio
description: |
  Development skill for CaseMark's Legal Document Generation Studio - a template-based 
  document generator with natural language input, smart questionnaires, conditional 
  logic, and Word/PDF output. Built with Next.js 15 and Case.dev APIs (Format, LLM). 
  Use this skill when: (1) Working on the legal-doc-generation-studio codebase, 
  (2) Adding or modifying document templates, (3) Implementing conditional form logic, 
  (4) Integrating Case.dev Format/LLM APIs, or (5) Building document preview/export features.
---

# Legal Doc Generation Studio Development Guide

A template-based legal document generator with natural language input, smart questionnaires with conditional logic, live preview, and Word/PDF export.

**Live site**: https://legal-doc-generation-studio.casedev.app

## Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── templates/              # Template listing/details
│   │   ├── documents/              # Document CRUD
│   │   │   └── [id]/
│   │   │       └── generate/       # PDF/Word generation
│   │   └── parse/                  # Natural language parsing
│   ├── generate/[templateId]/      # Generation wizard
│   ├── documents/                  # Document list page
│   └── page.tsx                    # Home with template gallery
└── lib/
    ├── types.ts                    # TypeScript types
    ├── templates.ts                # Template definitions
    ├── case-api.ts                 # Case.dev API client
    └── document-store.ts           # In-memory storage (demo)
```

## Core Workflow

```
Select Template → Fill Form or NL Input → Preview → Generate → Download
       ↓                  ↓                  ↓          ↓          ↓
  Employment,      Questionnaire or     Live MD      Case.dev    .docx
  NDA, Lease,      "Draft an NDA        render       Format      or .pdf
  Contractor...    between X and Y"                  API
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React, Tailwind CSS |
| Backend | Next.js API Routes |
| Document Generation | Case.dev Format API |
| NL Parsing | Case.dev LLM API |
| Storage | In-memory (demo) |

## Key Features

| Feature | Description |
|---------|-------------|
| Template Library | 5 pre-built legal document templates |
| Natural Language | Describe document in plain English |
| Smart Questionnaire | Conditional logic shows relevant fields |
| Live Preview | Real-time document rendering |
| Multi-Format Export | Word (.docx) and PDF output |
| Version Tracking | Audit trail for changes |

## Built-in Templates

| Template | Use Case |
|----------|----------|
| Employment Agreement | Hire employees |
| Mutual NDA | Confidentiality between parties |
| Independent Contractor | Contractor engagements |
| Consulting Services | Consulting arrangements |
| Residential Lease | Property rental |

## Case.dev Integration

See [references/casedev-format-api.md](references/casedev-format-api.md) for API patterns.

### Format API
```typescript
// Generate PDF from Markdown template
const pdf = await generateDocument(template, variables, 'pdf');

// Generate Word document
const docx = await generateDocument(template, variables, 'docx');
```

### LLM API (Natural Language Parsing)
```typescript
// Parse "Draft NDA between Acme Corp and John Smith"
const variables = await parseNaturalLanguage(input, templateSchema);
// Returns: { party1: "Acme Corp", party2: "John Smith", ... }
```

## Template System

See [references/template-system.md](references/template-system.md) for full documentation.

### Variable Types
| Type | Description |
|------|-------------|
| text | Single-line text |
| textarea | Multi-line text |
| number | Numeric input |
| currency | Money with $ prefix |
| date | Date picker |
| select | Dropdown options |
| boolean | Checkbox toggle |

### Conditional Logic
```typescript
{
  id: 'bonus_percentage',
  label: 'Target Bonus (%)',
  type: 'number',
  showIf: {
    field: 'bonus_eligible',
    operator: 'equals',
    value: true
  }
}
```

## Development

### Setup
```bash
npm install
cp .env.example .env.local
# Add CASEDEV_API_KEY
npm run dev
```

### Environment
```
CASEDEV_API_KEY=sk_case_...    # Case.dev API key
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/templates | List templates |
| GET | /api/templates/[id] | Template details |
| GET | /api/documents | List documents |
| POST | /api/documents | Create document |
| PATCH | /api/documents/[id] | Update document |
| DELETE | /api/documents/[id] | Delete document |
| POST | /api/documents/[id]/generate | Generate PDF/Word |
| POST | /api/parse | Parse natural language |

## Common Tasks

### Adding a New Template
1. Create template object in `lib/templates.ts`
2. Define sections with variables
3. Write Markdown template with `{{variable}}` placeholders
4. Export in templates array

### Template Markdown Syntax
```markdown
# {{document_title}}

This agreement between **{{party1}}** and **{{party2}}**.

{{#if include_arbitration}}
## Arbitration Clause
Disputes resolved by binding arbitration.
{{/if}}

**Effective Date:** {{effective_date}}
```

### Adding Conditional Fields
```typescript
{
  id: 'termination_notice_days',
  label: 'Termination Notice Period (days)',
  type: 'number',
  showIf: {
    field: 'agreement_type',
    operator: 'in',
    value: ['employment', 'contractor']
  }
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Template not rendering | Check variable names match template |
| Conditional field stuck | Verify showIf logic and field types |
| PDF generation fails | Check API key, verify template valid |
| NL parsing wrong values | Improve prompt, add examples |
