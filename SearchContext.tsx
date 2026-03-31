import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';

interface SearchContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  debouncedQuery: string;
  isSearching: boolean;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

const DEBOUNCE_DELAY = 300; // ms

export const SearchProvider = ({ children }: { children: ReactNode }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce search query
  useEffect(() => {
    setIsSearching(true);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setIsSearching(false);
    }, DEBOUNCE_DELAY);

    // Cleanup on unmount or query change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Clear search on unmount
  useEffect(() => {
    return () => {
      setSearchQuery('');
      setDebouncedQuery('');
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const value = {
    searchQuery,
    setSearchQuery,
    debouncedQuery,
    isSearching,
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};

// Custom hook for using debounced search in components
export const useDebouncedSearch = (callback: (query: string) => void) => {
  const { debouncedQuery } = useSearch();

  useEffect(() => {
    callback(debouncedQuery);
  }, [debouncedQuery, callback]);
};
