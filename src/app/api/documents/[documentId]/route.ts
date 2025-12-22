import { NextResponse } from 'next/server';
import { getDocument, updateDocument, deleteDocument, getDocumentVersions } from '@/lib/document-store';

// Helper to validate documentId format
function isValidDocumentId(id: string): boolean {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]+$/.test(id);
}

// GET /api/documents/[documentId] - Get a specific document
export async function GET(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params;
  
  // Validate documentId
  if (!isValidDocumentId(documentId)) {
    return NextResponse.json(
      { error: 'Invalid document ID format' },
      { status: 400 }
    );
  }
  
  const document = getDocument(documentId);
  
  if (!document) {
    return NextResponse.json(
      { error: 'Document not found' },
      { status: 404 }
    );
  }
  
  // Include version history
  const versions = getDocumentVersions(documentId);
  
  return NextResponse.json({ document, versions });
}

// Valid document statuses
const VALID_STATUSES = ['draft', 'generating', 'completed', 'error'] as const;

// PATCH /api/documents/[documentId] - Update a document
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;
    
    // Validate documentId
    if (!isValidDocumentId(documentId)) {
      return NextResponse.json(
        { error: 'Invalid document ID format' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { variables, status } = body;
    
    // Validate status if provided
    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
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
    }
    
    const document = updateDocument(documentId, { variables, status });
    
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ document });
  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    );
  }
}

// DELETE /api/documents/[documentId] - Delete a document
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;
    
    // Validate documentId
    if (!isValidDocumentId(documentId)) {
      return NextResponse.json(
        { error: 'Invalid document ID format' },
        { status: 400 }
      );
    }
    
    const deleted = deleteDocument(documentId);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
