import { NextResponse } from 'next/server';
import { getTemplateById } from '@/lib/templates';
import { parseNaturalLanguageInput } from '@/lib/case-api';

// Input validation constants
const MAX_INPUT_LENGTH = 10000; // 10KB max for natural language input

// POST /api/parse - Parse natural language input into template variables
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { templateId, input } = body;
    
    // Validate required fields
    if (!templateId || !input) {
      return NextResponse.json(
        { error: 'templateId and input are required' },
        { status: 400 }
      );
    }
    
    // Validate input types
    if (typeof templateId !== 'string' || typeof input !== 'string') {
      return NextResponse.json(
        { error: 'templateId and input must be strings' },
        { status: 400 }
      );
    }
    
    // Validate input length to prevent abuse
    if (input.length > MAX_INPUT_LENGTH) {
      return NextResponse.json(
        { error: `Input exceeds maximum length of ${MAX_INPUT_LENGTH} characters` },
        { status: 400 }
      );
    }
    
    // Get the template
    const template = getTemplateById(templateId);
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }
    
    // Flatten all variables from all sections, including options for select fields
    const allVariables = template.sections.flatMap(section => 
      section.variables.map(v => {
        let description = v.description || '';
        // Add options info for select fields to help LLM match values
        if (v.type === 'select' && v.options) {
          const optionValues = v.options.map(o => o.value).join(', ');
          description = description 
            ? `${description}. Valid values: ${optionValues}`
            : `Valid values: ${optionValues}`;
        }
        return {
          name: v.name,
          label: v.label,
          type: v.type,
          description: description || undefined
        };
      })
    );
    
    // Parse the natural language input with template context
    const result = await parseNaturalLanguageInput(
      input, 
      allVariables,
      { name: template.name, category: template.category }
    );
    
    return NextResponse.json({
      success: true,
      ...result,
      templateId
    });
  } catch (error) {
    console.error('Error parsing input:', error);
    return NextResponse.json(
      { error: 'Failed to parse input', details: String(error) },
      { status: 500 }
    );
  }
}
