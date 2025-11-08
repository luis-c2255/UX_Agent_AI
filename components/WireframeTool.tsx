
import React, { useState } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import Spinner from './Spinner';
import StyleSuggestions from './StyleSuggestions';

export interface WireframeComponent {
  type: 'header' | 'text_block' | 'input' | 'button' | 'image_placeholder' | 'card' | 'spacer';
  properties: {
    text?: string;
    placeholder?: string;
    variant?: 'primary' | 'secondary' | 'outline';
    size?: 'small' | 'medium' | 'large';
    color?: 'primary' | 'secondary' | 'accent' | 'danger' | 'default';
    backgroundColor?: string; // e.g., 'bg-blue-500'
    alignment?: 'left' | 'center' | 'right';
    fontWeight?: 'normal' | 'bold';
    fontSize?: 'small' | 'medium' | 'large';
  };
  position?: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  style?: {
    borderRadius?: string;
    boxShadow?: string;
    opacity?: number;
  };
}


export interface WireframeData {
  screenTitle: string;
  theme: 'light' | 'dark';
  spacing: 'compact' | 'normal' | 'loose';
  layout: 'single-column' | 'two-column-sidebar-left' | 'two-column-sidebar-right' | 'grid-2x2' | 'absolute';
  components: WireframeComponent[];
}

const WIREFRAME_SYSTEM_INSTRUCTION = `You are an AI wireframing assistant. Based on the user's prompt, generate a JSON object describing a basic screen layout. The JSON must strictly follow the provided schema. Use common UI components and sensible defaults. Focus on structure and content, not just styling. Pay attention to details like theme, spacing, colors, and alignment to create a visually representative wireframe. For complex layouts, use the 'absolute' layout and provide a 'position' object (top, left, width, height as percentages) for each component. You can also provide an optional 'style' object for additional CSS properties like borderRadius.`;

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        screenTitle: { type: Type.STRING, description: 'A descriptive title for the screen, e.g., "User Login Screen".' },
        theme: { type: Type.STRING, description: "The overall color theme. Valid options: 'light', 'dark'." },
        spacing: { type: Type.STRING, description: "The gap between components for flow layouts. Valid options: 'compact', 'normal', 'loose'." },
        layout: { type: Type.STRING, description: "The overall layout. Valid options: 'single-column', 'two-column-sidebar-left', 'two-column-sidebar-right', 'grid-2x2', 'absolute'." },
        components: {
            type: Type.ARRAY,
            description: 'An array of UI components on the screen.',
            items: {
                type: Type.OBJECT,
                properties: {
                    type: { type: Type.STRING, description: "Component type. Valid options: 'header', 'text_block', 'input', 'button', 'image_placeholder', 'card', 'spacer'." },
                    properties: {
                        type: Type.OBJECT,
                        properties: {
                            text: { type: Type.STRING },
                            placeholder: { type: Type.STRING },
                            variant: { type: Type.STRING, description: "Options: 'primary', 'secondary', 'outline'." },
                            size: { type: Type.STRING, description: 'Options: "small", "medium", "large".' },
                            color: { type: Type.STRING, description: "Options: 'primary', 'secondary', 'accent', 'danger', 'default'." },
                            backgroundColor: { type: Type.STRING },
                            alignment: { type: Type.STRING, description: "Options: 'left', 'center', 'right'." },
                            fontWeight: { type: Type.STRING, description: "Options: 'normal', 'bold'." },
                            fontSize: { type: Type.STRING, description: "Options: 'small', 'medium', 'large'." },
                        },
                    },
                    position: {
                        type: Type.OBJECT,
                        description: "Required for 'absolute' layout. All values are percentages (0-100).",
                        properties: {
                            top: { type: Type.NUMBER },
                            left: { type: Type.NUMBER },
                            width: { type: Type.NUMBER },
                            height: { type: Type.NUMBER },
                        },
                    },
                    style: {
                        type: Type.OBJECT,
                        description: "Optional additional CSS styles.",
                        properties: {
                            borderRadius: { type: Type.STRING },
                            boxShadow: { type: Type.STRING },
                            opacity: { type: Type.NUMBER },
                        },
                    },
                },
                required: ['type', 'properties'],
            },
        },
    },
    required: ['screenTitle', 'theme', 'spacing', 'layout', 'components'],
};

