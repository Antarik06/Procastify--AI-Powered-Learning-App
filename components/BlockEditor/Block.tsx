import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Block, BlockType } from '../../types';
import { GripVertical, CheckSquare, Square } from 'lucide-react';

interface BlockProps {
    block: Block;
    isFocused: boolean;
    index: number;
    updateBlock: (id: string, content: string, type?: BlockType, isChecked?: boolean) => void;
    addBlock: (parentId: string, type?: BlockType) => void;
    deleteBlock: (id: string) => void;
    onFocus: (id: string) => void;
    onEnter: (id: string, e: React.KeyboardEvent) => void;
    onArrowUp: (index: number) => void;
    onArrowDown: (index: number) => void;
    activeId: string | null;
    readOnly?: boolean;
}

const BlockComponent: React.FC<BlockProps> = ({
    block,
    isFocused,
    index,
    updateBlock,
    addBlock,
    deleteBlock,
    onFocus,
    onEnter,
    onArrowUp,
    onArrowDown,
    readOnly = false
}) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const [showMenu, setShowMenu] = useState(false);

    // Sync Content: Only update DOM if it differs from React state
    // This prevents the "cursor jump/reverse writing" issue caused by React re-rendering 
    // the contentEditable div while typing.
    useEffect(() => {
        if (contentRef.current && contentRef.current.innerHTML !== block.content) {
            contentRef.current.innerHTML = block.content;
        }
    }, [block.content]);

    // Focus management
    useEffect(() => {
        if (!readOnly && isFocused && contentRef.current) {
            const el = contentRef.current;
            if (document.activeElement !== el) {
                el.focus();
                // Move cursor to end
                if (typeof window.getSelection !== "undefined" && typeof document.createRange !== "undefined") {
                    const range = document.createRange();
                    range.selectNodeContents(el);
                    range.collapse(false);
                    const sel = window.getSelection();
                    sel?.removeAllRanges();
                    sel?.addRange(range);
                }
            }
        }
    }, [isFocused, readOnly]);

    // Handle Input 
    const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
        if (readOnly) return;
        const html = e.currentTarget.innerHTML;
        const text = e.currentTarget.innerText;

        // Simple Markdown Shortcuts
        if (block.type === 'text') {
            if (text.startsWith('# ') && text.length === 2) {
                updateBlock(block.id, '', 'h1');
                return;
            }
            if (text.startsWith('## ') && text.length === 3) {
                updateBlock(block.id, '', 'h2');
                return;
            }
            if ((text.startsWith('* ') || text.startsWith('- ')) && text.length === 2) {
                updateBlock(block.id, '', 'bullet');
                return;
            }
            if (text.startsWith('> ') && text.length === 2) {
                updateBlock(block.id, '', 'quote');
                return;
            }
            if (text.startsWith('[] ') && text.length === 3) {
                updateBlock(block.id, '', 'todo');
                return;
            }
        }

        // Normal Update
        updateBlock(block.id, html);
    }, [block, updateBlock, readOnly]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (readOnly) {
            e.preventDefault();
            return;
        }
        if (e.key === 'Enter') {
            if (e.shiftKey) return;
            e.preventDefault();
            onEnter(block.id, e);
        } else if (e.key === 'Backspace') {
            // Logic to merge or delete block if empty
            if (contentRef.current && contentRef.current.innerText.length === 0 && block.content === '') {
                e.preventDefault();
                deleteBlock(block.id);
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            onArrowUp(index);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            onArrowDown(index);
        }
    };

    // Styles based on type
    const getStyles = () => {
        switch (block.type) {
            case 'h1': return 'text-4xl font-bold mt-6 mb-2 text-white';
            case 'h2': return 'text-2xl font-semibold mt-4 mb-2 text-gray-200';
            case 'h3': return 'text-xl font-semibold mt-3 mb-1 text-gray-300';
            case 'quote': return 'border-l-4 border-gray-500 pl-4 italic text-gray-400 my-2';
            case 'bullet': return 'ml-0';
            case 'todo': return 'ml-0';
            default: return 'text-base min-h-[1.5em] text-gray-300 py-1 leading-relaxed';
        }
    };

    const placeholder = block.type === 'h1' ? 'Heading 1' :
        block.type === 'h2' ? 'Heading 2' :
            block.type === 'h3' ? 'Heading 3' :
                block.type === 'quote' ? 'Empty quote' :
                    'Type text...';

    const renderPrefix = () => {
        if (block.type === 'bullet') {
            return <span className="mr-2 text-xl leading-relaxed select-none text-gray-400">•</span>;
        }
        if (block.type === 'todo') {
            return (
                <div
                    className={`mr-2 cursor-pointer mt-1 text-gray-400 ${!readOnly && 'hover:text-blue-400'}`}
                    onClick={() => !readOnly && updateBlock(block.id, block.content, block.type, !block.isChecked)}
                    contentEditable={false}
                >
                    {block.isChecked ? <CheckSquare size={18} /> : <Square size={18} />}
                </div>
            );
        }
        return null;
    };

    return (
        <div
            className="group relative flex items-start -ml-8 pl-8 py-0.5"
            onMouseEnter={() => setShowMenu(true)}
            onMouseLeave={() => setShowMenu(false)}
        >
            {/* Drag Handle */}
            {!readOnly && (
                <div
                    className={`absolute left-0 top-1.5 flex items-center justify-center w-6 h-6 rounded hover:bg-gray-700 cursor-pointer transition-opacity duration-200 ${showMenu ? 'opacity-100' : 'opacity-0'}`}
                    contentEditable={false}
                >
                    <GripVertical size={16} className="text-gray-500" />
                </div>
            )}

            {renderPrefix()}

            <div
                ref={contentRef}
                contentEditable={!readOnly}
                suppressContentEditableWarning
                className={`flex-grow outline-none bg-transparent ${getStyles()} ${block.isChecked && block.type === 'todo' ? 'line-through opacity-50' : ''}`}
                data-placeholder={placeholder}
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                onFocus={() => onFocus(block.id)}
            // Removed dangerouslySetInnerHTML from props to avoid React reconciliation overwriting text
            // Content is managed by useEffect and handleInput
            />
        </div>
    );
};

export default BlockComponent;
