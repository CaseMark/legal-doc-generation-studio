import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Document Generation Studio",
  description: "Create legal documents from templates using natural language",
};

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
                <span className="text-2xl">📄</span>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">Document Generation Studio</h1>
                  <p className="text-xs text-gray-500">Powered by Case.dev</p>
                </div>
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
