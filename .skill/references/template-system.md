# Template System Reference

Patterns for creating and managing document templates with conditional logic.

## Template Structure

```typescript
// lib/types.ts
interface Template {
  id: string;
  name: string;
  description: string;
  category: 'employment' | 'corporate' | 'real-estate' | 'general';
  sections: TemplateSection[];
  content: string;  // Markdown template
}

interface TemplateSection {
  id: string;
  title: string;
  description?: string;
  variables: TemplateVariable[];
}

interface TemplateVariable {
  id: string;
  name: string;  // Display name
  label: string;
  type: VariableType;
  required?: boolean;
  default?: any;
  placeholder?: string;
  helpText?: string;
  options?: SelectOption[];  // For select type
  showIf?: ConditionalRule;
  validation?: ValidationRule;
}

type VariableType = 
  | 'text' 
  | 'textarea' 
  | 'number' 
  | 'currency' 
  | 'date' 
  | 'select' 
  | 'boolean';
```

## Creating a Template

### Example: Employment Agreement
```typescript
// lib/templates.ts
export const employmentAgreement: Template = {
  id: 'employment-agreement',
  name: 'Employment Agreement',
  description: 'Standard employment contract for full-time employees',
  category: 'employment',
  sections: [
    {
      id: 'parties',
      title: 'Parties',
      variables: [
        {
          id: 'employer_name',
          name: 'employer_name',
          label: 'Employer Name',
          type: 'text',
          required: true,
          placeholder: 'Acme Corporation',
        },
        {
          id: 'employee_name',
          name: 'employee_name',
          label: 'Employee Name',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      id: 'position',
      title: 'Position Details',
      variables: [
        {
          id: 'job_title',
          name: 'job_title',
          label: 'Job Title',
          type: 'text',
          required: true,
        },
        {
          id: 'department',
          name: 'department',
          label: 'Department',
          type: 'text',
        },
        {
          id: 'start_date',
          name: 'start_date',
          label: 'Start Date',
          type: 'date',
          required: true,
        },
      ],
    },
    {
      id: 'compensation',
      title: 'Compensation',
      variables: [
        {
          id: 'salary',
          name: 'salary',
          label: 'Annual Salary',
          type: 'currency',
          required: true,
        },
        {
          id: 'bonus_eligible',
          name: 'bonus_eligible',
          label: 'Eligible for Bonus?',
          type: 'boolean',
          default: false,
        },
        {
          id: 'bonus_percentage',
          name: 'bonus_percentage',
          label: 'Target Bonus (%)',
          type: 'number',
          showIf: {
            field: 'bonus_eligible',
            operator: 'equals',
            value: true,
          },
        },
      ],
    },
  ],
  content: `# Employment Agreement

This Employment Agreement ("Agreement") is entered into as of {{start_date}}.

## PARTIES

**Employer:** {{employer_name}}
**Employee:** {{employee_name}}

## POSITION

