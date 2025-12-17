import { NextResponse } from 'next/server';
import { getTemplateById } from '@/lib/templates';
import { parseNaturalLanguageInput } from '@/lib/case-api';

// POST /api/parse - Parse natural language input into template variables
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { templateId, input } = body;
    
    if (!templateId || !input) {
      return NextResponse.json(
        { error: 'templateId and input are required' },
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
    
    // Flatten all variables from all sections
    const allVariables = template.sections.flatMap(section => 
      section.variables.map(v => ({
        name: v.name,
        label: v.label,
        type: v.type,
        description: v.description
      }))
    );
    
    // Parse the natural language input
    const result = await parseNaturalLanguageInput(input, allVariables);
    
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
