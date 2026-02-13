import React, { useState } from 'react';
import { Summary } from '../types';
import HistoryList from './HistoryList';
import HistoryDetailView from './HistoryDetailView';
import { X } from 'lucide-react';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summaries: Summary[];
  onSelectSummary: (summary: Summary) => void;
  onDeleteSummary: (summaryId: string) => void;
  onLoadContent: (summary: Summary) => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  summaries,
  onSelectSummary,
  onDeleteSummary,
  onLoadContent
}) => {
  const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null);
  const [view, setView] = useState<'list' | 'detail'>('list');

  if (!isOpen) return null;

  const handleSelectSummary = (summary: Summary) => {
    setSelectedSummary(summary);
    setView('detail');
    onSelectSummary(summary);
  };

  const handleBack = () => {
    setView('list');
    setSelectedSummary(null);
  };

  const handleLoadContent = () => {
    if (selectedSummary) {
      onLoadContent(selectedSummary);
      onClose();
    }
  };

  const handleDelete = () => {
    if (selectedSummary) {
      onDeleteSummary(selectedSummary.id);
      handleBack();
    }
  };

  const handleClose = () => {
    setView('list');
    setSelectedSummary(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-discord-panel w-full max-w-4xl max-h-[90vh] rounded-2xl border border-white/10 shadow-2xl flex flex-col animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-white">
            {view === 'list' ? 'Summary History' : 'Summary Details'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/10 rounded-lg text-discord-textMuted hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-6">
          {view === 'list' ? (
            <HistoryList
              summaries={summaries}
              onSelectSummary={handleSelectSummary}
              onDeleteSummary={onDeleteSummary}
            />
          ) : selectedSummary ? (
            <HistoryDetailView
              summary={selectedSummary}
              onBack={handleBack}
              onLoadContent={handleLoadContent}
              onDelete={handleDelete}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;
