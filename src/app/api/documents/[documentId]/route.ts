import { NextResponse } from 'next/server';
import { getDocument, updateDocument, deleteDocument, getDocumentVersions } from '@/lib/document-store';

// GET /api/documents/[documentId] - Get a specific document
export async function GET(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params;
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

// PATCH /api/documents/[documentId] - Update a document
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;
    const body = await request.json();
    const { variables, status } = body;
    
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
  const { documentId } = await params;
  const deleted = deleteDocument(documentId);
  
  if (!deleted) {
    return NextResponse.json(
      { error: 'Document not found' },
      { status: 404 }
    );
  }
  
  return NextResponse.json({ success: true });
}
