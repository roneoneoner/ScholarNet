import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import type { AuthorInfo, AuthorFull } from '../types';

export interface Metadata {
  countries: string[];
  scopus_affs: string[];
  cities: string[];
  c302_orgs: string[];
  grant_cats: string[];
  disc_codes: string[];
  top2_fields: string[];
  ieee_titles: string[];
  non_nstc_areas: string[];
}

export const useMetadata = () => {
  return useQuery<Metadata>({
    queryKey: ['metadata'],
    queryFn: () => apiClient.get('/author/meta/all'),
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });
};

export const useAuthorSearch = (params: Record<string, any>) => {
  // Clean params: remove empty strings, nulls, and false booleans to avoid backend validation errors
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([_, v]) => v !== '' && v !== null && v !== undefined && v !== false)
  );

  return useQuery<AuthorInfo[]>({
    queryKey: ['authors', cleanParams],
    queryFn: () => apiClient.get('/author/', { params: cleanParams }),
    enabled: false, // Only fetch on manual trigger
  });
};

export const useAuthorFull = (id: string | null) => {
  return useQuery<AuthorFull>({
    queryKey: ['authorFull', id],
    queryFn: () => apiClient.get(`/author/${id}/full`),
    enabled: !!id,
  });
};

export const useAuthorPapers = (id: string | null) => {
  return useQuery<any[]>({
    queryKey: ['authorPapers', id],
    queryFn: () => apiClient.get(`/author/${id}/papers`),
    enabled: !!id,
  });
};

export const useAuthorRaw = (id: string | null) => {
  return useQuery<any>({
    queryKey: ['authorRaw', id],
    queryFn: () => apiClient.get(`/author/${id}/raw`),
    enabled: !!id,
  });
};

export const useCooperation = (type: string, target: string, p: string, filters: any, limit: number) => {
  const queryParams = new URLSearchParams({ p, limit: limit.toString() });
  if (filters.c) queryParams.append('c', filters.c);
  if (filters.a) queryParams.append('a', filters.a);
  if (filters.u) queryParams.append('u', filters.u);

  return useQuery<any[]>({
    queryKey: ['coop', type, target, p, filters, limit],
    queryFn: () => apiClient.get(`/coop/${type}/${target}?${queryParams.toString()}`),
    enabled: !!p,
  });
};

export const useNetworkAnalysis = (authorIds: string[], targetAuthorId: string | null, steps: number) => {
  return useQuery<any>({
    queryKey: ['network', authorIds, targetAuthorId, steps],
    queryFn: () => apiClient.post('/coop/cluster_centrality', { author_ids: authorIds, target_author_id: targetAuthorId, steps }),
    enabled: authorIds.length > 0 || !!targetAuthorId,
  });
};

export const useNobelSummary = (params: Record<string, any>) => {
  return useQuery<any[]>({
    queryKey: ['nobelSummary', params],
    queryFn: () => apiClient.get('/nobel/summary', { params }),
  });
};

export const useNobelTwAuthors = (params: Record<string, any>) => {
  return useQuery<any[]>({
    queryKey: ['nobelTwAuthors', params],
    queryFn: () => apiClient.get('/nobel/tw_authors', { params }),
  });
};

export const useNobelDetails = (params: Record<string, any>) => {
  return useQuery<any[]>({
    queryKey: ['nobelDetails', params],
    queryFn: () => apiClient.get('/nobel/details', { params }),
  });
};
