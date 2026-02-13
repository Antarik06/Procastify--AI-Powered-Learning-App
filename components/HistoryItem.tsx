import React from 'react';
import { Summary } from '../types';
import { generateSummaryTitle, formatSummaryDate } from '../utils/summaryUtils';
import { Trash2 } from 'lucide-react';

interface HistoryItemProps {
  summary: Summary;
  onSelect: () => void;
  onDelete: () => void;
}

const HistoryItem: React.FC<HistoryItemProps> = ({ summary, onSelect, onDelete }) => {
  const title = generateSummaryTitle(summary);
  const formattedDate = formatSummaryDate(summary.createdAt);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering onSelect
    if (window.confirm('Are you sure you want to delete this summary?')) {
      onDelete();
    }
  };

  // Determine mode badge color
  const getModeColor = (mode: string) => {
    const customModes = ['creative', 'technical', 'research']; // Common custom modes
    if (customModes.some(m => mode.toLowerCase().includes(m))) {
      return 'bg-purple-600/20 border-purple-600/50 text-purple-400';
    }
    return 'bg-discord-accent/20 border-discord-accent/50 text-discord-accent';
  };

  return (
    <div
      onClick={onSelect}
      className="w-full bg-discord-bg hover:bg-discord-hover p-4 rounded-xl border border-white/5 transition-all group text-left cursor-pointer"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onSelect();
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-medium mb-2 truncate group-hover:text-discord-accent transition-colors">
            {title}
          </h4>
          <div className="flex items-center gap-2 text-xs text-discord-textMuted">
            <span className={`px-2 py-1 border rounded font-bold capitalize ${getModeColor(summary.mode)}`}>
              {summary.mode === 'eli5' ? 'ELI5' : summary.mode}
            </span>
            <span>•</span>
            <span>{formattedDate}</span>
          </div>
        </div>
        <button
          onClick={handleDelete}
          className="p-2 hover:bg-red-500/20 rounded-lg text-discord-textMuted hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
          title="Delete summary"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

export default HistoryItem;
