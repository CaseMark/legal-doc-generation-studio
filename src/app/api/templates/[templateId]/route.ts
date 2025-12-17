import { NextResponse } from 'next/server';
import { getTemplateById } from '@/lib/templates';

// GET /api/templates/[templateId] - Get a specific template with full details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const { templateId } = await params;
  const template = getTemplateById(templateId);
  
  if (!template) {
    return NextResponse.json(
      { error: 'Template not found' },
      { status: 404 }
    );
  }
  
  return NextResponse.json({ template });
}
