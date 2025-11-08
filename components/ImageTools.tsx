import React, { useState } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import Spinner from './Spinner';
import { ASPECT_RATIOS } from '../constants';
import { DownloadIcon } from './icons';

type ImageTool = 'generate' | 'edit' | 'analyze';

const ImageTools: React.FC = () => {
  const [activeTool, setActiveTool] = useState<ImageTool>('generate');
  const [prompt, setPrompt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null); // Can be base64 image or text
  const [error, setError] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');

  const fileToBase64 = (file: File): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve({ base64: result.split(',')[1], mimeType: file.type });
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setResult(null); // Clear previous results
    }
  };

  const resetState = () => {
    setPrompt('');
    setImageFile(null);
    setImagePreview(null);
    setResult(null);
    setError('');
    setLoading(false);
  };
  
  const handleToolChange = (tool: ImageTool) => {
    setActiveTool(tool);
    resetState();
  }

  const handleSubmit = async () => {
    setError('');
    setResult(null);
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      if (activeTool === 'generate') {
        if (!prompt) throw new Error('Prompt is required for image generation.');
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: aspectRatio as "1:1" | "3:4" | "4:3" | "9:16" | "16:9",
            },
        });
        const base64Image = response.generatedImages[0].image.imageBytes;
        setResult(`data:image/jpeg;base64,${base64Image}`);
      } else if (activeTool === 'edit' || activeTool === 'analyze') {
        if (!imageFile) throw new Error('An image is required for this operation.');
        if (!prompt) throw new Error('A prompt is required for this operation.');

        const { base64, mimeType } = await fileToBase64(imageFile);
        const imagePart = { inlineData: { data: base64, mimeType } };
        const textPart = { text: prompt };
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [imagePart, textPart] },
            config: activeTool === 'edit' ? { responseModalities: [Modality.IMAGE] } : undefined
        });

        if (activeTool === 'edit') {
            const part = response.candidates?.[0]?.content?.parts?.[0];
            if(part && 'inlineData' in part && part.inlineData) {
                const editedImage = part.inlineData.data;
                setResult(`data:${part.inlineData.mimeType};base64,${editedImage}`);
            } else {
                throw new Error("No image was returned from the API.");
            }
        } else { // analyze
            setResult(response.text);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderForm = () => {
    const commonPrompt = (placeholder: string) => (
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={placeholder}
        className="w-full h-24 p-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none transition"
        disabled={loading}
      />
    );
    const fileInput = (
      <div>
        <label className="block mb-2 text-sm font-medium text-gray-300">Upload Image</label>
        <input type="file" accept="image/*" onChange={handleFileChange} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700" disabled={loading}/>
        {imagePreview && <img src={imagePreview} alt="Preview" className="mt-4 rounded-lg max-h-48 w-auto" />}
      </div>
    );

    switch (activeTool) {
      case 'generate':
        return <div className="space-y-4">
          {commonPrompt("e.g., A futuristic city skyline at sunset, with flying cars and neon lights.")}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-300">Aspect Ratio</label>
            <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="w-full p-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none">
              {ASPECT_RATIOS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>;
      case 'edit':
        return <div className="space-y-4">
          {fileInput}
          {commonPrompt("e.g., Add a retro filter to this image.")}
        </div>;
      case 'analyze':
        return <div className="space-y-4">
          {fileInput}
          {commonPrompt("e.g., Describe the user experience shown in this screenshot.")}
        </div>;
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <div className="flex border-b border-gray-700 mb-4">
        {([ 'generate', 'edit', 'analyze' ] as ImageTool[]).map(tool => (
            <button key={tool} onClick={() => handleToolChange(tool)} className={`capitalize py-2 px-4 text-sm font-medium transition-colors ${activeTool === tool ? 'border-b-2 border-purple-500 text-white' : 'text-gray-400 hover:text-white'}`}>
                {tool}
            </button>
        ))}
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div>
            {renderForm()}
            <button onClick={handleSubmit} disabled={loading} className="mt-4 w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-colors duration-200">
                {loading ? 'Processing...' : `Submit`}
            </button>
        </div>
        <div className="bg-gray-900 rounded-lg p-4 flex flex-col items-center justify-center min-h-[200px] space-y-4">
            {loading && <Spinner />}
            {error && <p className="text-red-400 text-center">{error}</p>}
            {result && (
                (activeTool === 'generate' || activeTool === 'edit') ?
                <>
                  <img src={result} alt="Generated result" className="rounded-lg max-h-96 w-auto" />
                   <a
                    href={result}
                    download="uxcraft-image.jpg"
                    className="flex items-center space-x-2 w-full sm:w-auto justify-center mt-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors duration-200"
                    aria-label="Download image"
                  >
                    <DownloadIcon />
                    <span>Download Image</span>
                  </a>
                </>
                :
                <div className="text-gray-200 whitespace-pre-wrap text-sm self-start w-full">{result}</div>
            )}
            {!loading && !result && !error && <p className="text-gray-500">Your result will appear here</p>}
        </div>
      </div>
    </div>
  );
};

export default ImageTools;