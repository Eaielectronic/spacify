import React, { useState } from 'react';
import { Search } from 'lucide-react';

interface SearchHeaderProps {
    onSearch: (query: string) => void;
}

const SearchHeader: React.FC<SearchHeaderProps> = ({ onSearch }) => {
    const [query, setQuery] = useState('');

    return (
        <div className="flex items-center bg-[#242424] hover:bg-[#2a2a2a] rounded-full px-4 py-3 w-96 max-w-full text-white transition-colors duration-200 border border-transparent focus-within:border-white/20">
            <Search size={20} className="text-gray-400 mr-3" />
            <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch(query)}
                className="bg-transparent border-none outline-none w-full placeholder-gray-400 font-normal text-sm"
                placeholder="What do you want to listen to?"
            />
        </div>
    );
};

export default SearchHeader;
