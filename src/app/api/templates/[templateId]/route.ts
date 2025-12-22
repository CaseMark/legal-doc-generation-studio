import { NextResponse } from 'next/server';
import { getTemplateById } from '@/lib/templates';

// Helper to validate templateId format
function isValidTemplateId(id: string): boolean {
  // Only allow alphanumeric, underscore, and hyphen
  return typeof id === 'string' && /^[a-zA-Z0-9_-]+$/.test(id) && id.length <= 100;
}

// GET /api/templates/[templateId] - Get a specific template with full details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const { templateId } = await params;
    
    // Validate templateId
    if (!isValidTemplateId(templateId)) {
      return NextResponse.json(
        { error: 'Invalid template ID format' },
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
    
    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error fetching template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    );
  }
}
