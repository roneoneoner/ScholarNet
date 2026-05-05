from fastapi import APIRouter, Depends, HTTPException, Body, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional, Dict, Any, Set
from database import get_db
from schemas import CoopResultSchema
import sql_templates as st
import networkx as nx
from collections import defaultdict, Counter

try:
    import community as community_louvain
    COMMUNITY_LIB_AVAILABLE = True
except ImportError:
    COMMUNITY_LIB_AVAILABLE = False

from fastapi_cache.decorator import cache

router = APIRouter()

def execute_q(db, sql, params):
    try:
        res = db.execute(text(sql), params).mappings().all()
        return [dict(r) for r in res]
    except Exception as e:
        print(f"Database Query Error: {e}")
        raise e

# --- Helper to fetch detailed author attributes in batch ---
def fetch_author_attributes_batch(db: Session, author_ids: List[str]) -> Dict[str, Dict]:
    if not author_ids: return {}
    safe_ids = author_ids[:1000]
    ids_csv = ",".join(safe_ids)
    
    sql_basic = text("""
        SELECT i.author_id, i.surname, i.given_name, i.ip_doc_parent_preferred_name AS affiliation, 
               i.ip_doc_address_country AS country, h.h_index
        FROM [dbo].[data_author_name_aff_country] i
        LEFT JOIN [dbo].[data_author_h_index] h ON CAST(i.author_id AS VARCHAR(50)) = CAST(h.author_id AS VARCHAR(50))
        WHERE i.author_id IN (SELECT value FROM STRING_SPLIT(CAST(:ids AS VARCHAR(MAX)), ','))
    """)
    rows_basic = db.execute(sql_basic, {"ids": ids_csv}).mappings().all()
    
    sql_fields = text("SELECT author_id, non_nstc_area FROM [dbo].[data_author_non_nstc_field] WHERE author_id IN (SELECT value FROM STRING_SPLIT(CAST(:ids AS VARCHAR(MAX)), ','))")
    rows_fields = db.execute(sql_fields, {"ids": ids_csv}).mappings().all()
    fields_map = defaultdict(list)
    for r in rows_fields: fields_map[str(r['author_id'])].append(r['non_nstc_area'])
    
    sql_plans = text("""
        SELECT m.author_id, p.[學門代碼], p.[補助類別]
        FROM [dbo].[data_author_id_rsNo] m
        JOIN [dbo].[data_author_Plan_all] p ON m.rsNo = p.rsNo
        WHERE m.author_id IN (SELECT value FROM STRING_SPLIT(CAST(:ids AS VARCHAR(MAX)), ','))
    """)
    rows_plans = db.execute(sql_plans, {"ids": ids_csv}).mappings().all()
    plans_map = defaultdict(lambda: {"disc": set(), "gcat": set()})
    for r in rows_plans:
        if r['學門代碼']: plans_map[str(r['author_id'])]["disc"].add(r['學門代碼'])
        if r['補助類別']: plans_map[str(r['author_id'])]["gcat"].add(r['補助類別'])
    
    details = {}
    for r in rows_basic:
        aid = str(r['author_id'])
        details[aid] = {
            "author_id": aid, "name": f"{r.get('surname', '')} {r.get('given_name', '')}".strip(),
            "affiliation": r.get('affiliation', 'N/A'), "country": r.get('country', '—'),
            "h_index": r.get('h_index', 0), "areas": fields_map.get(aid, []),
            "disciplines": list(plans_map[aid]["disc"]), "grant_categories": list(plans_map[aid]["gcat"])
        }
    return details

# --- 原有的合作數據路由 (修正參數名稱對應) ---

@router.get("/country/countries", response_model=List[CoopResultSchema])
@cache(expire=3600)
def get_country_coop_countries(p: str, c: str = None, a: str = None, u: str = None, limit: int = 20, db: Session = Depends(get_db)):
    try:
        params = {"p": p, "c": c, "a": a, "u": u, "limit": limit}
        return execute_q(db, st.Q_C_C, params)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/country/affiliations", response_model=List[CoopResultSchema])
@cache(expire=3600)
def get_country_coop_affiliations(p: str, c: str = None, a: str = None, u: str = None, limit: int = 20, db: Session = Depends(get_db)):
    try:
        params = {"p": p, "c": c, "a": a, "u": u, "limit": limit}
        return execute_q(db, st.Q_C_A, params)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/country/authors", response_model=List[CoopResultSchema])
@cache(expire=3600)
def get_country_coop_authors(p: str, c: str = None, a: str = None, u: str = None, limit: int = 20, db: Session = Depends(get_db)):
    try:
        params = {"p": p, "c": c, "a": a, "u": u, "limit": limit}
        return execute_q(db, st.Q_C_U, params)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/affiliation/countries", response_model=List[CoopResultSchema])
