import { NextResponse } from 'next/server';
import { getTemplateById } from '@/lib/templates';
import { createDocument, getAllDocuments } from '@/lib/document-store';

// Input validation constants
const MAX_VARIABLES_COUNT = 100;
const MAX_VARIABLE_VALUE_LENGTH = 50000; // 50KB max per variable value

// GET /api/documents - List all generated documents
export async function GET() {
  try {
    const documents = getAllDocuments();
    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

// POST /api/documents - Create a new document from a template
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { templateId, variables } = body;
    
    // Validate required fields
    if (!templateId) {
      return NextResponse.json(
        { error: 'templateId is required' },
        { status: 400 }
      );
    }
    
    // Validate templateId type
    if (typeof templateId !== 'string') {
      return NextResponse.json(
        { error: 'templateId must be a string' },
        { status: 400 }
      );
    }
    
    // Validate variables if provided
    if (variables !== undefined && variables !== null) {
      if (typeof variables !== 'object' || Array.isArray(variables)) {
        return NextResponse.json(
          { error: 'variables must be an object' },
          { status: 400 }
        );
      }
      
      // Check variable count
      const variableKeys = Object.keys(variables);
      if (variableKeys.length > MAX_VARIABLES_COUNT) {
        return NextResponse.json(
          { error: `Too many variables. Maximum is ${MAX_VARIABLES_COUNT}` },
          { status: 400 }
        );
      }
      
      // Validate each variable value
      for (const [key, value] of Object.entries(variables)) {
        if (typeof value === 'string' && value.length > MAX_VARIABLE_VALUE_LENGTH) {
          return NextResponse.json(
            { error: `Variable "${key}" exceeds maximum length of ${MAX_VARIABLE_VALUE_LENGTH} characters` },
            { status: 400 }
          );
        }
        // Only allow string, number, or boolean values
        if (value !== null && value !== undefined && 
            typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
          return NextResponse.json(
            { error: `Variable "${key}" has invalid type. Must be string, number, or boolean` },
            { status: 400 }
          );
        }
      }
    }
    
    const template = getTemplateById(templateId);
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }
    
    // Create the document
    const document = createDocument(
      templateId,
      template.name,
      variables || {}
    );
    
    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500 }
    );
  }
}
