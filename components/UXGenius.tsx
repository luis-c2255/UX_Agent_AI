import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { UX_CRAFT_SYSTEM_INSTRUCTION } from '../constants';
import Spinner from './Spinner';
import { DownloadIcon } from './icons';

const UXGenius: React.FC = () => {
  // State for free-form prompt
  const [prompt, setPrompt] = useState('');

  // State for design idea generator
  const [designProblem, setDesignProblem] = useState('');
  
  // State for persona generator
  const [personaName, setPersonaName] = useState('');
  const [personaGoal, setPersonaGoal] = useState('');
  const [personaTechComfort, setPersonaTechComfort] = useState('');
  const [personaContext, setPersonaContext] = useState('');
  const [personaPainPoints, setPersonaPainPoints] = useState('');

  // Shared state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const handleFreeFormGenerate = async () => {
    if (!prompt) {
      setError('Please enter a prompt.');
      return;
    }
    await generate(prompt);
  };

  const handleDesignIdeaGenerate = async () => {
    if (!designProblem) {
        setError('Please describe the UX problem.');
        return;
    }
    
    const designIdeaPrompt = `
Generate 3-5 distinct design ideas for the following UX problem. For each idea, provide a brief description, a list of pros, and a list of cons. Present the output in a clear, structured format, consistent with the UXCraft persona guidelines.

**UX Problem:** ${designProblem}
    `;

    await generate(designIdeaPrompt);
  };

  const handlePersonaGenerate = async () => {
    if (!personaGoal || !personaPainPoints) {
        setError('Please provide at least a goal and pain points for the persona.');
        return;
    }
    
    const personaPrompt = `
Generate a detailed user persona summary based on the following information. Flesh out the details and present it in a clear, structured format, consistent with the UXCraft persona guidelines.

- **Name:** ${personaName || '(Suggest a name)'}
- **Primary Goal:** ${personaGoal}
- **Tech Comfort Level:** ${personaTechComfort || '(Not specified, please infer)'}
- **Context/Scenario:** ${personaContext || '(Not specified, please infer)'}
- **Key Pain Points:** ${personaPainPoints}
    `;

    await generate(personaPrompt);
  };

  const generate = async (content: string) => {
    setError('');
    setLoading(true);
    setResult('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: content,
        config: {
          systemInstruction: UX_CRAFT_SYSTEM_INSTRUCTION,
          thinkingConfig: { thinkingBudget: 32768 },
        },
      });
      
      if (response && response.text) {
        setResult(response.text);
      } else {
        setError('The AI returned an empty or invalid response. Please try again or refine your inputs.');
      }
    } catch (err) {
      let errorMessage = 'An unexpected error occurred. Please check the console for details.';
      if (err instanceof Error) {
          errorMessage = `API Error: ${err.message}. Please check your API key and network connection.`;
      }
      setError(errorMessage);
      console.error("Gemini API Error:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleDownloadText = () => {
    if (!result) return;
    const blob = new Blob([result], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'ux-genius-output.md');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const FormInput = ({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder: string }) => (
    <div>
        <label className="block mb-1 text-sm font-medium text-gray-300">{label}</label>
        <input
            type="text"
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full p-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none transition"
            disabled={loading}
        />
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Free-form UX Artifact Generator */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-white">UX Genius Mode</h2>
        <p className="text-gray-400 mb-4">
          Leverage Gemini 2.5 Pro with maximum thinking budget for your most complex UX design queries.
        </p>
        <div className="space-y-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Generate user stories, acceptance criteria, and mockup notes for a 'save favorite items' feature in a mobile shopping app."
            className="w-full h-40 p-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none transition"
            disabled={loading}
            aria-label="UX Genius Prompt Input"
          />
          <button
            onClick={handleFreeFormGenerate}
            disabled={loading}
            className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-colors duration-200"
          >
            {loading ? 'Generating...' : 'Generate Artifacts'}
          </button>
        </div>
      </div>

      {/* Design Idea Generator */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-white">Generate Design Ideas</h2>
        <p className="text-gray-400 mb-4">
          Describe a UX problem to get 3-5 potential design solutions, complete with pros and cons for each.
        </p>
        <div className="space-y-4">
          <textarea
            value={designProblem}
            onChange={(e) => setDesignProblem(e.target.value)}
            placeholder="e.g., Users are dropping off during a long and complex sign-up process."
            className="w-full h-32 p-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none transition"
            disabled={loading}
            aria-label="Design Problem Input"
          />
          <button
            onClick={handleDesignIdeaGenerate}
            disabled={loading}
            className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-colors duration-200"
          >
            {loading ? 'Generating...' : 'Generate Ideas'}
          </button>
        </div>
      </div>
      
      {/* Persona Generator */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-white">Generate User Persona</h2>
        <p className="text-gray-400 mb-4">
          Fill in the details below to create a detailed user persona.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput label="Persona Name (Optional)" value={personaName} onChange={(e) => setPersonaName(e.target.value)} placeholder="e.g., Maria the Mobile Shopper" />
          <FormInput label="Primary Goal*" value={personaGoal} onChange={(e) => setPersonaGoal(e.target.value)} placeholder="e.g., Quickly save items to buy later" />
          <FormInput label="Tech Comfort (Optional)" value={personaTechComfort} onChange={(e) => setPersonaTechComfort(e.target.value)} placeholder="e.g., High on mobile, low on desktop" />
          <FormInput label="Context/Scenario (Optional)" value={personaContext} onChange={(e) => setPersonaContext(e.target.value)} placeholder="e.g., Browsing during her commute" />
          <div className="md:col-span-2">
            <label className="block mb-1 text-sm font-medium text-gray-300">Pain Points*</label>
            <textarea
              value={personaPainPoints}
              onChange={(e) => setPersonaPainPoints(e.target.value)}
              placeholder="e.g., Forgets items, loses track of sales, complex checkout..."
              className="w-full h-24 p-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none transition"
              disabled={loading}
              aria-label="Persona Pain Points Input"
            />
          </div>
        </div>
        <button
            onClick={handlePersonaGenerate}
            disabled={loading}
            className="mt-4 w-full sm:w-auto bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-colors duration-200"
          >
            {loading ? 'Generating...' : 'Generate Persona'}
        </button>
      </div>

      {/* Shared Result Display */}
      {loading && (
        <div className="mt-6 text-center" role="status" aria-live="polite">
          <Spinner />
          <p className="mt-2 text-gray-400">The AI is thinking...</p>
        </div>
      )}

      {error && <div className="mt-6 text-red-400 bg-red-900/50 p-3 rounded-lg" role="alert">{error}</div>}

      {result && (
        <div className="mt-6 p-4 bg-gray-900 rounded-lg border border-gray-700">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold text-white">Generated Output</h3>
            <button
              onClick={handleDownloadText}
              className="flex items-center space-x-2 px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              aria-label="Download output"
            >
              <DownloadIcon />
              <span>Download</span>
            </button>
          </div>
          <div className="text-gray-200 whitespace-pre-wrap font-mono text-sm leading-relaxed">{result}</div>
        </div>
      )}
    </div>
  );
};

export default UXGenius;