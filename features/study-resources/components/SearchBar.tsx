import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  onSearchChange: (query: string) => void;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  onSearchChange,
  placeholder = 'Search by title, subject, board...',
}) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Trigger search when debounced query changes
  useEffect(() => {
    onSearchChange(debouncedQuery);
  }, [debouncedQuery, onSearchChange]);

  const handleClear = () => {
    setQuery('');
    setDebouncedQuery('');
  };

  return (
    <div className="relative w-full">
      <Search className="absolute left-3 top-3 text-gray-400" size={20} />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#2b2d31] border border-white/10 rounded-lg pl-10 pr-10 py-3 text-white focus:outline-none focus:border-[#5865F2] transition-all"
      />
      {query && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-3 text-gray-400 hover:text-white transition-colors"
          title="Clear search"
        >
          <X size={20} />
        </button>
      )}
    </div>
  );
};

export default SearchBar;
