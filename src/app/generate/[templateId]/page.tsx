'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DocumentTemplate, TemplateVariable, TemplateSection } from '@/lib/types';

type Step = 'input' | 'questionnaire' | 'preview';

export default function GeneratePage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.templateId as string;

  const [template, setTemplate] = useState<DocumentTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>('input');
  const [values, setValues] = useState<Record<string, string | number | boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentSection, setCurrentSection] = useState(0);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Natural language input
  const [nlInput, setNlInput] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseConfidence, setParseConfidence] = useState<number | null>(null);
  const [parseSuggestions, setParseSuggestions] = useState<string[]>([]);

  useEffect(() => {
    fetchTemplate();
  }, [templateId]);

  const fetchTemplate = async () => {
    try {
      const response = await fetch(`/api/templates/${templateId}`);
      if (!response.ok) {
        router.push('/');
        return;
      }
      const data = await response.json();
      setTemplate(data.template);
      
      // Initialize default values
      const defaults: Record<string, string | number | boolean> = {};
      for (const section of data.template.sections) {
        for (const variable of section.variables) {
          if (variable.defaultValue !== undefined) {
            defaults[variable.name] = variable.defaultValue;
          }
        }
      }
      setValues(defaults);
    } catch (error) {
      console.error('Error fetching template:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const handleNaturalLanguageParse = async () => {
    if (!nlInput.trim()) return;
    
    setParsing(true);
    setParseConfidence(null);
    setParseSuggestions([]);
    
    try {
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          input: nlInput
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Merge parsed values with existing values
        setValues(prev => ({ ...prev, ...data.variables }));
        setParseConfidence(data.confidence);
        setParseSuggestions(data.suggestions || []);
        
        // Move to questionnaire to review/complete
        setStep('questionnaire');
      }
    } catch (error) {
      console.error('Error parsing input:', error);
    } finally {
      setParsing(false);
    }
  };

  const handleValueChange = (name: string, value: string | number | boolean) => {
    setValues(prev => ({ ...prev, [name]: value }));
    // Clear error when value changes
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const shouldShowVariable = useCallback((variable: TemplateVariable): boolean => {
    if (!variable.showIf) return true;
    
    const { field, operator, value } = variable.showIf;
    const currentValue = values[field];
    
    switch (operator) {
      case 'equals':
        return currentValue === value;
      case 'notEquals':
        return currentValue !== value;
      case 'contains':
        return String(currentValue).includes(String(value));
      case 'greaterThan':
        return Number(currentValue) > Number(value);
      case 'lessThan':
        return Number(currentValue) < Number(value);
      default:
        return true;
    }
  }, [values]);

  const shouldShowSection = useCallback((section: TemplateSection): boolean => {
    if (!section.showIf) return true;
    
    const { field, operator, value } = section.showIf;
    const currentValue = values[field];
    
    switch (operator) {
      case 'equals':
        return currentValue === value;
      case 'notEquals':
        return currentValue !== value;
      default:
        return true;
    }
  }, [values]);

  const validateSection = (sectionIndex: number): boolean => {
    if (!template) return false;
    
    const section = template.sections[sectionIndex];
    if (!shouldShowSection(section)) return true;
    
    const newErrors: Record<string, string> = {};
    
    for (const variable of section.variables) {
      if (!shouldShowVariable(variable)) continue;
      
      if (variable.required) {
        const value = values[variable.name];
        if (value === undefined || value === null || value === '') {
          newErrors[variable.name] = `${variable.label} is required`;
        }
      }
      
      if (variable.validation) {
        const value = values[variable.name];
        if (variable.validation.min !== undefined && Number(value) < variable.validation.min) {
          newErrors[variable.name] = variable.validation.message || `Minimum value is ${variable.validation.min}`;
        }
        if (variable.validation.max !== undefined && Number(value) > variable.validation.max) {
          newErrors[variable.name] = variable.validation.message || `Maximum value is ${variable.validation.max}`;
        }
      }
    }
    
    setErrors(prev => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const handleNextSection = () => {
    if (!template) return;
    
    if (!validateSection(currentSection)) return;
    
    // Find next visible section
    let nextSection = currentSection + 1;
    while (nextSection < template.sections.length && !shouldShowSection(template.sections[nextSection])) {
      nextSection++;
    }
    
    if (nextSection < template.sections.length) {
      setCurrentSection(nextSection);
    } else {
      // All sections complete, generate preview
      handleGeneratePreview();
    }
  };

  const handlePrevSection = () => {
    if (!template) return;
    
    // Find previous visible section
    let prevSection = currentSection - 1;
    while (prevSection >= 0 && !shouldShowSection(template.sections[prevSection])) {
      prevSection--;
    }
    
    if (prevSection >= 0) {
      setCurrentSection(prevSection);
    }
  };

  const handleGeneratePreview = async () => {
    setGenerating(true);
    
    try {
      // Create document
      const createResponse = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          variables: values
        })
      });
      
      const createData = await createResponse.json();
      setDocumentId(createData.document.id);
      
      // Generate preview
      const generateResponse = await fetch(`/api/documents/${createData.document.id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'html_preview' })
      });
      
      const generateData = await generateResponse.json();
      setPreviewHtml(generateData.content);
      setStep('preview');
    } catch (error) {
      console.error('Error generating preview:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (format: 'pdf' | 'docx') => {
    if (!documentId) return;
    
    setDownloading(true);
    
    try {
      const response = await fetch(`/api/documents/${documentId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format })
      });
      
      const data = await response.json();
      
      if (data.success && data.content) {
        // Create download link
        const mimeType = format === 'pdf' 
          ? 'application/pdf' 
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        const extension = format === 'pdf' ? 'pdf' : 'docx';
        
        const blob = base64ToBlob(data.content, mimeType);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${template?.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading document:', error);
    } finally {
      setDownloading(false);
    }
  };

  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  };

  const renderVariableInput = (variable: TemplateVariable) => {
    if (!shouldShowVariable(variable)) return null;
    
    const value = values[variable.name];
    const error = errors[variable.name];
    
    return (
      <div key={variable.id} className="form-field">
        <label className="form-label">
          {variable.label}
          {variable.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        
        {variable.type === 'text' && (
          <input
            type="text"
            className={`form-input ${error ? 'border-red-500' : ''}`}
            value={String(value || '')}
            onChange={(e) => handleValueChange(variable.name, e.target.value)}
            placeholder={variable.placeholder}
          />
        )}
        
        {variable.type === 'textarea' && (
          <textarea
            className={`form-textarea ${error ? 'border-red-500' : ''}`}
            value={String(value || '')}
            onChange={(e) => handleValueChange(variable.name, e.target.value)}
            placeholder={variable.placeholder}
          />
        )}
        
        {variable.type === 'number' && (
          <input
            type="number"
            className={`form-input ${error ? 'border-red-500' : ''}`}
            value={value !== undefined ? String(value) : ''}
            onChange={(e) => handleValueChange(variable.name, e.target.value ? Number(e.target.value) : '')}
            placeholder={variable.placeholder}
          />
        )}
        
        {variable.type === 'currency' && (
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500">$</span>
            <input
              type="number"
              className={`form-input pl-7 ${error ? 'border-red-500' : ''}`}
              value={value !== undefined ? String(value) : ''}
              onChange={(e) => handleValueChange(variable.name, e.target.value ? Number(e.target.value) : '')}
              placeholder={variable.placeholder}
            />
          </div>
        )}
        
        {variable.type === 'date' && (
          <input
            type="date"
            className={`form-input ${error ? 'border-red-500' : ''}`}
            value={String(value || '')}
            onChange={(e) => handleValueChange(variable.name, e.target.value)}
          />
        )}
        
        {variable.type === 'select' && variable.options && (
          <select
            className={`form-select ${error ? 'border-red-500' : ''}`}
            value={String(value || '')}
            onChange={(e) => handleValueChange(variable.name, e.target.value)}
          >
            <option value="">Select...</option>
            {variable.options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}
        
        {variable.type === 'boolean' && (
          <div className="flex items-center">
            <input
              type="checkbox"
              className="form-checkbox"
              checked={Boolean(value)}
              onChange={(e) => handleValueChange(variable.name, e.target.checked)}
            />
            <span className="ml-2 text-sm text-gray-600">{variable.description || 'Yes'}</span>
          </div>
        )}
        
        {error && <p className="form-error">{error}</p>}
        {variable.description && variable.type !== 'boolean' && (
          <p className="form-description">{variable.description}</p>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-500">Loading template...</p>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Template not found.</p>
      </div>
    );
  }

  const visibleSections = template.sections.filter(shouldShowSection);
  const currentVisibleIndex = visibleSections.findIndex(s => s.id === template.sections[currentSection]?.id);

  return (
    <div>
      {/* Progress Steps */}
      <div className="progress-steps">
        <div className="progress-step">
          <div className={`progress-step-number ${step === 'input' ? 'active' : 'completed'}`}>
            {step === 'input' ? '1' : '✓'}
          </div>
          <span className={`progress-step-label ${step === 'input' ? 'active' : 'completed'}`}>
            Input
          </span>
        </div>
        <div className={`progress-step-connector ${step !== 'input' ? 'completed' : 'inactive'}`}></div>
        <div className="progress-step">
          <div className={`progress-step-number ${step === 'questionnaire' ? 'active' : step === 'preview' ? 'completed' : 'inactive'}`}>
            {step === 'preview' ? '✓' : '2'}
          </div>
          <span className={`progress-step-label ${step === 'questionnaire' ? 'active' : step === 'preview' ? 'completed' : 'inactive'}`}>
            Details
          </span>
        </div>
        <div className={`progress-step-connector ${step === 'preview' ? 'completed' : 'inactive'}`}></div>
        <div className="progress-step">
          <div className={`progress-step-number ${step === 'preview' ? 'active' : 'inactive'}`}>
            3
          </div>
          <span className={`progress-step-label ${step === 'preview' ? 'active' : 'inactive'}`}>
            Preview & Download
          </span>
        </div>
      </div>

      {/* Template Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{template.icon}</span>
          <h1 className="text-2xl font-bold text-gray-900">{template.name}</h1>
        </div>
        <p className="text-gray-600">{template.description}</p>
      </div>

      {/* Step: Natural Language Input */}
      {step === 'input' && (
        <div>
          <div className="nl-input-container">
            <label className="nl-input-label">
              <span>✨</span>
              Describe your document in plain English
            </label>
            <textarea
              className="nl-input-textarea"
              value={nlInput}
              onChange={(e) => setNlInput(e.target.value)}
              placeholder={getPlaceholderForTemplate(template.id)}
              rows={4}
            />
            <p className="nl-input-hint">
              Example: &quot;{getExampleForTemplate(template.id)}&quot;
            </p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleNaturalLanguageParse}
                disabled={parsing || !nlInput.trim()}
                className="btn btn-primary"
              >
                {parsing ? (
                  <>
                    <div className="spinner mr-2"></div>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <span className="mr-2">✨</span>
                    Extract Details
                  </>
                )}
              </button>
              <button
                onClick={() => setStep('questionnaire')}
                className="btn btn-secondary"
              >
                Skip to Questionnaire
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step: Questionnaire */}
      {step === 'questionnaire' && (
        <div>
          {/* Parse Results */}
          {parseConfidence !== null && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-green-600">✓</span>
                <span className="font-medium text-green-800">
                  Extracted {Object.keys(values).filter(k => values[k]).length} fields 
                  ({Math.round(parseConfidence * 100)}% confidence)
                </span>
              </div>
              {parseSuggestions.length > 0 && (
                <div className="text-sm text-green-700">
                  <p className="font-medium">Suggestions:</p>
                  <ul className="list-disc list-inside">
                    {parseSuggestions.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Section Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">
                Section {currentVisibleIndex + 1} of {visibleSections.length}
              </span>
              <div className="flex gap-1">
                {visibleSections.map((_, i) => (
                  <div
                    key={i}
                    className={`w-8 h-1 rounded ${
                      i < currentVisibleIndex ? 'bg-green-500' :
                      i === currentVisibleIndex ? 'bg-blue-500' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Current Section */}
          {template.sections[currentSection] && shouldShowSection(template.sections[currentSection]) && (
            <div className="form-section">
              <h2 className="form-section-title">{template.sections[currentSection].title}</h2>
              {template.sections[currentSection].description && (
                <p className="form-section-description">{template.sections[currentSection].description}</p>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {template.sections[currentSection].variables.map(renderVariableInput)}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            <button
              onClick={() => currentSection === 0 ? setStep('input') : handlePrevSection()}
              className="btn btn-secondary"
            >
              ← Back
            </button>
            <button
              onClick={handleNextSection}
              disabled={generating}
              className="btn btn-primary"
            >
              {generating ? (
                <>
                  <div className="spinner mr-2"></div>
                  Generating...
                </>
              ) : currentVisibleIndex === visibleSections.length - 1 ? (
                'Generate Preview →'
              ) : (
                'Next Section →'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step: Preview */}
      {step === 'preview' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Document Preview</h2>
            <div className="flex gap-3">
              <button
                onClick={() => setStep('questionnaire')}
                className="btn btn-secondary"
              >
                ← Edit Details
              </button>
              <button
                onClick={() => handleDownload('docx')}
                disabled={downloading}
                className="btn btn-secondary"
              >
                {downloading ? (
                  <div className="spinner"></div>
                ) : (
                  <>
                    <span className="mr-2">📄</span>
                    Download Word
                  </>
                )}
              </button>
              <button
                onClick={() => handleDownload('pdf')}
                disabled={downloading}
                className="btn btn-primary"
              >
                {downloading ? (
                  <div className="spinner"></div>
                ) : (
                  <>
                    <span className="mr-2">📥</span>
                    Download PDF
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="document-preview-container">
            <iframe
              srcDoc={previewHtml}
              title="Document Preview"
              className="w-full min-h-[800px] bg-white shadow-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Helper functions for template-specific examples
function getPlaceholderForTemplate(templateId: string): string {
  const placeholders: Record<string, string> = {
    'employment-agreement': 'Describe the employment details: position, salary, location, benefits...',
    'nda-mutual': 'Describe the NDA: parties involved, purpose, duration...',
    'contractor-agreement': 'Describe the contractor engagement: services, rate, duration...',
    'consulting-agreement': 'Describe the consulting project: scope, fees, timeline...',
    'lease-agreement': 'Describe the rental: property, rent, lease term...'
  };
  return placeholders[templateId] || 'Describe your document details...';
}

function getExampleForTemplate(templateId: string): string {
  const examples: Record<string, string> = {
    'employment-agreement': 'Software engineer position at Acme Corp in California, $150,000 annual salary, full-time, starting January 15, 2025, with health insurance and 20 days PTO',
    'nda-mutual': 'NDA between TechCorp Inc (Delaware corporation) and StartupXYZ LLC (California) for discussing a potential acquisition, 2 year term',
    'contractor-agreement': 'Web development contractor Jane Smith, $100/hour, maximum 80 hours per month, 30-day termination notice',
    'consulting-agreement': 'Strategy consulting engagement with McKinsey for digital transformation, $50,000 fixed fee, 3 month project',
    'lease-agreement': '2 bedroom apartment at 123 Main St, San Francisco, $3,500/month rent, 12 month lease starting February 1'
  };
  return examples[templateId] || 'Enter your document details here...';
}
