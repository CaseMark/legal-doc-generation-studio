import { NextResponse } from 'next/server';
import { getDocument, updateDocument } from '@/lib/document-store';
import { getTemplateById } from '@/lib/templates';
import { formatDocument, processTemplateContent, formatCurrency, formatDate } from '@/lib/case-api';

// Valid output formats
const VALID_FORMATS = ['pdf', 'docx', 'html_preview'] as const;
type OutputFormat = typeof VALID_FORMATS[number];

// POST /api/documents/[documentId]/generate - Generate document in specified format
export async function POST(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;
    
    // Validate documentId
    if (!documentId || typeof documentId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid document ID' },
        { status: 400 }
      );
    }
    
    // Sanitize documentId - only allow alphanumeric, underscore, and hyphen
    if (!/^[a-zA-Z0-9_-]+$/.test(documentId)) {
      return NextResponse.json(
        { error: 'Invalid document ID format' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { format = 'html_preview' } = body;
    
    // Validate format type
    if (typeof format !== 'string') {
      return NextResponse.json(
        { error: 'Format must be a string' },
        { status: 400 }
      );
    }
    
    // Validate format value
    if (!VALID_FORMATS.includes(format as OutputFormat)) {
      return NextResponse.json(
        { error: `Invalid format. Must be one of: ${VALID_FORMATS.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Get the document
    const document = getDocument(documentId);
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }
    
    // Get the template
    const template = getTemplateById(document.templateId);
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }
    
    // Format variables (currency, dates, etc.)
    const formattedVariables: Record<string, string | number | boolean> = {};
    for (const section of template.sections) {
      for (const variable of section.variables) {
        const value = document.variables[variable.name];
        if (value !== undefined && value !== null && value !== '') {
          if (variable.type === 'currency' && typeof value === 'number') {
            formattedVariables[variable.name] = formatCurrency(value);
          } else if (variable.type === 'date' && typeof value === 'string') {
            formattedVariables[variable.name] = formatDate(value);
          } else {
            formattedVariables[variable.name] = value;
          }
        }
      }
    }
    
    // Process the template content with variables
    const processedContent = processTemplateContent(template.content, formattedVariables);
    
    // Update document status
    updateDocument(documentId, { status: 'generating' });
    
    try {
      // Generate the document using Case.dev Format API
      const result = await formatDocument({
        content: processedContent,
        inputFormat: 'md',
        outputFormat: format as 'pdf' | 'docx' | 'html_preview',
        template: 'standard'
      });
      
      // Update document with result
      if (format === 'html_preview') {
        updateDocument(documentId, { 
          status: 'completed',
          previewHtml: result.content 
        });
      } else if (format === 'pdf') {
        updateDocument(documentId, { 
          status: 'completed',
          pdfUrl: `data:application/pdf;base64,${result.content}` 
        });
      } else if (format === 'docx') {
        updateDocument(documentId, { 
          status: 'completed',
          docxUrl: `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${result.content}` 
        });
      }
      
      return NextResponse.json({
        success: true,
        format,
        content: result.content,
        documentId
      });
    } catch (apiError) {
      // If API fails, fall back to local generation
      console.error('Format API error, falling back to local generation:', apiError);
      
      if (format === 'html_preview') {
        // Simple markdown to HTML conversion for preview
        const htmlContent = markdownToHtml(processedContent);
        updateDocument(documentId, { 
          status: 'completed',
          previewHtml: htmlContent 
        });
        
        return NextResponse.json({
          success: true,
          format: 'html_preview',
          content: htmlContent,
          documentId,
          fallback: true
        });
      }
      
      if (format === 'pdf') {
        // Generate PDF using fallback method
        const htmlContent = markdownToHtml(processedContent);
        const pdfBase64 = generateFallbackPdf(htmlContent, processedContent);
        
        updateDocument(documentId, { 
          status: 'completed',
          pdfUrl: `data:application/pdf;base64,${pdfBase64}` 
        });
        
        return NextResponse.json({
          success: true,
          format: 'pdf',
          content: pdfBase64,
          documentId,
          fallback: true
        });
      }
      
      if (format === 'docx') {
        // Generate DOCX using fallback method
        const docxBase64 = generateFallbackDocx(processedContent);
        
        updateDocument(documentId, { 
          status: 'completed',
          docxUrl: `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${docxBase64}` 
        });
        
        return NextResponse.json({
          success: true,
          format: 'docx',
          content: docxBase64,
          documentId,
          fallback: true
        });
      }
      
      throw apiError;
    }
  } catch (error) {
    console.error('Error generating document:', error);
    return NextResponse.json(
      { error: 'Failed to generate document', details: String(error) },
      { status: 500 }
    );
  }
}

// Simple markdown to HTML converter for fallback preview
function markdownToHtml(markdown: string): string {
  let html = markdown;
  
  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Lists
  html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]*<\/li>)/, '<ul>$1</ul>');
  
  // Horizontal rules
  html = html.replace(/^---$/gim, '<hr>');
  
  // Line breaks
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  
  // Wrap in paragraph tags
  html = `<div class="document-preview"><p>${html}</p></div>`;
  
  // Add basic styling
  html = `
    <style>
      .document-preview {
        font-family: 'Times New Roman', Times, serif;
        font-size: 12pt;
        line-height: 1.6;
        max-width: 8.5in;
        margin: 0 auto;
        padding: 1in;
        background: white;
        color: black;
      }
      .document-preview h1 {
        font-size: 18pt;
        font-weight: bold;
        text-align: center;
        margin-bottom: 24pt;
      }
      .document-preview h2 {
        font-size: 14pt;
        font-weight: bold;
        margin-top: 18pt;
        margin-bottom: 12pt;
      }
      .document-preview h3 {
        font-size: 12pt;
        font-weight: bold;
        margin-top: 12pt;
        margin-bottom: 6pt;
      }
      .document-preview p {
        margin-bottom: 12pt;
        text-align: justify;
      }
      .document-preview ul {
        margin-left: 24pt;
        margin-bottom: 12pt;
      }
      .document-preview li {
        margin-bottom: 6pt;
      }
      .document-preview hr {
        border: none;
        border-top: 1px solid #ccc;
        margin: 24pt 0;
      }
      .document-preview strong {
        font-weight: bold;
      }
    </style>
    ${html}
  `;
  
  return html;
}

// Generate a simple PDF using a text-based approach
// This creates a valid PDF with the document content
function generateFallbackPdf(htmlContent: string, markdownContent: string): string {
  // Extract plain text from markdown for PDF
  const plainText = markdownContent
    .replace(/^#{1,6}\s+/gm, '') // Remove header markers
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markers
    .replace(/\*(.*?)\*/g, '$1') // Remove italic markers
    .replace(/^\- /gm, '• ') // Convert list markers
    .replace(/^---$/gm, '────────────────────────────────────────') // Horizontal rules
    .trim();

  // Split into lines and wrap long lines
  const lines = plainText.split('\n');
  const wrappedLines: string[] = [];
  const maxLineLength = 80;
  
  for (const line of lines) {
    if (line.length <= maxLineLength) {
      wrappedLines.push(line);
    } else {
      // Word wrap long lines
      const words = line.split(' ');
      let currentLine = '';
      for (const word of words) {
        if ((currentLine + ' ' + word).trim().length <= maxLineLength) {
          currentLine = (currentLine + ' ' + word).trim();
        } else {
          if (currentLine) wrappedLines.push(currentLine);
          currentLine = word;
        }
      }
      if (currentLine) wrappedLines.push(currentLine);
    }
  }

  // Create PDF content
  const pageHeight = 792; // Letter size height in points
  const pageWidth = 612; // Letter size width in points
  const margin = 72; // 1 inch margin
  const lineHeight = 14;
  const fontSize = 11;
  const linesPerPage = Math.floor((pageHeight - 2 * margin) / lineHeight);
  
  // Split content into pages
  const pages: string[][] = [];
  for (let i = 0; i < wrappedLines.length; i += linesPerPage) {
    pages.push(wrappedLines.slice(i, i + linesPerPage));
  }
  
  if (pages.length === 0) {
    pages.push(['[Document content]']);
  }

  // Build PDF structure
  const objects: string[] = [];
  let objectCount = 0;
  
  // Object 1: Catalog
  objectCount++;
  objects.push(`${objectCount} 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj`);
  
  // Object 2: Pages
  objectCount++;
  const pageRefs = pages.map((_, i) => `${i + 4} 0 R`).join(' ');
  objects.push(`${objectCount} 0 obj\n<< /Type /Pages /Kids [${pageRefs}] /Count ${pages.length} >>\nendobj`);
  
  // Object 3: Font - Times New Roman (Times-Roman in PDF)
  objectCount++;
  objects.push(`${objectCount} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>\nendobj`);
  
  // Create page objects and content streams
  const contentStartIndex = objectCount + pages.length + 1;
  
  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    objectCount++;
    const contentObjNum = contentStartIndex + pageIndex;
    objects.push(`${objectCount} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${contentObjNum} 0 R /Resources << /Font << /F1 3 0 R >> >> >>\nendobj`);
  }
  
  // Create content streams for each page
  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    objectCount++;
    const pageLines = pages[pageIndex];
    
    // Build text content
    let textContent = `BT\n/F1 ${fontSize} Tf\n`;
    let yPos = pageHeight - margin;
    
    for (const line of pageLines) {
      // Escape special PDF characters
      const escapedLine = line
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)');
      
      textContent += `1 0 0 1 ${margin} ${yPos} Tm\n(${escapedLine}) Tj\n`;
      yPos -= lineHeight;
    }
    
    textContent += 'ET';
    
    const streamLength = textContent.length;
    objects.push(`${objectCount} 0 obj\n<< /Length ${streamLength} >>\nstream\n${textContent}\nendstream\nendobj`);
  }
  
  // Build the PDF file
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj + '\n';
  }
  
  // Cross-reference table
  const xrefOffset = pdf.length;
  pdf += 'xref\n';
  pdf += `0 ${objectCount + 1}\n`;
  pdf += '0000000000 65535 f \n';
  
  for (const offset of offsets) {
    pdf += offset.toString().padStart(10, '0') + ' 00000 n \n';
  }
  
  // Trailer
  pdf += 'trailer\n';
  pdf += `<< /Size ${objectCount + 1} /Root 1 0 R >>\n`;
  pdf += 'startxref\n';
  pdf += `${xrefOffset}\n`;
  pdf += '%%EOF';
  
  // Convert to base64
  return Buffer.from(pdf, 'utf-8').toString('base64');
}

// Generate a simple DOCX file
// DOCX is a ZIP file containing XML files
function generateFallbackDocx(markdownContent: string): string {
  // Convert markdown to simple XML paragraphs
  const lines = markdownContent.split('\n');
  let documentXml = '';
  
  for (const line of lines) {
    if (!line.trim()) {
      documentXml += '<w:p><w:r><w:t></w:t></w:r></w:p>';
      continue;
    }
    
    // Check for headers
    const h1Match = line.match(/^# (.+)$/);
    const h2Match = line.match(/^## (.+)$/);
    const h3Match = line.match(/^### (.+)$/);
    
    if (h1Match) {
      documentXml += `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>${escapeXml(h1Match[1])}</w:t></w:r></w:p>`;
    } else if (h2Match) {
      documentXml += `<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>${escapeXml(h2Match[1])}</w:t></w:r></w:p>`;
    } else if (h3Match) {
      documentXml += `<w:p><w:pPr><w:pStyle w:val="Heading3"/></w:pPr><w:r><w:t>${escapeXml(h3Match[1])}</w:t></w:r></w:p>`;
    } else {
      // Regular paragraph - handle bold and italic
      let text = line;
      
      // Process bold
      text = text.replace(/\*\*(.+?)\*\*/g, '</w:t></w:r><w:r><w:rPr><w:b/></w:rPr><w:t>$1</w:t></w:r><w:r><w:t>');
      
      // Process italic
      text = text.replace(/\*(.+?)\*/g, '</w:t></w:r><w:r><w:rPr><w:i/></w:rPr><w:t>$1</w:t></w:r><w:r><w:t>');
      
      // Handle list items
      if (line.startsWith('- ')) {
        text = '• ' + text.substring(2);
      }
      
      // Escape XML in remaining text parts
      text = escapeXml(text);
      
      documentXml += `<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`;
    }
  }
  
  // Create the document.xml content
  const documentContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>
${documentXml}
<w:sectPr>
<w:pgSz w:w="12240" w:h="15840"/>
<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
</w:sectPr>
</w:body>
</w:document>`;

  // Create minimal DOCX structure
  // For simplicity, we'll create a minimal valid DOCX
  // In production, use a proper library like docx or officegen
  
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const documentRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;

  // Create a simple ZIP structure manually
  // This is a minimal implementation - for production use a proper ZIP library
  const zipData = createMinimalDocxZip(contentTypes, rels, documentRels, documentContent);
  
  return zipData;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Create a minimal ZIP file for DOCX
// This is a simplified implementation
function createMinimalDocxZip(contentTypes: string, rels: string, documentRels: string, documentContent: string): string {
  // For a proper implementation, we'd use a ZIP library
  // This creates a minimal structure that most readers can handle
  
  const files: { name: string; content: string }[] = [
    { name: '[Content_Types].xml', content: contentTypes },
    { name: '_rels/.rels', content: rels },
    { name: 'word/_rels/document.xml.rels', content: documentRels },
    { name: 'word/document.xml', content: documentContent }
  ];
  
  // Build ZIP file manually
  const localHeaders: Buffer[] = [];
  const centralHeaders: Buffer[] = [];
  let offset = 0;
  
  for (const file of files) {
    const content = Buffer.from(file.content, 'utf-8');
    const nameBuffer = Buffer.from(file.name, 'utf-8');
    
    // Local file header
    const localHeader = Buffer.alloc(30 + nameBuffer.length + content.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // Local file header signature
    localHeader.writeUInt16LE(20, 4); // Version needed
    localHeader.writeUInt16LE(0, 6); // General purpose bit flag
    localHeader.writeUInt16LE(0, 8); // Compression method (stored)
    localHeader.writeUInt16LE(0, 10); // Last mod time
    localHeader.writeUInt16LE(0, 12); // Last mod date
    localHeader.writeUInt32LE(crc32(content), 14); // CRC-32
    localHeader.writeUInt32LE(content.length, 18); // Compressed size
    localHeader.writeUInt32LE(content.length, 22); // Uncompressed size
    localHeader.writeUInt16LE(nameBuffer.length, 26); // File name length
    localHeader.writeUInt16LE(0, 28); // Extra field length
    nameBuffer.copy(localHeader, 30);
    content.copy(localHeader, 30 + nameBuffer.length);
    
    localHeaders.push(localHeader);
    
    // Central directory header
    const centralHeader = Buffer.alloc(46 + nameBuffer.length);
    centralHeader.writeUInt32LE(0x02014b50, 0); // Central directory signature
    centralHeader.writeUInt16LE(20, 4); // Version made by
    centralHeader.writeUInt16LE(20, 6); // Version needed
    centralHeader.writeUInt16LE(0, 8); // General purpose bit flag
    centralHeader.writeUInt16LE(0, 10); // Compression method
    centralHeader.writeUInt16LE(0, 12); // Last mod time
    centralHeader.writeUInt16LE(0, 14); // Last mod date
    centralHeader.writeUInt32LE(crc32(content), 16); // CRC-32
    centralHeader.writeUInt32LE(content.length, 20); // Compressed size
    centralHeader.writeUInt32LE(content.length, 24); // Uncompressed size
    centralHeader.writeUInt16LE(nameBuffer.length, 28); // File name length
    centralHeader.writeUInt16LE(0, 30); // Extra field length
    centralHeader.writeUInt16LE(0, 32); // File comment length
    centralHeader.writeUInt16LE(0, 34); // Disk number start
    centralHeader.writeUInt16LE(0, 36); // Internal file attributes
    centralHeader.writeUInt32LE(0, 38); // External file attributes
    centralHeader.writeUInt32LE(offset, 42); // Relative offset of local header
    nameBuffer.copy(centralHeader, 46);
    
    centralHeaders.push(centralHeader);
    offset += localHeader.length;
  }
  
  // End of central directory
  const centralDirOffset = offset;
  const centralDirSize = centralHeaders.reduce((sum, h) => sum + h.length, 0);
  
  const endOfCentralDir = Buffer.alloc(22);
  endOfCentralDir.writeUInt32LE(0x06054b50, 0); // End of central directory signature
  endOfCentralDir.writeUInt16LE(0, 4); // Number of this disk
  endOfCentralDir.writeUInt16LE(0, 6); // Disk where central directory starts
  endOfCentralDir.writeUInt16LE(files.length, 8); // Number of central directory records on this disk
  endOfCentralDir.writeUInt16LE(files.length, 10); // Total number of central directory records
  endOfCentralDir.writeUInt32LE(centralDirSize, 12); // Size of central directory
  endOfCentralDir.writeUInt32LE(centralDirOffset, 16); // Offset of start of central directory
  endOfCentralDir.writeUInt16LE(0, 20); // Comment length
  
  // Combine all parts
  const zipBuffer = Buffer.concat([...localHeaders, ...centralHeaders, endOfCentralDir]);
  
  return zipBuffer.toString('base64');
}

// Simple CRC-32 implementation
function crc32(buffer: Buffer): number {
  let crc = 0xFFFFFFFF;
  const table = getCrc32Table();
  
  for (let i = 0; i < buffer.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buffer[i]) & 0xFF];
  }
  
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

let crc32Table: number[] | null = null;

function getCrc32Table(): number[] {
  if (crc32Table) return crc32Table;
  
  crc32Table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crc32Table[i] = c;
  }
  
  return crc32Table;
}
