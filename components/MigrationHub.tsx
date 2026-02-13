import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Link as LinkIcon, FileType, Check, AlertCircle, Loader2, X } from 'lucide-react';
import { MigrationService } from '../services/migrationService';
import { Block } from '../types';

interface MigrationHubProps {
    onImport: (blocks: Block[], title: string) => void;
    onClose: () => void;
}

const MigrationHub: React.FC<MigrationHubProps> = ({ onImport, onClose }) => {
    const [activeTab, setActiveTab] = useState<'file' | 'link'>('file');
    const [dragActive, setDragActive] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    
    // Link Input
    const [linkInput, setLinkInput] = useState('');

    const handleFiles = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        
        const file = files[0];
        setLoading(true);
        setError(null);

        try {
            const blocks = await MigrationService.processFile(file);
            if (blocks.length === 0) throw new Error("No content extracted.");
            onImport(blocks, file.name.replace(/\.[^/.]+$/, ""));
            setSuccess(true);
            setTimeout(onClose, 1500); // Close after success
        } catch (err) {
            setError(err instanceof Error ? err.message : "Import failed");
        } finally {
            setLoading(false);
        }
    };

    const handlePasteImport = async () => {
        if (!linkInput.trim()) return;
        
        setLoading(true);
        setError(null);

        try {
            // Updated to be async
            const blocks = await MigrationService.processContent(linkInput, 'markdown');
            onImport(blocks, "Imported Content");
            setSuccess(true);
            setTimeout(onClose, 1500);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to parse content.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#1e1f22] w-full max-w-2xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#2b2d31]">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <FileType className="text-[#5865F2]" /> Import to Notes
                        </h2>
                        <p className="text-sm text-gray-400">Bring your content from Docs, Notion, PDF, or Slides.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/5">
                    <button 
                        onClick={() => setActiveTab('file')}
                        className={`flex-1 p-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative
                            ${activeTab === 'file' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}
                        `}
                    >
                        <Upload size={16} /> Upload File
                        {activeTab === 'file' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5865F2]" />}
                    </button>
                    <button 
                        onClick={() => setActiveTab('link')}
                        className={`flex-1 p-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative
                            ${activeTab === 'link' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}
                        `}
                    >
                        <LinkIcon size={16} /> Paste Content / Link
                        {activeTab === 'link' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5865F2]" />}
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 min-h-[300px] flex flex-col justify-center items-center">
                    {loading ? (
                        <div className="flex flex-col items-center gap-4 text-gray-400">
                            <Loader2 size={40} className="animate-spin text-[#5865F2]" />
                            <p>Analyzing and converting content...</p>
                        </div>
                    ) : success ? (
                        <div className="flex flex-col items-center gap-4 text-green-400">
                            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                                <Check size={32} />
                            </div>
                            <p className="text-lg font-bold text-white">Import Successful!</p>
                        </div>
                    ) : (
                        loading === false && (
                            <>
                                {activeTab === 'file' && (
                                    <div 
                                        className={`w-full h-64 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-4 transition-all
                                            ${dragActive ? 'border-[#5865F2] bg-[#5865F2]/10' : 'border-white/10 hover:border-white/20 bg-white/5'}
                                        `}
                                        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                                        onDragLeave={() => setDragActive(false)}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            setDragActive(false);
                                            handleFiles(e.dataTransfer.files);
                                        }}
                                    >
                                        <div className="w-16 h-16 rounded-full bg-[#2b2d31] flex items-center justify-center text-gray-400">
                                            <Upload size={32} />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-white font-medium mb-1">Drag & drop your file here</p>
                                            <p className="text-sm text-gray-500">Supports PDF, DOCX, PPTX</p>
                                        </div>
                                        <label className="px-6 py-2 bg-[#5865F2] hover:bg-[#4752c4] text-white rounded-lg cursor-pointer transition-colors shadow-lg shadow-[#5865F2]/20 font-medium text-sm">
                                            Browse Files
                                            <input 
                                                type="file" 
                                                className="hidden" 
                                                accept=".pdf,.docx,.doc,.pptx,.ppt,.txt,.md"
                                                onChange={(e) => handleFiles(e.target.files)}
                                            />
                                        </label>
                                    </div>
                                )}

                                {activeTab === 'link' && (
                                    <div className="w-full flex-1 flex flex-col gap-4">
                                        <div className="bg-[#2b2d31] p-4 rounded-xl border border-yellow-500/20 text-yellow-200/80 text-sm flex gap-3">
                                            <AlertCircle className="shrink-0" size={18} />
                                            <p>Paste a URL to fetch its content, or paste the text content directly from your document.</p>
                                        </div>
                                        <textarea 
                                            value={linkInput}
                                            onChange={(e) => {
                                                setLinkInput(e.target.value);
                                                if(error) setError(null);
                                            }}
                                            placeholder="Paste URL or document content here..."
                                            className="flex-1 w-full bg-[#1e1f22] border border-white/10 rounded-xl p-4 text-gray-300 focus:outline-none focus:border-[#5865F2] resize-none font-mono text-sm"
                                        />
                                        <button 
                                            onClick={handlePasteImport}
                                            disabled={!linkInput.trim()}
                                            className="w-full py-3 bg-[#5865F2] hover:bg-[#4752c4] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all"
                                        >
                                            Fetch & Import
                                        </button>
                                    </div>
                                )}
                            </>
                        )
                    )}

                    {error && (
                        <div className="mt-4 w-full p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default MigrationHub;
