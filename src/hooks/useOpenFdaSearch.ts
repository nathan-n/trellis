import { useState, useEffect } from 'react';
import { searchDrugLabels, type OpenFdaSearchResult } from '../services/openFdaService';

export function useOpenFdaSearch(query: string, debounceMs = 300) {
  const [results, setResults] = useState<OpenFdaSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    const timeout = setTimeout(async () => {
      const data = await searchDrugLabels(query);
      setResults(data);
      setLoading(false);
    }, debounceMs);

    return () => clearTimeout(timeout);
  }, [query, debounceMs]);

  return { results, loading };
}
