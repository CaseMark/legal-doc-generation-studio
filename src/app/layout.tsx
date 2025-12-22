import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Document Generation Studio",
  description: "Create legal documents from templates using natural language",
};

// FileText icon as inline SVG
function FileTextIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={className}
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
      <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
      <path d="M10 9H8"/>
      <path d="M16 13H8"/>
      <path d="M16 17H8"/>
    </svg>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center">
                  <FileTextIcon className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-lg font-bold text-gray-900">Document Generation Studio</h1>
              </div>
              <div className="flex items-center gap-6">
                <nav className="flex items-center gap-4">
                  <a href="/" className="text-sm text-gray-600 hover:text-gray-900">Templates</a>
                  <a href="/documents" className="text-sm text-gray-600 hover:text-gray-900">My Documents</a>
                </nav>
                <div className="flex items-center gap-1.5 text-sm text-gray-500 border-l border-gray-200 pl-4">
                  <span>Built with</span>
                  <a 
                    href="https://case.dev" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-gray-700 transition-colors"
                  >
                    <img 
                      src="/casedev-logo.svg" 
                      alt="Case.dev" 
                      className="h-5 w-5"
                    />
                    <span className="font-medium">case.dev</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