const PropertiesInspector: React.FC<{ component: WireframeComponent | null }> = ({ component }) => {
    if (!component) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500 text-center">
                <p>Click an element in the preview to inspect its properties.</p>
            </div>
        );
    }
    
    const PropertyRow: React.FC<{ label: string; value: any }> = ({ label, value }) => (
         <div className="grid grid-cols-2 items-center">
            <span className="text-gray-300 capitalize">{label.replace(/([A-Z])/g, ' $1')}</span>
            <span className="text-white font-mono bg-gray-700 px-2 py-1 rounded text-right text-xs truncate">{String(value)}</span>
        </div>
    );
    
    const PropertyGroup: React.FC<{ title: string; data: object | undefined; }> = ({ title, data }) => {
        if (!data) return null;
        const entries = Object.entries(data).filter(([_, value]) => value !== undefined && value !== null && value !== '');
        if (entries.length === 0) return null;
        
        return (
            <div>
                <h4 className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">{title}</h4>
                <div className="space-y-2 bg-gray-800 p-3 rounded-md border border-gray-700">
                    {entries.map(([key, value]) => <PropertyRow key={key} label={key} value={value} />)}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 text-sm">
            <div>
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Component Type</span>
                <p className="text-lg font-semibold text-purple-400 capitalize">{component.type.replace(/_/g, ' ')}</p>
            </div>
            <PropertyGroup title="Properties" data={component.properties} />
            <PropertyGroup title="Position" data={component.position} />
            <PropertyGroup title="Style" data={component.style} />
        </div>
    );
};

