# Document Generation Studio

Create professional legal documents from templates using natural language input. Fill out a smart questionnaire or describe your document in plain English, then generate Word or PDF output.

Live demo: https://legal-doc-generation-studio.casedev.app

## Features

- **📋 Template Library**: 5 pre-built legal document templates
  - Employment Agreement
  - Mutual Non-Disclosure Agreement (NDA)
  - Independent Contractor Agreement
  - Consulting Services Agreement
  - Residential Lease Agreement

- **✨ Natural Language Input**: Describe your document in plain English and let AI extract the details automatically

- **📝 Smart Questionnaire**: Guided forms with conditional logic that show only relevant questions based on your answers

- **👁️ Live Preview**: See your document rendered in real-time before downloading

- **📥 Multiple Output Formats**: Download as Word (.docx) or PDF

- **🔄 Version Tracking**: Every change creates a new version for audit trails

## Case.dev APIs Used

- **Format API**: Generate professional PDF and Word documents from Markdown templates with variable interpolation
- **LLM API**: Parse natural language input into structured data using GPT-4o

## Quick Start

### 1. Install Dependencies

```bash
cd document-generation-studio
npm install
```

### 2. Configure Environment

Copy the example environment file and add your Case.dev API key:

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
CASEDEV_API_KEY=your_api_key_here
```

Get your API key from [console.case.dev](https://console.case.dev)

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
document-generation-studio/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── templates/          # Template listing and details
│   │   │   ├── documents/          # Document CRUD operations
│   │   │   └── parse/              # Natural language parsing
│   │   ├── generate/[templateId]/  # Document generation wizard
│   │   ├── documents/              # Document list page
│   │   ├── layout.tsx              # App layout
│   │   ├── page.tsx                # Home page with templates
│   │   └── globals.css             # Global styles
│   └── lib/
│       ├── types.ts                # TypeScript types
│       ├── templates.ts            # Template definitions
│       ├── case-api.ts             # Case.dev API client
│       └── document-store.ts       # In-memory document storage
├── .env.example                    # Environment template
├── package.json
└── README.md
```

## API Endpoints

### Templates

- `GET /api/templates` - List all templates
- `GET /api/templates/[templateId]` - Get template details

### Documents

- `GET /api/documents` - List all generated documents
- `POST /api/documents` - Create a new document
- `GET /api/documents/[documentId]` - Get document with version history
- `PATCH /api/documents/[documentId]` - Update document
- `DELETE /api/documents/[documentId]` - Delete document
- `POST /api/documents/[documentId]/generate` - Generate document in specified format

### Natural Language

- `POST /api/parse` - Parse natural language input into template variables

## Template Variables

Templates support various field types with conditional logic:

| Type | Description |
|------|-------------|
| `text` | Single-line text input |
| `textarea` | Multi-line text input |
| `number` | Numeric input |
| `currency` | Currency input with $ prefix |
| `date` | Date picker |
| `select` | Dropdown selection |
| `boolean` | Checkbox toggle |

### Conditional Logic

Fields can be shown/hidden based on other field values:

```typescript
{
  id: 'bonus_percentage',
  name: 'bonus_percentage',
  label: 'Target Bonus (%)',
  type: 'number',
  showIf: {
    field: 'bonus_eligible',
    operator: 'equals',
    value: true
  }
}
```

## Customization

### Adding New Templates

1. Create a new template object in `src/lib/templates.ts`
2. Define sections with variables
3. Write the Markdown template content with `{{variable}}` placeholders
4. Add to the `templates` array export

### Template Content Syntax

```markdown
# Document Title

This agreement is between **{{party_name}}** and **{{other_party}}**.

{{#if include_section}}
## Optional Section
This section only appears if include_section is true.
{{/if}}

**Effective Date:** {{effective_date}}
```

## Future Enhancements

- [ ] Custom template builder UI
- [ ] Clause library for mix-and-match document assembly
- [ ] Collaborative editing with real-time sync
- [ ] E-signature integration
- [ ] Template versioning and management
- [ ] Database persistence (PostgreSQL)
- [ ] User authentication and multi-tenancy

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **APIs**: Case.dev (Format, LLM)

## License

Apache 2.0
