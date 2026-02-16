import React, { useState } from 'react';
import { ResourceFilters, ExamType, Level, PaperType } from '../../types';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';

interface FilterPanelProps {
  filters: ResourceFilters;
  onFiltersChange: (filters: ResourceFilters) => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({ filters, onFiltersChange }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const examTypes: ExamType[] = ['JEE', 'NEET', 'GATE', 'ICSE', 'CBSE', 'University', 'Other'];
  const levels: Level[] = ['10', '12', 'UG', 'PG', 'Other'];
  const paperTypes: PaperType[] = ['PYQ', 'Mock', 'Sample', 'Practice'];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1990 + 2 }, (_, i) => currentYear + 1 - i);

  const toggleFilter = <K extends keyof ResourceFilters>(
    key: K,
    value: ResourceFilters[K] extends (infer U)[] ? U : never
  ) => {
    const currentValues = (filters[key] as any[]) || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];

    onFiltersChange({
      ...filters,
      [key]: newValues.length > 0 ? newValues : undefined,
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  const getActiveFilterCount = (): number => {
    let count = 0;
    if (filters.examType?.length) count += filters.examType.length;
    if (filters.level?.length) count += filters.level.length;
    if (filters.paperType?.length) count += filters.paperType.length;
    if (filters.year?.length) count += filters.year.length;
    if (filters.subject?.length) count += filters.subject.length;
    if (filters.board?.length) count += filters.board.length;
    return count;
  };

  const activeCount = getActiveFilterCount();

  return (
    <div className="bg-[#2b2d31] rounded-lg border border-white/10 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Filter size={20} className="text-[#5865F2]" />
          <span className="font-bold text-white">Filters</span>
          {activeCount > 0 && (
            <span className="px-2 py-0.5 bg-[#5865F2] text-white text-xs rounded-full">
              {activeCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearAllFilters();
              }}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              Clear all
            </button>
          )}
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </div>

      {/* Filter Content */}
      {isExpanded && (
        <div className="p-4 space-y-4 border-t border-white/10">
          {/* Exam Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Exam Type</label>
            <div className="flex flex-wrap gap-2">
              {examTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => toggleFilter('examType', type)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filters.examType?.includes(type)
                      ? 'bg-[#5865F2] text-white'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Level Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Level/Class</label>
            <div className="flex flex-wrap gap-2">
              {levels.map((level) => (
                <button
                  key={level}
                  onClick={() => toggleFilter('level', level)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filters.level?.includes(level)
                      ? 'bg-[#5865F2] text-white'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Paper Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Paper Type</label>
            <div className="flex flex-wrap gap-2">
              {paperTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => toggleFilter('paperType', type)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filters.paperType?.includes(type)
                      ? 'bg-[#5865F2] text-white'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Year Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Year</label>
            <div className="max-h-40 overflow-y-auto">
              <div className="flex flex-wrap gap-2">
                {years.map((year) => (
                  <button
                    key={year}
                    onClick={() => toggleFilter('year', year)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      filters.year?.includes(year)
                        ? 'bg-[#5865F2] text-white'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterPanel;
