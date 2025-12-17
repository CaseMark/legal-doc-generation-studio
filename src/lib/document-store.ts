// In-memory document store for generated documents and versions
// In production, this would be backed by a database

import { GeneratedDocument, DocumentVersion } from './types';

// Use global to persist across hot reloads in development
declare global {
  // eslint-disable-next-line no-var
  var documentStore: Map<string, GeneratedDocument> | undefined;
  // eslint-disable-next-line no-var
  var versionStore: Map<string, DocumentVersion[]> | undefined;
}

// In-memory storage - use global to persist across hot reloads
const documents: Map<string, GeneratedDocument> = global.documentStore || new Map();
const versions: Map<string, DocumentVersion[]> = global.versionStore || new Map();

// Persist to global in development
if (process.env.NODE_ENV !== 'production') {
  global.documentStore = documents;
  global.versionStore = versions;
}

// Generate unique IDs
function generateId(): string {
  return `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function generateVersionId(): string {
  return `ver_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Create a new document
export function createDocument(
  templateId: string,
  templateName: string,
  variables: Record<string, string | number | boolean>
): GeneratedDocument {
  const id = generateId();
  const now = new Date().toISOString();
  
  const document: GeneratedDocument = {
    id,
    templateId,
    templateName,
    variables,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    version: 1
  };
  
  documents.set(id, document);
  
  // Create initial version
  const version: DocumentVersion = {
    id: generateVersionId(),
    documentId: id,
    version: 1,
    variables,
    createdAt: now
  };
  versions.set(id, [version]);
  
  return document;
}

// Get a document by ID
export function getDocument(id: string): GeneratedDocument | undefined {
  return documents.get(id);
}

// Get all documents
export function getAllDocuments(): GeneratedDocument[] {
  return Array.from(documents.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

// Update a document
export function updateDocument(
  id: string,
  updates: Partial<Pick<GeneratedDocument, 'variables' | 'status' | 'previewHtml' | 'pdfUrl' | 'docxUrl'>>
): GeneratedDocument | undefined {
  const document = documents.get(id);
  if (!document) return undefined;
  
  const now = new Date().toISOString();
  const shouldCreateVersion = updates.variables && 
    JSON.stringify(updates.variables) !== JSON.stringify(document.variables);
  
  const updatedDocument: GeneratedDocument = {
    ...document,
    ...updates,
    updatedAt: now,
    version: shouldCreateVersion ? document.version + 1 : document.version
  };
  
  documents.set(id, updatedDocument);
  
  // Create new version if variables changed
  if (shouldCreateVersion && updates.variables) {
    const documentVersions = versions.get(id) || [];
    const newVersion: DocumentVersion = {
      id: generateVersionId(),
      documentId: id,
      version: updatedDocument.version,
      variables: updates.variables,
      createdAt: now
    };
    documentVersions.push(newVersion);
    versions.set(id, documentVersions);
  }
  
  return updatedDocument;
}

// Delete a document
export function deleteDocument(id: string): boolean {
  const deleted = documents.delete(id);
  versions.delete(id);
  return deleted;
}

// Get document versions
export function getDocumentVersions(documentId: string): DocumentVersion[] {
  return versions.get(documentId) || [];
}

// Get a specific version
export function getDocumentVersion(documentId: string, versionNumber: number): DocumentVersion | undefined {
  const documentVersions = versions.get(documentId) || [];
  return documentVersions.find(v => v.version === versionNumber);
}

// Restore a document to a specific version
export function restoreVersion(documentId: string, versionNumber: number): GeneratedDocument | undefined {
  const version = getDocumentVersion(documentId, versionNumber);
  if (!version) return undefined;
  
  return updateDocument(documentId, { variables: version.variables });
}

// Get documents by template
export function getDocumentsByTemplate(templateId: string): GeneratedDocument[] {
  return Array.from(documents.values())
    .filter(doc => doc.templateId === templateId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

// Search documents
export function searchDocuments(query: string): GeneratedDocument[] {
  const lowerQuery = query.toLowerCase();
  return Array.from(documents.values())
    .filter(doc => {
      // Search in template name
      if (doc.templateName.toLowerCase().includes(lowerQuery)) return true;
      
      // Search in variable values
      for (const value of Object.values(doc.variables)) {
        if (String(value).toLowerCase().includes(lowerQuery)) return true;
      }
      
      return false;
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

// Get document statistics
export function getDocumentStats(): {
  total: number;
  byStatus: Record<string, number>;
  byTemplate: Record<string, number>;
} {
  const docs = Array.from(documents.values());
  
  const byStatus: Record<string, number> = {};
  const byTemplate: Record<string, number> = {};
  
  for (const doc of docs) {
    byStatus[doc.status] = (byStatus[doc.status] || 0) + 1;
    byTemplate[doc.templateId] = (byTemplate[doc.templateId] || 0) + 1;
  }
  
  return {
    total: docs.length,
    byStatus,
    byTemplate
  };
}
