import React, { useState, useEffect } from 'react';
import { Block, BlockType } from '../types';
import BlockComponent from './BlockEditor/Block';
import {
    Bold,
    Italic,
    Heading1,
    Heading2,
    Heading3,
    List,
    Quote,
    Type,
    CheckSquare
} from 'lucide-react';

// Simple ID generator
const generateId = () => Math.random().toString(36).substr(2, 9);

interface DocumentEditorProps {
    content: Block[];
    onUpdate: (newBlocks: Block[]) => void;
    readOnly?: boolean;
}

const initialBlock: Block = {
    id: generateId(),
    type: 'h1',
    content: 'Untitled',
};

const DocumentEditor: React.FC<DocumentEditorProps> = ({ content, onUpdate, readOnly = false }) => {
    // Initialize blocks with content prop, or default if empty
    const [blocks, setBlocks] = useState<Block[]>(() => {
        if (content && content.length > 0) return content;
        return [initialBlock, { id: generateId(), type: 'text', content: '' }];
    });

    const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

    // Sync internal state if props change drastically (optional, but good for note switching)
    useEffect(() => {
        if (content && content !== blocks) {
            // Only update if IDs don't match or completely different (basic check)
            // This avoids cursor reset loops. 
            // A better check implies deep equality or a timestamp, but for now strict ref check + ID check allows switching notes
            if (content.length > 0 && (blocks.length === 0 || content[0].id !== blocks[0].id)) {
                setBlocks(content);
            } else if (readOnly && content.length === 0) {
                // Even if empty, ensure we respect it in readOnly
                setBlocks([]);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [content]);

    // Propagate updates to parent
    useEffect(() => {
        // Prevent loop: Don't call onUpdate if blocks matches incoming content prop
        // (This relies on the fact that we just synced them in the other effect, or strict equality if no changes made)
        if (content === blocks) return;

        // Deep check to prevent loop? 
        // For now, simpler: Rely on the fact that if user types, blocks changes reference and content.
        // If parent updates content, we update blocks (new ref).
        // Then this fires. We must NOT call onUpdate if this 'blocks' came from 'content'.

        // We can use a ref 'isRemoteUpdate'.

        const timer = setTimeout(() => {
            // Check if actually different from prop to break loop
            // Since we don't have deep equality easy access, we trust the parent's stability logic 
            // OR we fix the stability in Notes.tsx (done).
            onUpdate(blocks);
        }, 500);
        return () => clearTimeout(timer);
    }, [blocks, onUpdate]); // Loop risk if onUpdate changes content -> content updates blocks -> blocks updates onUpdate.


    // Focus Logic
    const handleFocus = (id: string) => {
        setActiveBlockId(id);
    };

    // Block CRUD
    const updateBlock = (id: string, content: string, type?: BlockType, isChecked?: boolean) => {
        setBlocks((prev) =>
            prev.map((b) => (b.id === id ? { ...b, content, type: type || b.type, isChecked: isChecked ?? b.isChecked } : b))
        );
    };

    const addBlock = (parentId: string, type: BlockType = 'text') => {
        const newBlock: Block = { id: generateId(), type, content: '' };
        const index = blocks.findIndex((b) => b.id === parentId);
        if (index === -1) return;

        const newBlocks = [...blocks];
        newBlocks.splice(index + 1, 0, newBlock);
        setBlocks(newBlocks);
        setActiveBlockId(newBlock.id);
    };

    const deleteBlock = (id: string) => {
        if (blocks.length <= 1) return; // Don't delete last block
        const index = blocks.findIndex((b) => b.id === id);
        const prevBlock = blocks[index - 1];

        setBlocks((prev) => prev.filter((b) => b.id !== id));
        if (prevBlock) {
            setActiveBlockId(prevBlock.id);
        }
    };

    // Navigation
    const handleArrowUp = (index: number) => {
        if (index > 0) setActiveBlockId(blocks[index - 1].id);
    };

    const handleArrowDown = (index: number) => {
        if (index < blocks.length - 1) setActiveBlockId(blocks[index + 1].id);
    };

    // Toolbar Handlers
    const toggleBlockType = (type: BlockType) => {
        if (!activeBlockId) return;
        const block = blocks.find(b => b.id === activeBlockId);
        if (block) {
            // Toggle off if already active (revert to text), unless it's text
            const newType = block.type === type && type !== 'text' ? 'text' : type;
            updateBlock(activeBlockId, block.content, newType);
        }
    };

    const toggleInlineStyle = (style: string) => {
        document.execCommand(style);
        // Force focus back if needed, though execCommand usually works on selection
    };

    const ToolbarButton = ({
        icon: Icon,
        isActive,
        onClick
    }: {
        icon: any,
        isActive?: boolean,
        onClick: () => void
    }) => (
        <button
            onMouseDown={(e) => {
                e.preventDefault(); // Prevent losing focus from editor
                onClick();
            }}
            className={`p-2 rounded hover:bg-white/10 transition-colors ${isActive ? 'bg-white/20 text-white' : 'text-gray-400'
                }`}
        >
            <Icon size={18} />
        </button>
    );

    const activeBlock = blocks.find(b => b.id === activeBlockId);

    return (
        <div className="bg-[#1e1f22] text-[#e5e7eb] flex flex-col h-full">

            {/* Top Toolbar */}
            {!readOnly && (
                <div className="sticky top-0 z-40 w-full bg-[#2b2d31] border-b border-[#1e1f22] flex justify-center shadow-md shrink-0">
                    <div className="flex items-center gap-1 py-2 px-4 w-full overflow-x-auto">
                        <div className="flex items-center gap-1 border-r border-gray-700 pr-2 mr-2">
                            <ToolbarButton
                                icon={Bold}
                                onClick={() => toggleInlineStyle('bold')}
                            />
                            <ToolbarButton
                                icon={Italic}
                                onClick={() => toggleInlineStyle('italic')}
                            />
                        </div>

                        <div className="flex items-center gap-1">
                            <ToolbarButton
                                icon={Type}
                                isActive={activeBlock?.type === 'text'}
                                onClick={() => toggleBlockType('text')}
                            />
                            <ToolbarButton
                                icon={Heading1}
                                isActive={activeBlock?.type === 'h1'}
                                onClick={() => toggleBlockType('h1')}
                            />
                            <ToolbarButton
                                icon={Heading2}
                                isActive={activeBlock?.type === 'h2'}
                                onClick={() => toggleBlockType('h2')}
                            />
                            <ToolbarButton
                                icon={Heading3}
                                isActive={activeBlock?.type === 'h3'}
                                onClick={() => toggleBlockType('h3')}
                            />
                            <ToolbarButton
                                icon={List}
                                isActive={activeBlock?.type === 'bullet'}
                                onClick={() => toggleBlockType('bullet')}
                            />
                            <ToolbarButton
                                icon={CheckSquare}
                                isActive={activeBlock?.type === 'todo'}
                                onClick={() => toggleBlockType('todo')}
                            />
                            <ToolbarButton
                                icon={Quote}
                                isActive={activeBlock?.type === 'quote'}
                                onClick={() => toggleBlockType('quote')}
                            />
                        </div>
                    </div>
                </div>
            )}

            <div className="w-full flex-1 overflow-y-auto px-12 py-8">
                {/* Editor Area */}
                <div className="flex flex-col gap-1 max-w-3xl mx-auto">
                    {blocks.map((block, index) => (
                        <BlockComponent
                            key={block.id}
                            index={index}
                            block={block}
                            isFocused={activeBlockId === block.id}
                            activeId={activeBlockId}
                            updateBlock={!readOnly ? updateBlock : () => { }}
                            addBlock={!readOnly ? addBlock : () => { }}
                            deleteBlock={!readOnly ? deleteBlock : () => { }}
                            onFocus={!readOnly ? handleFocus : () => { }}
                            onEnter={!readOnly ? (id) => addBlock(id) : () => { }}
                            onArrowUp={handleArrowUp}
                            onArrowDown={handleArrowDown}
                            readOnly={readOnly}
                        />
                    ))}
                </div>

                {/* Bottom spacer */}
                <div
                    className="h-64 cursor-text"
                    onClick={() => {
                        if (blocks.length > 0) {
                            handleFocus(blocks[blocks.length - 1].id);
                        }
                    }}
                />

            </div>
        </div>
    );
};

export default DocumentEditor;