const WireframePreview: React.FC<{ data: WireframeData, selectedIndex: number | null, onSelect: (index: number | null) => void, renderStyle: 'clean' | 'sketch' }> = ({ data, selectedIndex, onSelect, renderStyle }) => {
    const isSketch = renderStyle === 'sketch';

    const themeClasses = {
        light: { bg: 'bg-white', text: 'text-gray-800', textSecondary: 'text-gray-500', border: 'border-gray-300', inputBg: 'bg-gray-100', placeholder: 'text-gray-400', cardBg: 'bg-white' },
        dark: { bg: 'bg-gray-900/70', text: 'text-white', textSecondary: 'text-gray-300', border: 'border-gray-700', inputBg: 'bg-gray-700', placeholder: 'text-gray-400', cardBg: 'bg-gray-800' }
    };
    const currentTheme = themeClasses[data.theme] || themeClasses.dark;

    const renderComponent = (component: WireframeComponent, index: number) => {
        const { type, properties, position, style } = component;
        const isSelected = selectedIndex === index;

        const baseInteractiveProps = {
            key: index,
            onClick: (e: React.MouseEvent) => {
                e.stopPropagation();
                onSelect(index);
            },
        };

        if (isSketch) {
            const sketchBaseClasses = 'transition-transform duration-100 cursor-pointer border-2 border-gray-600 dark:border-gray-400 transform hover:scale-105';
            const selectedSketchClasses = 'ring-2 ring-purple-500 shadow-xl';
            
            const rotations = ['-rotate-1', 'rotate-1', '-rotate-2', 'rotate-2'];
            const randomRotate = rotations[index % rotations.length];

            const interactiveProps = { ...baseInteractiveProps, className: `${sketchBaseClasses} ${randomRotate} ${isSelected ? selectedSketchClasses : ''}` };

            const positionStyle = data.layout === 'absolute' && position ? { top: `${position.top}%`, left: `${position.left}%`, width: `${position.width}%`, height: `${position.height}%`, position: 'absolute' as const } : {};
            
            switch (type) {
                case 'header':
                    return <h2 {...interactiveProps} style={positionStyle} className={`${interactiveProps.className} p-2 text-2xl font-bold`}>{properties.text || 'Header'}</h2>;
                case 'text_block':
                    return <p {...interactiveProps} style={positionStyle} className={`${interactiveProps.className} p-2`}>{properties.text || 'Lorem ipsum dolor sit amet...'}</p>;
                case 'input':
                    return <div {...interactiveProps} style={positionStyle} className={`${interactiveProps.className} p-3 text-gray-500`}>{properties.placeholder || 'Input Field'}</div>;
                case 'button':
                    return <div {...interactiveProps} style={positionStyle} className={`${interactiveProps.className} p-3 text-center font-semibold bg-gray-300 dark:bg-gray-700 shadow-[2px_2px_0px_currentColor] hover:shadow-[1px_1px_0px_currentColor] active:shadow-none active:translate-x-px active:translate-y-px`}>{properties.text || 'Button'}</div>;
                case 'image_placeholder':
                    return <div {...interactiveProps} style={positionStyle} className={`${interactiveProps.className} h-32 flex items-center justify-center text-gray-500 dark:text-gray-400 relative overflow-hidden`}>
                        <div className="absolute w-[150%] h-0.5 bg-current transform rotate-45"></div>
                        <div className="absolute w-[150%] h-0.5 bg-current transform -rotate-45"></div>
                        Image
                    </div>;
                case 'card':
                     return <div {...interactiveProps} style={positionStyle} className={`${interactiveProps.className} p-4`}><p>{properties.text || 'Card Component'}</p></div>;
                case 'spacer':
                    const height = { small: 'h-4', medium: 'h-8', large: 'h-16' }[properties.size || 'medium'];
                    return <div {...interactiveProps} style={positionStyle} className={`${interactiveProps.className} ${height} w-full !border-transparent !shadow-none hover:bg-gray-500/10`}></div>;
                default:
                    return <div key={index} style={positionStyle} className="text-red-400">Unknown component type: {type}</div>;
            }
        } else {
            const baseClasses = 'transition-all duration-200 w-full cursor-pointer transform';
            const unselectedClasses = 'hover:scale-105 hover:shadow-lg';
            const selectedClasses = `ring-2 ring-purple-500 shadow-xl hover:scale-[1.02] hover:shadow-2xl ${data.layout === 'absolute' ? '' : 'hover:-translate-y-1'}`;

            const interactiveProps = { ...baseInteractiveProps, className: `${baseClasses} ${isSelected ? selectedClasses : unselectedClasses}` };

            const positionStyle = data.layout === 'absolute' && position ? { top: `${position.top}%`, left: `${position.left}%`, width: `${position.width}%`, height: `${position.height}%`, position: 'absolute' as const, ...style } : { ...style };
            
            const getColorClass = (color?: string) => {
                switch(color) { case 'primary': case 'accent': return 'text-purple-400'; case 'secondary': return currentTheme.textSecondary; case 'danger': return 'text-red-500'; default: return currentTheme.text; }
            }
            const alignmentClass = `text-${properties.alignment || 'left'}`;
            const fontWeightClass = `font-${properties.fontWeight || 'normal'}`;
            const fontSizeClass = { small: 'text-sm', medium: 'text-base', large: 'text-lg' }[properties.fontSize || 'medium'];
            const baseTextClasses = `${alignmentClass} ${fontWeightClass} ${fontSizeClass} ${getColorClass(properties.color)}`;
        
            switch (type) {
                case 'header':
                    return <h2 {...interactiveProps} style={positionStyle} className={`${interactiveProps.className} text-2xl font-bold rounded-md p-1 ${baseTextClasses}`}>{properties.text || 'Header'}</h2>;
                case 'text_block':
                    return <p {...interactiveProps} style={positionStyle} className={`${interactiveProps.className} rounded-md p-1 ${baseTextClasses}`}>{properties.text || 'Lorem ipsum dolor sit amet...'}</p>;
                case 'input':
                    return <div {...interactiveProps} style={positionStyle} className={`${interactiveProps.className} p-3 ${currentTheme.inputBg} ${currentTheme.border} border rounded-lg ${currentTheme.placeholder}`}>{properties.placeholder || 'Input Field'}</div>;
                case 'button':
                    let buttonClass = 'bg-purple-600 hover:bg-purple-700 text-white';
                    if (properties.variant === 'secondary') buttonClass = data.theme === 'dark' ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800';
                    else if (properties.variant === 'outline') buttonClass = 'bg-transparent border border-purple-500 text-purple-500 hover:bg-purple-500/10';
                    if (properties.backgroundColor) buttonClass = `${properties.backgroundColor} text-white`;
                    return <div {...interactiveProps} style={positionStyle} className={`${interactiveProps.className} p-3 rounded-lg text-center font-semibold ${buttonClass}`}>{properties.text || 'Button'}</div>;
                case 'image_placeholder':
                    return <div {...interactiveProps} style={positionStyle} className={`${interactiveProps.className} h-32 ${currentTheme.inputBg} border-2 border-dashed ${currentTheme.border} rounded-lg flex items-center justify-center ${currentTheme.placeholder}`}>Image Placeholder</div>;
                case 'card':
                     return <div {...interactiveProps} style={positionStyle} className={`${interactiveProps.className} p-4 ${properties.backgroundColor || currentTheme.cardBg} border ${currentTheme.border} rounded-lg`}><p className={`${currentTheme.textSecondary}`}>{properties.text || 'Card Component'}</p></div>;
                case 'spacer':
                    const height = { small: 'h-4', medium: 'h-8', large: 'h-16' }[properties.size || 'medium'];
                    return <div {...interactiveProps} style={positionStyle} className={`${interactiveProps.className} ${height} w-full border-2 border-dashed border-transparent hover:border-gray-600 rounded-md`}></div>;
                default:
                    return <div key={index} style={positionStyle} className="text-red-400">Unknown component type: {type}</div>;
            }
        }
    };

    const spacingClass = { compact: 'gap-2', normal: 'gap-4', loose: 'gap-8' }[data.spacing] || 'gap-4';
    let layoutClass = `flex flex-col ${spacingClass}`;
    let mainContent = data.components.map(renderComponent);

    if (data.layout === 'absolute') {
        layoutClass = `relative h-[600px] w-full`;
    } else {
        if (data.layout === 'two-column-sidebar-left' || data.layout === 'two-column-sidebar-right') layoutClass = `grid md:grid-cols-3 ${spacingClass}`;
        else if (data.layout === 'grid-2x2') layoutClass = `grid md:grid-cols-2 ${spacingClass}`;

        if (data.layout === 'two-column-sidebar-left') {
            const sidebarCount = Math.ceil(mainContent.length / 3);
            return <div className={`p-4 border ${isSketch ? 'border-gray-400 bg-amber-50 dark:bg-[#282a2d]' : `${currentTheme.border} ${currentTheme.bg}`} rounded-lg ${isSketch ? 'font-sketch text-gray-800 dark:text-gray-200' : ''}`} onClick={() => onSelect(null)}>
                <h3 className={`text-lg font-semibold mb-4 text-purple-400`}>{data.screenTitle}</h3>
                <div className={layoutClass}>
                    <div className={`md:col-span-1 flex flex-col ${spacingClass}`}>{mainContent.slice(0, sidebarCount)}</div>
                    <div className={`md:col-span-2 flex flex-col ${spacingClass}`}>{mainContent.slice(sidebarCount)}</div>
                </div>
            </div>
        } else if (data.layout === 'two-column-sidebar-right') {
            const sidebarCount = Math.ceil(mainContent.length / 3);
            return <div className={`p-4 border ${isSketch ? 'border-gray-400 bg-amber-50 dark:bg-[#282a2d]' : `${currentTheme.border} ${currentTheme.bg}`} rounded-lg ${isSketch ? 'font-sketch text-gray-800 dark:text-gray-200' : ''}`} onClick={() => onSelect(null)}>
                <h3 className={`text-lg font-semibold mb-4 text-purple-400`}>{data.screenTitle}</h3>
                <div className={layoutClass}>
                    <div className={`md:col-span-2 flex flex-col ${spacingClass}`}>{mainContent.slice(0, mainContent.length - sidebarCount)}</div>
                    <div className={`md:col-span-1 flex flex-col ${spacingClass}`}>{mainContent.slice(mainContent.length - sidebarCount)}</div>
                </div>
            </div>
        }
    }
    
    return (
        <div className={`p-4 border ${isSketch ? 'border-gray-400 bg-amber-50 dark:bg-[#282a2d]' : `${currentTheme.border} ${currentTheme.bg}`} rounded-lg ${isSketch ? 'font-sketch text-gray-800 dark:text-gray-200' : ''}`} onClick={() => onSelect(null)}>
            <h3 className={`text-lg font-semibold mb-4 text-purple-400`}>{data.screenTitle}</h3>
            <div className={layoutClass}>{mainContent}</div>
        </div>
    );
};