Employee shall serve as **{{job_title}}**{{#if department}} in the {{department}} department{{/if}}.

## COMPENSATION

### Base Salary
Employer shall pay Employee an annual base salary of **${{salary}}**, payable in accordance with Employer's standard payroll practices.

{{#if bonus_eligible}}
### Bonus
Employee shall be eligible for an annual performance bonus of up to **{{bonus_percentage}}%** of base salary, subject to achievement of performance criteria established by Employer.
{{/if}}

## TERM

This Agreement shall commence on {{start_date}} and continue until terminated by either party.

---

**EMPLOYER:** {{employer_name}}

Signature: _________________________

Date: _________________________

**EMPLOYEE:** {{employee_name}}

Signature: _________________________

Date: _________________________
`,
};
```

## Conditional Logic

### Show/Hide Rules
```typescript
interface ConditionalRule {
  field: string;  // ID of the field to check
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'greater_than' | 'less_than';
  value: any;
}

// Examples
const showIfBonus: ConditionalRule = {
  field: 'bonus_eligible',
  operator: 'equals',
  value: true,
};

const showIfEmployeeType: ConditionalRule = {
  field: 'employee_type',
  operator: 'in',
  value: ['full-time', 'part-time'],
};
```

### Evaluating Conditions
```typescript
function evaluateCondition(
  rule: ConditionalRule,
  values: Record<string, any>
): boolean {
  const fieldValue = values[rule.field];
  
  switch (rule.operator) {
    case 'equals':
      return fieldValue === rule.value;
    case 'not_equals':
      return fieldValue !== rule.value;
    case 'in':
      return Array.isArray(rule.value) && rule.value.includes(fieldValue);
    case 'not_in':
      return Array.isArray(rule.value) && !rule.value.includes(fieldValue);
    case 'greater_than':
      return Number(fieldValue) > Number(rule.value);
    case 'less_than':
      return Number(fieldValue) < Number(rule.value);
    default:
      return true;
  }
}
```

### Form Component
```typescript
function TemplateForm({ template, values, onChange }: FormProps) {
  return (
    <form>
      {template.sections.map(section => (
        <fieldset key={section.id}>
          <legend>{section.title}</legend>
          {section.variables.map(variable => {
            // Check if field should be shown
            if (variable.showIf && !evaluateCondition(variable.showIf, values)) {
              return null;
            }
            
            return (
              <FormField
                key={variable.id}
                variable={variable}
                value={values[variable.id]}
                onChange={(v) => onChange(variable.id, v)}
              />
            );
          })}
        </fieldset>
      ))}
    </form>
  );
}
```

## Validation

### Validation Rules
```typescript
interface ValidationRule {
  type: 'min' | 'max' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: any;
  message: string;
}

// Examples
const salaryValidation: ValidationRule[] = [
  { type: 'min', value: 0, message: 'Salary must be positive' },
];

const emailValidation: ValidationRule[] = [
  { type: 'pattern', value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' },
];
```

### Validation Function
```typescript
function validateField(
  variable: TemplateVariable,
  value: any
): string | null {
  if (variable.required && !value) {
    return `${variable.label} is required`;
  }
  
  if (!variable.validation) return null;
  
  for (const rule of variable.validation) {
    switch (rule.type) {
      case 'min':
        if (Number(value) < rule.value) return rule.message;
        break;
      case 'max':
        if (Number(value) > rule.value) return rule.message;
        break;
      case 'minLength':
        if (String(value).length < rule.value) return rule.message;
        break;
      case 'pattern':
        if (!rule.value.test(value)) return rule.message;
        break;
    }
  }
  
  return null;
}
```

## Template Content Processing

### Interpolate Variables
```typescript
function interpolateTemplate(
  content: string,
  variables: Record<string, any>
): string {
  let result = content;
  
  // Replace simple variables: {{variable_name}}
  result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] ?? '';
  });
  
  // Handle conditionals: {{#if condition}}...{{/if}}
  result = result.replace(
    /\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (match, key, content) => {
      return variables[key] ? content : '';
    }
  );
  
  // Handle if/else: {{#if condition}}...{{else}}...{{/if}}
  result = result.replace(
    /\{\{#if (\w+)\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (match, key, ifContent, elseContent) => {
      return variables[key] ? ifContent : elseContent;
    }
  );
  
  return result;
}
```

## Version Tracking

### Document with Versions
```typescript
interface Document {
  id: string;
  templateId: string;
  name: string;
  currentVersion: number;
  versions: DocumentVersion[];
  createdAt: Date;
  updatedAt: Date;
}

interface DocumentVersion {
  version: number;
  variables: Record<string, any>;
  createdAt: Date;
  createdBy?: string;
}

// Create new version on update
function updateDocument(doc: Document, newVariables: Record<string, any>) {
  const newVersion: DocumentVersion = {
    version: doc.currentVersion + 1,
    variables: newVariables,
    createdAt: new Date(),
  };
  
  return {
    ...doc,
    currentVersion: newVersion.version,
    versions: [...doc.versions, newVersion],
    updatedAt: new Date(),
  };
}
```
