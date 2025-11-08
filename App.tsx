
import React, { useState } from 'react';
import UXGenius from './components/UXGenius';
import ChatBot from './components/ChatBot';
import ImageTools from './components/ImageTools';
import QuickTools from './components/QuickTools';
import WireframeTool from './components/WireframeTool';
import { BrainIcon, ChatIcon, ImageIcon, ZapIcon, LogoIcon, WireframeIcon } from './components/icons';

type Tab = 'genius' | 'chat' | 'image' | 'quick' | 'wireframe';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('genius');

  const renderContent = () => {
    switch (activeTab) {
      case 'genius':
        return <UXGenius />;
      case 'chat':
        return <ChatBot />;
      case 'image':
        return <ImageTools />;
      case 'quick':
        return <QuickTools />;
      case 'wireframe':
        return <WireframeTool />;
      default:
        return <UXGenius />;
    }
  };

  // FIX: Changed icon type from JSX.Element to React.ReactNode to resolve "Cannot find namespace 'JSX'" error.
  const TabButton = ({ tabName, label, icon }: { tabName: Tab; label: string; icon: React.ReactNode }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
        activeTab === tabName
          ? 'bg-purple-600 text-white'
          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      <div className="container mx-auto px-4 py-6">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <LogoIcon />
            <h1 className="text-2xl font-bold text-white">UXCraft AI</h1>
          </div>
        </header>

        <nav className="mb-8 p-2 bg-gray-800 rounded-lg flex flex-wrap items-center justify-center sm:justify-start space-x-1 sm:space-x-2">
          <TabButton tabName="genius" label="UX Genius" icon={<BrainIcon />} />
          <TabButton tabName="chat" label="Chat Bot" icon={<ChatIcon />} />
          <TabButton tabName="image" label="Image Studio" icon={<ImageIcon />} />
          <TabButton tabName="wireframe" label="Wireframer" icon={<WireframeIcon />} />
          <TabButton tabName="quick" label="Quick Tools" icon={<ZapIcon />} />
        </nav>

        <main>
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;
