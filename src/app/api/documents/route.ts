import { NextResponse } from 'next/server';
import { getTemplateById } from '@/lib/templates';
import { createDocument, getAllDocuments } from '@/lib/document-store';

// GET /api/documents - List all generated documents
export async function GET() {
  const documents = getAllDocuments();
  return NextResponse.json({ documents });
}

// POST /api/documents - Create a new document from a template
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { templateId, variables } = body;
    
    if (!templateId) {
      return NextResponse.json(
        { error: 'templateId is required' },
        { status: 400 }
      );
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
