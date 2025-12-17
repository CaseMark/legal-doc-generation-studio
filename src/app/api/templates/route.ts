import { NextResponse } from 'next/server';
import { templates, getTemplatesByCategory } from '@/lib/templates';

// GET /api/templates - List all templates
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  
  let result = templates;
  
  if (category) {
    result = getTemplatesByCategory(category as 'employment' | 'nda' | 'services' | 'lease' | 'general');
  }
  
  // Return templates without the full content for listing
  const templateList = result.map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    category: t.category,
    icon: t.icon,
    version: t.version,
    sectionCount: t.sections.length,
    variableCount: t.sections.reduce((acc, s) => acc + s.variables.length, 0)
  }));
  
  return NextResponse.json({ templates: templateList });
}