@cache(expire=3600)
def get_aff_coop_countries(p: str, c: str = None, a: str = None, u: str = None, limit: int = 20, db: Session = Depends(get_db)):
    try:
        params = {"p": p, "c": c, "a": a, "u": u, "limit": limit}
        return execute_q(db, st.Q_A_C, params)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/affiliation/affiliations", response_model=List[CoopResultSchema])
@cache(expire=3600)
def get_aff_coop_affiliations(p: str, c: str = None, a: str = None, u: str = None, limit: int = 20, db: Session = Depends(get_db)):
    try:
        params = {"p": p, "c": c, "a": a, "u": u, "limit": limit}
        return execute_q(db, st.Q_A_A, params)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/affiliation/authors", response_model=List[CoopResultSchema])
@cache(expire=3600)
def get_aff_coop_authors(p: str, c: str = None, a: str = None, u: str = None, limit: int = 20, db: Session = Depends(get_db)):
    try:
        params = {"p": p, "c": c, "a": a, "u": u, "limit": limit}
        return execute_q(db, st.Q_A_U, params)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/author/countries", response_model=List[CoopResultSchema])
@cache(expire=3600)
def get_author_coop_countries(p: str, c: str = None, a: str = None, u: str = None, limit: int = 20, db: Session = Depends(get_db)):
    try:
        # 注意：SQL 模板中作者 ID 的參數名是 'p'
        params = {"p": p, "c": c, "a": a, "u": u, "limit": limit}
        return execute_q(db, st.Q_U_C, params)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/author/affiliations", response_model=List[CoopResultSchema])
@cache(expire=3600)
def get_author_coop_affiliations(p: str, c: str = None, a: str = None, u: str = None, limit: int = 20, db: Session = Depends(get_db)):
    try:
        params = {"p": p, "c": c, "a": a, "u": u, "limit": limit}
        return execute_q(db, st.Q_U_A, params)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/author/authors", response_model=List[CoopResultSchema])
@cache(expire=3600)
def get_author_coop_authors(p: str, c: str = None, a: str = None, u: str = None, limit: int = 20, db: Session = Depends(get_db)):
    try:
        params = {"p": p, "c": c, "a": a, "u": u, "limit": limit}
        return execute_q(db, st.Q_U_U, params)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 網路中心性路由 ---

