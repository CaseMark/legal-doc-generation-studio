# Legal Doc Generation Studio Skill

Agent skill for developing the legal-doc-generation-studio application.

## Directory Structure

```
.skill/
├── SKILL.md                        # Core skill (always read first)
└── references/
    ├── casedev-format-api.md       # Case.dev Format/LLM APIs
    └── template-system.md          # Template definition patterns
```

---

## File Descriptions

### SKILL.md
**Purpose**: Primary entry point for the skill

**Contains**:
- Application architecture overview
- Tech stack (Next.js 15, Case.dev Format/LLM APIs)
- Core workflow (select → fill → preview → generate)
- Built-in template list
- Variable types and conditional logic overview
- API endpoint reference

**When loaded**: Queries about legal-doc-generation-studio, document templates, PDF/Word generation

**Size**: ~140 lines

---

### references/casedev-format-api.md
**Purpose**: Case.dev Format and LLM API integration

**Contains**:
- Generate document endpoint (PDF/DOCX)
- Template syntax (variables, conditionals, loops)
- Page settings and typography options
- Natural language parsing API
- Error handling

**When to read**: Document generation, format options, NL parsing

**Size**: ~180 lines

---

### references/template-system.md
**Purpose**: Template definition and conditional logic

**Contains**:
- Template and variable type definitions
- Complete template example (Employment Agreement)
- Conditional logic rules and evaluation
- Form component patterns
- Validation rules
- Template content interpolation
- Version tracking

**When to read**: Creating templates, conditional forms, validation

**Size**: ~200 lines

---

## Trigger Examples

| Query | Loads |
|-------|-------|
| "Add a new template for purchase agreement" | SKILL.md + template-system.md |
| "Fix PDF formatting issues" | SKILL.md + casedev-format-api.md |
| "Add conditional field for overtime" | SKILL.md + template-system.md |
| "Improve NL parsing accuracy" | SKILL.md + casedev-format-api.md |
