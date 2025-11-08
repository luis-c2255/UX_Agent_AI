import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { GroundingSource } from '../types';
import Spinner from './Spinner';
import { DownloadIcon } from './icons';

type QuickTool = 'researcher' | 'suggest';

const QuickTools: React.FC = () => {
  const [activeTool, setActiveTool] = useState<QuickTool>('researcher');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [sources, setSources] = useState<GroundingSource[]>([]);
  const [error, setError] = useState('');

  const resetState = () => {
    setPrompt('');
    setResult('');
    setSources([]);
    setError('');
    setLoading(false);
  };

  const handleToolChange = (tool: QuickTool) => {
    setActiveTool(tool);
    resetState();
  };

  const handleSubmit = async () => {
    if (!prompt) {
      setError('Please enter a prompt.');
      return;
    }
    // FIX: resetState() was clearing the prompt before it was used.
    // It is now called after setting state for the new request.
    setLoading(true);
    setError('');
    setResult('');
    setSources([]);


    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      // FIX: Use 'gemini-flash-lite-latest' model alias for quick suggestions per guidelines.
      const model = activeTool === 'researcher' ? 'gemini-2.5-flash' : 'gemini-flash-lite-latest';
      const config = activeTool === 'researcher' ? { tools: [{ googleSearch: {} }] } : {};

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config,
      });

      setResult(response.text);

      if (activeTool === 'researcher') {
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const extractedSources: GroundingSource[] = groundingChunks
            .map(chunk => chunk.web)
            .filter(web => web?.uri && web.title)
            .map(web => ({ uri: web.uri!, title: web.title! }));
        setSources(extractedSources);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadText = () => {
    if (!result) return;
    const blob = new Blob([result], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ux-quick-tool-${activeTool}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <div className="flex border-b border-gray-700 mb-4">
        <button onClick={() => handleToolChange('researcher')} className={`capitalize py-2 px-4 text-sm font-medium transition-colors ${activeTool === 'researcher' ? 'border-b-2 border-purple-500 text-white' : 'text-gray-400 hover:text-white'}`}>
          Researcher
        </button>
        <button onClick={() => handleToolChange('suggest')} className={`capitalize py-2 px-4 text-sm font-medium transition-colors ${activeTool === 'suggest' ? 'border-b-2 border-purple-500 text-white' : 'text-gray-400 hover:text-white'}`}>
          Quick Suggest
        </button>
      </div>

      <h2 className="text-xl font-semibold mb-2 text-white">
        {activeTool === 'researcher' ? 'AI Researcher' : 'Quick Suggestion'}
      </h2>
      <p className="text-gray-400 mb-4">
        {activeTool === 'researcher'
          ? 'Get up-to-date, grounded answers from Google Search.'
          : 'Get fast, low-latency responses for quick tasks.'}
      </p>

      <div className="space-y-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={activeTool === 'researcher' ? "e.g., What are the latest trends in mobile UX design for 2024?" : "e.g., Brainstorm 5 names for a new fitness app."}
          className="w-full h-32 p-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none transition"
          disabled={loading}
        />
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-colors duration-200"
        >
          {loading ? 'Processing...' : 'Submit'}
        </button>
      </div>

      {loading && (
        <div className="mt-6 text-center">
          <Spinner />
        </div>
      )}

      {error && <p className="mt-6 text-red-400 bg-red-900/50 p-3 rounded-lg">{error}</p>}

      {result && (
        <div className="mt-6 p-4 bg-gray-900 rounded-lg border border-gray-700">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold text-white">Response</h3>
            <button
              onClick={handleDownloadText}
              className="flex items-center space-x-2 px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              aria-label="Download response"
            >
              <DownloadIcon />
              <span>Download</span>
            </button>
          </div>
          <div className="text-gray-200 whitespace-pre-wrap">{result}</div>
          
          {sources.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-700">
                <h4 className="font-semibold text-gray-300 mb-2">Sources:</h4>
                <ul className="list-disc list-inside space-y-1">
                    {sources.map((source, index) => (
                        <li key={index}>
                            <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
                                {source.title}
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuickTools;