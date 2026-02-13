import React from 'react';
import { Summary } from '../types';
import HistoryItem from './HistoryItem';
import { Clock } from 'lucide-react';

interface HistoryListProps {
  summaries: Summary[];
  onSelectSummary: (summary: Summary) => void;
  onDeleteSummary: (summaryId: string) => void;
}

const HistoryList: React.FC<HistoryListProps> = ({ 
  summaries, 
  onSelectSummary, 
  onDeleteSummary 
}) => {
  // Sort summaries by creation date (newest first)
  const sortedSummaries = [...summaries].sort((a, b) => b.createdAt - a.createdAt);

  // Empty state
  if (sortedSummaries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-discord-textMuted/40">
        <Clock size={64} className="mb-4 opacity-50" />
        <h3 className="text-xl font-bold mb-2">No summaries yet</h3>
        <p className="text-sm text-center max-w-xs">
          Your summarization history will appear here. Generate your first summary to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 overflow-y-auto max-h-[600px] pr-2">
      {sortedSummaries.map((summary) => (
        <HistoryItem
          key={summary.id}
          summary={summary}
          onSelect={() => onSelectSummary(summary)}
          onDelete={() => onDeleteSummary(summary.id)}
        />
      ))}
    </div>
  );
};

export default HistoryList;
