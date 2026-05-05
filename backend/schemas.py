from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class AuthorInfoSchema(BaseModel):
    author_id: str
    surname: Optional[Any] = None
    given_name: Optional[Any] = None
    ip_doc_parent_preferred_name: Optional[Any] = None
    ip_doc_address_city: Optional[Any] = None
    ip_doc_address_country: Optional[Any] = None
    scopus_link: Optional[Any] = None
    document_count: Optional[Any] = None
    cited_by_count: Optional[Any] = None
    class Config: from_attributes = True

class AuthorFullSchema(AuthorInfoSchema):
    h_index: Optional[Any] = None
    pub_start: Optional[Any] = None
    pub_end: Optional[Any] = None
    rsNo: Optional[Any] = None
    name_chinese: Optional[Any] = None
    organization_c302: Optional[Any] = None
    title_c302: Optional[Any] = None
    top2_rank: Optional[Any] = None
    top2_field: Optional[Any] = None
    ieee_year: Optional[Any] = None
    ieee_name_e_first: Optional[Any] = None
    ieee_name_e_last: Optional[Any] = None
    ieee_name_en: Optional[Any] = None
    ieee_name_cn: Optional[Any] = None
    ieee_title: Optional[Any] = None
    ieee_contribution: Optional[Any] = None
    ieee_aff_c: Optional[Any] = None
    ieee_aff_e: Optional[Any] = None
    co_author_count: Optional[Any] = None
    co_institution_count: Optional[Any] = None
    co_country_count: Optional[Any] = None
    non_nstc_fields: Optional[List[Dict[str, Any]]] = []
    plan_discipline_stats: Optional[List[Dict[str, Any]]] = []
    plan_type_stats: Optional[List[Dict[str, Any]]] = []
    plan_name_stats: Optional[List[Dict[str, Any]]] = []
    plan_role_stats: Optional[List[Dict[str, Any]]] = []
    class Config: from_attributes = True

class CoopResultSchema(BaseModel):
    entity_name: Optional[Any] = None
    author_id: Optional[Any] = None
    surname: Optional[Any] = None
    given_name: Optional[Any] = None
    co_count: Any
    scopus_ids: Any
    class Config: from_attributes = True

# ── 諾貝爾合作 Schema ──────────────────────────────────

class NobelSummarySchema(BaseModel):
    categories: Optional[Any] = None
    nobel_author_id: Optional[Any] = None
    nobel_last_name: Optional[Any] = None
    nobel_first_name: Optional[Any] = None
    paper_count: Any
    tw_author_count: Any
    paper_ids: Optional[Any] = None
    nobel_link: Optional[Any] = None
    class Config: from_attributes = True

class NobelTwAuthorSchema(BaseModel):
    author_id: Optional[Any] = None
    surname: Optional[Any] = None
    given_name: Optional[Any] = None
    affiliation: Optional[Any] = None
    city: Optional[Any] = None
    paper_count: Any
    nobel_count: Any
    author_link: Optional[Any] = None
    collaborated_nobels: Optional[Any] = None
    class Config: from_attributes = True

class NobelDetailSchema(BaseModel):
    categories: Optional[Any] = None
    nobel_last_name: Optional[Any] = None
    nobel_first_name: Optional[Any] = None
    nobel_author_id: Optional[Any] = None
    paper_id: Optional[Any] = None
    tw_author_id: Optional[Any] = None
    tw_surname: Optional[Any] = None
    tw_given_name: Optional[Any] = None
    tw_affiliation: Optional[Any] = None
    tw_city: Optional[Any] = None
    nobel_aff_name: Optional[Any] = None
    nobel_aff_disp_name: Optional[Any] = None
    nobel_country: Optional[Any] = None
    nobel_link: Optional[Any] = None
    tw_link: Optional[Any] = None
    class Config: from_attributes = True
