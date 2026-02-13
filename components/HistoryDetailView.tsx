import React from 'react';
import { Summary, isSummarySession } from '../types';
import { generateSummaryTitle } from '../utils/summaryUtils';
import { ArrowLeft, Trash2, RotateCcw, FileUp, Mic, Link as LinkIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface HistoryDetailViewProps {
  summary: Summary;
  onBack: () => void;
  onLoadContent: () => void;
  onDelete: () => void;
}

const HistoryDetailView: React.FC<HistoryDetailViewProps> = ({
  summary,
  onBack,
  onLoadContent,
  onDelete
}) => {
  const title = generateSummaryTitle(summary);
  const hasSessionData = isSummarySession(summary);

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this summary?')) {
      onDelete();
    }
  };

  const getAttachmentIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileUp size={16} />;
      case 'audio': return <Mic size={16} />;
      case 'url': return <LinkIcon size={16} />;
      default: return <FileUp size={16} />;
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[70vh]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded-lg text-discord-textMuted hover:text-white transition-colors"
            title="Back to list"
          >
            <ArrowLeft size={20} />
          </button>
          <h3 className="text-lg font-bold text-white truncate">{title}</h3>
        </div>
        <button
          onClick={handleDelete}
          className="p-2 hover:bg-red-500/20 rounded-lg text-discord-textMuted hover:text-red-400 transition-colors"
          title="Delete summary"
        >
          <Trash2 size={20} />
        </button>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-6 min-h-0">
        {/* Mode Badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-discord-textMuted uppercase">Mode:</span>
          <span className="px-3 py-1 bg-discord-accent/20 border border-discord-accent/50 text-discord-accent rounded text-xs font-bold capitalize">
            {summary.mode === 'eli5' ? 'ELI5' : summary.mode}
          </span>
        </div>

        {/* Original Text */}
        {hasSessionData && summary.originalText && (
          <div>
            <h4 className="text-sm font-bold text-discord-textMuted uppercase mb-2">Original Text</h4>
            <div className="bg-discord-bg p-4 rounded-lg border border-white/5 max-h-48 overflow-y-auto">
              <p className="text-discord-text text-sm whitespace-pre-wrap">{summary.originalText}</p>
            </div>
          </div>
        )}

        {/* Attachments */}
        {hasSessionData && summary.attachments && summary.attachments.length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-discord-textMuted uppercase mb-2">Attachments</h4>
            <div className="space-y-2">
              {summary.attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-3 bg-discord-bg p-3 rounded-lg border border-white/5"
                >
                  <span className="text-discord-accent">
                    {getAttachmentIcon(att.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold uppercase text-discord-textMuted block">
                      {att.type}
                    </span>
                    <span className="text-sm text-white truncate block">
                      {att.name || 'Untitled'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generated Summary */}
        <div>
          <h4 className="text-sm font-bold text-discord-textMuted uppercase mb-2">Generated Summary</h4>
          <div className="bg-discord-bg p-4 rounded-lg border border-white/5 max-h-96 overflow-y-auto prose prose-invert prose-sm max-w-none">
            <ReactMarkdown>{summary.summaryText}</ReactMarkdown>
          </div>
        </div>

        {/* Flashcards */}
        {summary.flashcards && summary.flashcards.length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-discord-textMuted uppercase mb-2">
              Learning Chunks ({summary.flashcards.length})
            </h4>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {summary.flashcards.map((card, i) => (
                <div
                  key={card.id}
                  className="bg-discord-bg p-4 rounded-lg border border-white/5"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <div className="w-6 h-6 rounded-full bg-discord-accent/20 flex items-center justify-center text-discord-accent text-xs font-bold">
                        {i + 1}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h5 className="text-white font-bold text-sm mb-1">{card.front}</h5>
                      <p className="text-discord-textMuted text-sm">{card.back}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {hasSessionData && (
        <div className="mt-4 pt-4 border-t border-white/10 flex-shrink-0">
          <button
            onClick={onLoadContent}
            className="w-full bg-discord-accent hover:bg-discord-accentHover text-white px-6 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw size={18} />
            Load Content & Regenerate
          </button>
        </div>
      )}
    </div>
  );
};

export default HistoryDetailView;
