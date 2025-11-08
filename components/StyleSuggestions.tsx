import React, { useState } from 'react';
import { WireframeComponent } from './WireframeTool';

const SuggestionBlock: React.FC<{ title: string; code: string; language: string; }> = ({ title, code, language }) => {
    const [copied, setCopied] = useState(false);
    
    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div>
            <h4 className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">{title}</h4>
            <div className="relative bg-gray-800 p-3 rounded-md border border-gray-700 font-mono text-xs">
                <button onClick={handleCopy} className="absolute top-2 right-2 px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 rounded transition-colors font-sans">
                    {copied ? 'Copied!' : 'Copy'}
                </button>
                <pre className="whitespace-pre-wrap"><code className={`language-${language}`}>{code}</code></pre>
            </div>
        </div>
    );
};

const StyleSuggestions: React.FC<{ component: WireframeComponent | null; theme: 'light' | 'dark' }> = ({ component, theme }) => {
    if (!component) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500 text-center">
                <p>Select a component in the preview to get style refinement suggestions.</p>
            </div>
        );
    }

    const generateSuggestions = () => {
        let tailwindSuggestions: string[] = [];
        let cssSuggestions: string[] = [];

        switch (component.type) {
            case 'header':
                tailwindSuggestions = [
                    'text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600',
                    'tracking-tight pb-2 border-b-2 border-purple-500/50',
                    'font-extrabold',
                ];
                cssSuggestions = [
                    `text-shadow: 1px 1px 3px ${theme === 'dark' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.2)'};`,
                ];
                break;
            case 'button':
                tailwindSuggestions = [
                    'transition-transform transform hover:scale-105',
                    'shadow-lg hover:shadow-purple-500/50',
                    'rounded-full px-8 py-3',
                    'flex items-center justify-center space-x-2',
                ];
                 cssSuggestions = [
                    `background: linear-gradient(45deg, #8B5CF6, #EC4899);`,
                    `box-shadow: 0 4px 14px 0 ${theme === 'dark' ? 'rgba(192, 132, 252, 0.39)' : 'rgba(0, 0, 0, 0.2)'};`,
                 ];
                break;
            case 'input':
                tailwindSuggestions = [
                    'focus:ring-2 focus:ring-purple-500 focus:border-transparent',
                    'transition duration-300 ease-in-out',
                    `shadow-inner ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`,
                ];
                cssSuggestions = [
                    `caret-color: #8B5CF6;`,
                    `box-shadow: inset 0 2px 4px 0 ${theme === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.06)'};`
                ];
                break;
            case 'card':
                tailwindSuggestions = [
                    `hover:shadow-2xl hover:-translate-y-1 transition-all duration-300`,
                    `border-l-4 border-purple-500`,
                    `rounded-xl`,
                ];
                if (theme === 'dark') {
                    tailwindSuggestions.push('backdrop-blur-sm bg-white/5');
                }
                cssSuggestions = [
                    `box-shadow: ${theme === 'dark' ? '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)' : '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'};`,
                ];
                break;
            case 'image_placeholder':
                 tailwindSuggestions = [
                    'rounded-xl overflow-hidden',
                    'border-purple-500/50',
                    'bg-cover bg-center',
                 ];
                 cssSuggestions = [
                    `background-image: url('https://source.unsplash.com/random/400x300?abstract');`,
                 ]
                 break;
            default:
                return null;
        }
        
        return {
            tailwind: tailwindSuggestions.join('\n'),
            css: cssSuggestions.join('\n')
        };
    };

    const suggestions = generateSuggestions();

    if (!suggestions) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                <p>No specific suggestions for this component type.</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
             <div>
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Suggestions For</span>
                <p className="text-lg font-semibold text-purple-400 capitalize">{component.type.replace(/_/g, ' ')}</p>
            </div>
            <SuggestionBlock title="Tailwind CSS Classes" code={suggestions.tailwind} language="css" />
            <SuggestionBlock title="CSS Style Properties" code={suggestions.css} language="css" />
        </div>
    );
};

export default StyleSuggestions;
