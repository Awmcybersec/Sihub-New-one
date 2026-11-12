import { useEffect, useState } from 'react';
import { apiGet, ApiError } from '../services/apiClient';

export type CmsPageFields = {
  slug?: string;
  title?: string | null;
  summary?: string | null;
  eyebrow?: string | null;
  heading?: string | null;
  description?: string | null;
  [key: string]: unknown;
};

export function useCmsPage<T extends CmsPageFields = CmsPageFields>(slug: string) {
  const [page, setPage] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);

    const loadPage = () => {
      apiGet<T>(`/api/cms/pages/${encodeURIComponent(slug)}`)
        .then(data => {
          if (!active) return;
          setPage(data);
          setError('');
        })
        .catch(reason => {
          if (!active) return;
          setError(reason instanceof ApiError ? reason.message : 'Unable to load published SiHub content.');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    };

    loadPage();
    window.addEventListener('sihub-cms-update', loadPage);
    return () => {
      active = false;
      window.removeEventListener('sihub-cms-update', loadPage);
    };
  }, [slug]);

  return { page, loading, error };
}