@router.post("/cluster_centrality", response_model=Dict[str, Any])
@cache(expire=3600)
def get_clusters_and_centrality(
    request_data: Dict[str, Any] = Body(..., example={"target_author_id": "123", "steps": 1}),
    db: Session = Depends(get_db)
):
    author_ids = request_data.get("author_ids", [])
    target_author_id = request_data.get("target_author_id")
    steps = int(request_data.get("steps", 1))

    if not target_author_id and not author_ids:
        raise HTTPException(status_code=400, detail="Either target_author_id or author_ids is required.")

    try:
        edges_raw = []
        target_author_id_str = str(target_author_id) if target_author_id else None
        
        if target_author_id_str:
            # 原有的單一作者核心模式
            if steps >= 2:
                sql_query = text("""
                    WITH Level1_Papers AS (SELECT TOP 100 scopus_id FROM [dbo].[data_author_scopusid_all] WHERE author_id = :aid),
                    Level1_Authors AS (SELECT DISTINCT author_id FROM [dbo].[data_author_scopusid_all] WHERE scopus_id IN (SELECT scopus_id FROM Level1_Papers)),
                    Relevant_Edges AS (
                        SELECT p1.author_id AS source, p2.author_id AS target, p1.scopus_id
                        FROM [dbo].[data_author_scopusid_all] p1
                        JOIN [dbo].[data_author_scopusid_all] p2 ON p1.scopus_id = p2.scopus_id AND p1.author_id < p2.author_id
                        WHERE p1.author_id IN (SELECT author_id FROM Level1_Authors) AND p2.author_id IN (SELECT author_id FROM Level1_Authors)
                    )
                    SELECT source, target, COUNT(scopus_id) AS weight FROM Relevant_Edges GROUP BY source, target
                """)
            else:
                sql_query = text("""
                    SELECT p1.author_id AS source, p2.author_id AS target, COUNT(p1.scopus_id) AS weight
                    FROM [dbo].[data_author_scopusid_all] p1
                    JOIN [dbo].[data_author_scopusid_all] p2 ON p1.scopus_id = p2.scopus_id AND p1.author_id < p2.author_id
                    WHERE p1.scopus_id IN (SELECT scopus_id FROM [dbo].[data_author_scopusid_all] WHERE author_id = :aid)
                    GROUP BY p1.author_id, p2.author_id
                """)
            edges_raw = db.execute(sql_query, {"aid": target_author_id_str}).mappings().all()
        else:
            # 批量作者模式：顯示篩選出的作者之間的內部合作
            safe_ids = [str(x) for x in author_ids[:1000]]
            ids_csv = ",".join(safe_ids)
            sql_query = text("""
                SELECT p1.author_id AS source, p2.author_id AS target, COUNT(p1.scopus_id) AS weight
                FROM [dbo].[data_author_scopusid_all] p1
                JOIN [dbo].[data_author_scopusid_all] p2 ON p1.scopus_id = p2.scopus_id AND p1.author_id < p2.author_id
                WHERE p1.author_id IN (SELECT value FROM STRING_SPLIT(:ids, ','))
                  AND p2.author_id IN (SELECT value FROM STRING_SPLIT(:ids, ','))
                GROUP BY p1.author_id, p2.author_id
            """)
            edges_raw = db.execute(sql_query, {"ids": ids_csv}).mappings().all()

        if not edges_raw and not target_author_id_str:
            # 如果沒有邊，且不是單一作者模式，則直接返回空或僅包含節點
            G = nx.Graph()
            for aid in author_ids[:200]: G.add_node(str(aid))
        else:
            G = nx.Graph()
            for e in edges_raw: G.add_edge(str(e['source']), str(e['target']), weight=e['weight'])
            if target_author_id_str and target_author_id_str not in G: G.add_node(target_author_id_str)
            elif author_ids: 
                for aid in author_ids[:500]: 
                    if str(aid) not in G: G.add_node(str(aid))

        # 計算距離 (若是單一作者模式)
        if target_author_id_str:
            distances = nx.single_source_shortest_path_length(G, source=target_author_id_str, cutoff=2)
        else:
            distances = {node: 0 for node in G.nodes()}

        nodes_to_process = list(G.nodes())
        if len(nodes_to_process) > 1000: nodes_to_process = nodes_to_process[:1000]

        attr_map = fetch_author_attributes_batch(db, nodes_to_process)
        
        # 中心性指標
        centrality = {'degree': nx.degree_centrality(G)}
        if len(nodes_to_process) < 500:
            try:
                centrality['closeness'] = nx.closeness_centrality(G)
                centrality['betweenness'] = nx.betweenness_centrality(G, weight='weight')
            except:
                centrality['closeness'] = centrality['betweenness'] = centrality['degree']
        else:
            centrality['closeness'] = centrality['betweenness'] = centrality['degree']

        # 群體偵測 (Louvain)
        clusters_partition = {node: 0 for node in nodes_to_process}
        if COMMUNITY_LIB_AVAILABLE and G.size() > 0:
            try:
                clusters_partition = community_louvain.best_partition(G)
            except: pass

        all_areas = Counter(); all_discs = Counter(); all_gcats = Counter()
        for aid in nodes_to_process:
            if aid in attr_map:
                attr = attr_map[aid]
                if distances.get(aid, 9) <= 1:
                    for x in attr['areas']: all_areas[x] += 1
                    for x in attr['disciplines']: all_discs[x] += 1
                    for x in attr['grant_categories']: all_gcats[x] += 1

        co_with_core = {}
        if target_author_id_str:
            for e in edges_raw:
                s, t, w = str(e['source']), str(e['target']), e['weight']
                if s == target_author_id_str: co_with_core[t] = w
                elif t == target_author_id_str: co_with_core[s] = w

        # 封裝作者資訊
        virtual_authors = []
        for node in nodes_to_process:
            info = attr_map.get(node, {})
            virtual_authors.append({
                "author_id": node, "name": info.get('name', f"Author {node}"),
                "affiliation": info.get('affiliation', 'N/A'), "country": info.get('country', '—'),
                "h_index": info.get('h_index', 0), "distance": distances.get(node, 0),
                "cluster_id": clusters_partition.get(node, 0) + 1,
                "co_count": co_with_core.get(node, 0 if node != target_author_id_str else '—'),
                "areas": info.get('areas', []), "disciplines": info.get('disciplines', []), "grant_categories": info.get('grant_categories', []),
                "centrality": {
                    "degree": centrality['degree'].get(node, 0),
                    "closeness": centrality.get('closeness', centrality['degree']).get(node, 0),
                    "betweenness": centrality.get('betweenness', centrality['degree']).get(node, 0)
                }
            })

        # 按群體分組
        clusters_data = []
        grouped = defaultdict(list)
        for va in virtual_authors: grouped[va['cluster_id']].append(va)
        
        for cid in sorted(grouped.keys()):
            clusters_data.append({
                "cluster_id": cid,
                "author_count": len(grouped[cid]),
                "authors": grouped[cid]
            })

        return {
            "message": f"Successfully analyzed network with {len(nodes_to_process)} nodes.",
            "clusters": clusters_data,
            "graph_edges": [{"from": str(e['source']), "to": str(e['target']), "weight": e['weight']} for e in edges_raw],
            "filter_metadata": {
                "areas": [{"label": k, "cnt": v} for k, v in all_areas.most_common(30)],
                "disciplines": [{"label": k, "cnt": v} for k, v in all_discs.most_common(30)],
                "grant_categories": [{"label": k, "cnt": v} for k, v in all_gcats.most_common(30)],
                "max_weight": max([e['weight'] for e in edges_raw]) if edges_raw else 0,
                "distances": sorted(list(set(distances.values())))
            }
        }
    except Exception as e:
        print(f"Error in cluster_centrality: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
