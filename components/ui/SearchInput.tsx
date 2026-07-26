import React from 'react';
import { Search, X } from 'lucide-react';
import { Input, type InputProps } from './Input';

export interface SearchInputProps extends Omit<InputProps, 'icon' | 'iconRight' | 'value'> {
  value: string;
  onValueChange: (value: string) => void;
}

/** Search field with a leading icon and a clear affordance once text is typed. */
export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onValueChange,
  placeholder = 'Search…',
  ...props
}) => (
  <Input
    type="search"
    value={value}
    placeholder={placeholder}
    onChange={(event) => onValueChange(event.target.value)}
    icon={<Search size={16} />}
    iconRight={
      value ? (
        <button
          type="button"
          onClick={() => onValueChange('')}
          aria-label="Clear search"
          className="text-discord-textMuted transition-colors hover:text-white"
        >
          <X size={15} />
        </button>
      ) : undefined
    }
    {...props}
  />
);
