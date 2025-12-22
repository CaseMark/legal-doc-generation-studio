import { NextResponse } from 'next/server';
import { templates, getTemplatesByCategory } from '@/lib/templates';

// Valid template categories
const VALID_CATEGORIES = ['employment', 'nda', 'services', 'lease', 'general'] as const;
type TemplateCategory = typeof VALID_CATEGORIES[number];

// GET /api/templates - List all templates
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    
    let result = templates;
    
    // Validate category if provided
    if (category) {
      if (!VALID_CATEGORIES.includes(category as TemplateCategory)) {
        return NextResponse.json(
          { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` },
          { status: 400 }
        );
      }
      result = getTemplatesByCategory(category as TemplateCategory);
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
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}
