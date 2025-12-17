'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  version: string;
  sectionCount: number;
  variableCount: number;
}

export default function HomePage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      const data = await response.json();
      setTemplates(data.templates);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { id: 'all', label: 'All Templates', icon: '📋' },
    { id: 'employment', label: 'Employment', icon: '👔' },
    { id: 'nda', label: 'NDAs', icon: '🔒' },
    { id: 'services', label: 'Services', icon: '💼' },
    { id: 'lease', label: 'Lease', icon: '🏠' },
  ];

  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === selectedCategory);

  const handleSelectTemplate = (templateId: string) => {
    router.push(`/generate/${templateId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-500">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Create Legal Documents in Minutes
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Select a template, fill in the details using natural language or a guided questionnaire, 
          and generate professional documents ready for use.
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === category.id
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <span className="mr-2">{category.icon}</span>
            {category.label}
          </button>
        ))}
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map(template => (
          <div
            key={template.id}
            onClick={() => handleSelectTemplate(template.id)}
            className="template-card"
          >
            <div className="template-icon">{template.icon}</div>
            <h3 className="template-name">{template.name}</h3>
            <p className="template-description">{template.description}</p>
            <div className="template-meta">
              <span>{template.sectionCount} sections</span>
              <span>•</span>
              <span>{template.variableCount} fields</span>
              <span>•</span>
              <span>v{template.version}</span>
            </div>
          </div>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No templates found in this category.</p>
        </div>
      )}

      {/* Features Section */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="text-center p-6">
          <div className="text-4xl mb-4">✨</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Natural Language Input</h3>
          <p className="text-gray-600">
            Describe your document in plain English and let AI extract the details automatically.
          </p>
        </div>
        <div className="text-center p-6">
          <div className="text-4xl mb-4">📝</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Smart Questionnaire</h3>
          <p className="text-gray-600">
            Guided forms with conditional logic show only relevant questions.
          </p>
        </div>
        <div className="text-center p-6">
          <div className="text-4xl mb-4">📥</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Multiple Formats</h3>
          <p className="text-gray-600">
            Download your documents as Word or PDF, ready for signing.
          </p>
        </div>
      </div>
    </div>
  );
}