const WireframeTool: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<WireframeData | null>(null);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const [selectedComponentIndex, setSelectedComponentIndex] = useState<number | null>(null);
    const [rightPanelTab, setRightPanelTab] = useState<'properties' | 'json' | 'suggestions'>('properties');
    const [renderStyle, setRenderStyle] = useState<'clean' | 'sketch'>('clean');


    const handleSubmit = async () => {
        if (!prompt) {
            setError('Please enter a prompt to generate a wireframe.');
            return;
        }
        setError('');
        setResult(null);
        setLoading(true);
        setSelectedComponentIndex(null);
        setRightPanelTab('properties');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: prompt,
                config: {
                    systemInstruction: WIREFRAME_SYSTEM_INSTRUCTION,
                    responseMimeType: 'application/json',
                    responseSchema,
                }
            });

            const jsonText = response.text.trim();
            const parsedResult = JSON.parse(jsonText);
            setResult(parsedResult);
        } catch (err) {
            setError(err instanceof Error ? `Error: ${err.message}` : 'An unknown error occurred while generating the wireframe.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (!result) return;
        navigator.clipboard.writeText(JSON.stringify(result, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const selectedComponent = selectedComponentIndex !== null && result ? result.components[selectedComponentIndex] : null;

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg space-y-6">
            <div>
                <h2 className="text-xl font-semibold mb-2 text-white">AI Wireframer</h2>
                <p className="text-gray-400 mb-4">
                    Describe a screen or user interface, and the AI will generate a detailed wireframe structure for you.
                </p>
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., A user profile screen for a social media app with a profile picture, name, bio, and a grid of photos."
                    className="w-full h-32 p-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none transition"
                    disabled={loading}
                />
                 <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-colors duration-200"
                    >
                        {loading ? 'Generating...' : 'Generate Wireframe'}
                    </button>
                    <div className="flex items-center space-x-2">
                        <span className="text-gray-400 text-sm font-medium">Render Style:</span>
                        <div className="flex items-center rounded-lg bg-gray-700 p-1">
                            <button onClick={() => setRenderStyle('clean')} className={`px-3 py-1 text-sm rounded-md transition-colors ${renderStyle === 'clean' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>Clean</button>
                            <button onClick={() => setRenderStyle('sketch')} className={`px-3 py-1 text-sm rounded-md transition-colors ${renderStyle === 'sketch' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>Sketch</button>
                        </div>
                    </div>
                </div>
            </div>

            {loading && <div className="text-center"><Spinner /></div>}
            {error && <p className="text-red-400 bg-red-900/50 p-3 rounded-lg">{error}</p>}

            {result && (
                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-2">Visual Preview</h3>
                        <WireframePreview data={result} selectedIndex={selectedComponentIndex} onSelect={setSelectedComponentIndex} renderStyle={renderStyle} />
                    </div>
                    <div className="flex flex-col min-h-[400px]">
                         <div className="flex border-b border-gray-700">
                            <button onClick={() => setRightPanelTab('properties')} className={`capitalize py-2 px-4 text-sm font-medium transition-colors ${rightPanelTab === 'properties' ? 'border-b-2 border-purple-500 text-white' : 'text-gray-400 hover:text-white'}`}>
                                Properties
                            </button>
                             <button onClick={() => setRightPanelTab('suggestions')} className={`capitalize py-2 px-4 text-sm font-medium transition-colors ${rightPanelTab === 'suggestions' ? 'border-b-2 border-purple-500 text-white' : 'text-gray-400 hover:text-white'}`}>
                                Suggestions
                            </button>
                            <button onClick={() => setRightPanelTab('json')} className={`capitalize py-2 px-4 text-sm font-medium transition-colors ${rightPanelTab === 'json' ? 'border-b-2 border-purple-500 text-white' : 'text-gray-400 hover:text-white'}`}>
                                JSON Output
                            </button>
                        </div>
                        <div className="bg-gray-900/70 p-4 rounded-b-lg rounded-tr-lg flex-grow relative">
                            {rightPanelTab === 'properties' && <PropertiesInspector component={selectedComponent} />}
                            {rightPanelTab === 'suggestions' && <StyleSuggestions component={selectedComponent} theme={result.theme} />}
                            {rightPanelTab === 'json' && (
                                <>
                                    <button onClick={handleCopy} className="absolute top-0 right-0 mt-3 mr-3 px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors z-10">
                                        {copied ? 'Copied!' : 'Copy'}
                                    </button>
                                    <pre className="text-sm text-gray-200 rounded-lg overflow-auto h-full max-h-[500px] w-full">
                                        {JSON.stringify(result, null, 2)}
                                    </pre>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WireframeTool;