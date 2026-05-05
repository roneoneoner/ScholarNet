// Type definitions for ScholarNet
export const TYPES_VERSION = '1.1.0';

export interface AuthorInfo {
  author_id: string;
  surname?: string;
  given_name?: string;
  ip_doc_parent_preferred_name?: string;
  ip_doc_address_city?: string;
  ip_doc_address_country?: string;
  scopus_link?: string;
  document_count?: number;
  cited_by_count?: number;
}

export interface AuthorFull extends AuthorInfo {
  h_index?: number;
  pub_start?: string | number;
  pub_end?: string | number;
  rsNo?: string;
  name_chinese?: string;
  organization_c302?: string;
  title_c302?: string;
  top2_rank?: number;
  top2_field?: string;
  ieee_year?: number;
  ieee_name_e_first?: string;
  ieee_name_e_last?: string;
  ieee_name_en?: string;
  ieee_name_cn?: string;
  ieee_title?: string;
  ieee_contribution?: string;
  ieee_aff_c?: string;
  ieee_aff_e?: string;
  co_author_count?: number;
  co_institution_count?: number;
  co_country_count?: number;
  non_nstc_fields?: Array<{ label: string; cnt: number }>;
  plan_discipline_stats?: Array<{ label: string; cnt: number }>;
  plan_type_stats?: Array<{ label: string; cnt: number }>;
  plan_name_stats?: Array<{ label: string; cnt: number }>;
  plan_role_stats?: Array<{ label: string; cnt: number }>;
}

export interface CoopResult {
  entity_name?: string;
  author_id?: string;
  surname?: string;
  given_name?: string;
  co_count: number;
  scopus_ids: string[];
}

export interface NetworkCentrality {
  degree: number;
  closeness: number;
  betweenness: number;
}

export interface NetworkAuthor extends AuthorFull {
  distance: number;
  cluster_id: number;
  co_count: number | string;
  centrality: NetworkCentrality;
}

export interface NetworkCluster {
  cluster_id: number;
  author_count: number;
  authors: NetworkAuthor[];
}

export interface NetworkEdge {
  from: string;
  to: string;
  weight: number;
}

export interface NetworkAnalysisResponse {
  message: string;
  clusters: NetworkCluster[];
  graph_edges: NetworkEdge[];
  filter_metadata: {
    areas: Array<{ label: string; cnt: number }>;
    disciplines: Array<{ label: string; cnt: number }>;
    grant_categories: Array<{ label: string; cnt: number }>;
    max_weight: number;
    distances: number[];
  };
}
