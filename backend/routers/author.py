# --- START OF FILE /backend/routers/author.py ---

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
import schemas
from database import get_db
import sql_templates
from fastapi_cache.decorator import cache

router = APIRouter()

# 新增：處理列表查詢與篩選的 API 端點
@router.get("/", response_model=List[schemas.AuthorInfoSchema])
def list_authors(
    author_id: Optional[str] = Query(None),
    rsNo: Optional[str] = Query(None),
    name_chinese: Optional[str] = Query(None),
    name_english: Optional[str] = Query(None),
    organization: Optional[str] = Query(None),
    title: Optional[str] = Query(None),
    surname: Optional[str] = Query(None),
    given_name: Optional[str] = Query(None),
    affiliation: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    country: Optional[str] = Query(None),
    h_index: Optional[int] = Query(None),
    doc_count_min: Optional[int] = Query(None),
    cite_count_min: Optional[int] = Query(None),
    non_nstc_area: Optional[str] = Query(None),
    grant_category: Optional[str] = Query(None),
    discipline_code: Optional[str] = Query(None),
    plan_name: Optional[str] = Query(None),
    pub_start: Optional[int] = Query(None),
    pub_end: Optional[int] = Query(None),
    pub_name: Optional[str] = Query(None),
    is_ieee: Optional[bool] = Query(None),
    is_top2: Optional[bool] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    skip: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    # 使用 CTE 或子查詢來處理 1 對多的關連，避免主查詢結果重複
    sql_query = """
        SELECT DISTINCT 
            i.author_id, i.surname, i.given_name, i.ip_doc_parent_preferred_name, 
            i.ip_doc_address_city, i.ip_doc_address_country,
            c.document_count, c.cited_by_count, h.h_index
        FROM [dbo].[data_author_name_aff_country] i
        LEFT JOIN [dbo].[data_author_coredata] c ON i.author_id = c.author_id
        LEFT JOIN [dbo].[data_author_h_index] h ON i.author_id = h.author_id
        LEFT JOIN [dbo].[data_author_id_rsNo] ir ON i.author_id = ir.author_id
        LEFT JOIN [dbo].[data_author_c302_Basic] b ON ir.rsNo = b.rsNo
        LEFT JOIN [dbo].[data_author_publication_range] pr ON i.author_id = pr.author_id
        WHERE 1=1
    """
    params = {"skip": skip, "limit": limit}

    if author_id:
        sql_query += " AND i.author_id = :author_id"
        params["author_id"] = author_id
    if rsNo:
        sql_query += " AND ir.rsNo = :rsNo"
        params["rsNo"] = rsNo
    if name_chinese:
        sql_query += " AND b.name_chinese LIKE :name_chinese"
        params["name_chinese"] = f"%{name_chinese}%"
    if name_english:
        sql_query += " AND b.name_english LIKE :name_english"
        params["name_english"] = f"%{name_english}%"
    if organization:
        v_list = [v.strip() for v in organization.split(',') if v.strip()]
        v_conds = []
        for i, v in enumerate(v_list):
            k = f"org_{i}"; v_conds.append(f"b.organization LIKE :{k}"); params[k] = f"%{v}%"
        if v_conds: sql_query += f" AND ({' OR '.join(v_conds)})"
    if title:
        sql_query += " AND b.title LIKE :title"
        params["title"] = f"%{title}%"
    if surname:
        sql_query += " AND i.surname LIKE :surname"
        params["surname"] = f"%{surname}%"
    if given_name:
        sql_query += " AND i.given_name LIKE :given_name"
        params["given_name"] = f"%{given_name}%"
    if affiliation:
        v_list = [v.strip() for v in affiliation.split(',') if v.strip()]
        v_conds = []
        for i, v in enumerate(v_list):
            k = f"aff_{i}"; v_conds.append(f"i.ip_doc_parent_preferred_name LIKE :{k}"); params[k] = f"%{v}%"
        if v_conds: sql_query += f" AND ({' OR '.join(v_conds)})"
    if city:
        v_list = [v.strip() for v in city.split(',') if v.strip()]
        v_conds = []
        for i, v in enumerate(v_list):
            k = f"city_{i}"; v_conds.append(f"i.ip_doc_address_city LIKE :{k}"); params[k] = f"%{v}%"
        if v_conds: sql_query += f" AND ({' OR '.join(v_conds)})"
    if country:
        v_list = [v.strip() for v in country.split(',') if v.strip()]
        v_conds = []
        for i, v in enumerate(v_list):
            k = f"country_{i}"; v_conds.append(f"i.ip_doc_address_country LIKE :{k}"); params[k] = f"%{v}%"
        if v_conds: sql_query += f" AND ({' OR '.join(v_conds)})"
    if h_index is not None:
        sql_query += " AND h.h_index >= :h_index"
        params["h_index"] = h_index
    if doc_count_min is not None:
        sql_query += " AND c.document_count >= :doc_count_min"
        params["doc_count_min"] = doc_count_min
    if cite_count_min is not None:
        sql_query += " AND c.cited_by_count >= :cite_count_min"
        params["cite_count_min"] = cite_count_min
    
    if non_nstc_area:
        areas = [a.strip() for a in non_nstc_area.split(',') if a.strip()]
        for i, a in enumerate(areas):
            k = f"area_{i}"
            sql_query += f" AND i.author_id IN (SELECT author_id FROM [dbo].[data_author_non_nstc_field] WHERE non_nstc_area LIKE :{k})"
            params[k] = f"%{a}%"
    
    if grant_category or discipline_code or plan_name:
        plan_clauses = []
        if grant_category:
            vals = [v.strip() for v in grant_category.split(',') if v.strip()]
            c = [f"[補助類別] LIKE :gcat_{i}" for i in range(len(vals))]
            for i, v in enumerate(vals): params[f"gcat_{i}"] = f"%{v}%"
            plan_clauses.append(f"({' OR '.join(c)})")
        if discipline_code:
            vals = [v.strip() for v in discipline_code.split(',') if v.strip()]
            c = [f"[學門代碼] LIKE :dcode_{i}" for i in range(len(vals))]
            for i, v in enumerate(vals): params[f"dcode_{i}"] = f"%{v}%"
            plan_clauses.append(f"({' OR '.join(c)})")
        if plan_name:
            plan_clauses.append("[計畫名稱] LIKE :pname")
            params["pname"] = f"%{plan_name}%"
        
        sql_query += f" AND ir.rsNo IN (SELECT rsNo FROM [dbo].[data_author_Plan_all] WHERE {' AND '.join(plan_clauses)})"

    if pub_start:
        sql_query += " AND pr.[start] >= :pstart"
        params["pstart"] = pub_start
    if pub_end:
        sql_query += " AND pr.[end] <= :pend"
        params["pend"] = pub_end

    if pub_name:
        sql_query += " AND i.author_id IN (SELECT author_id FROM [dbo].[data_author_scopusid_all] sa JOIN [dbo].[data_paper_type_cite_date] pt ON sa.scopus_id = pt.scopus_id WHERE pt.publicationName LIKE :pubname)"
        params["pubname"] = f"%{pub_name}%"

    if is_ieee is True:
        sql_query += " AND i.author_id IN (SELECT author_id FROM [dbo].[data_author_IEEE_author_id])"
    elif is_ieee is False:
        sql_query += " AND i.author_id NOT IN (SELECT author_id FROM [dbo].[data_author_IEEE_author_id])"

    if is_top2 is True:
        sql_query += " AND i.author_id IN (SELECT author_id FROM [dbo].[data_author_top2_author_id])"
    elif is_top2 is False:
        sql_query += " AND i.author_id NOT IN (SELECT author_id FROM [dbo].[data_author_top2_author_id])"

    sql_query += " ORDER BY i.author_id OFFSET :skip ROWS FETCH NEXT :limit ROWS ONLY"

    try:
        result = db.execute(text(sql_query), params).mappings().all()
        return [dict(row) for row in result]
    except Exception as e:
        print(f"Error listing authors: {e}")
        raise HTTPException(status_code=500, detail="Failed to list authors.")


@router.get("/meta/all")
@cache(expire=86400)
def get_all_meta(db: Session = Depends(get_db)):
    try:
        def get_distinct_values(table: str, column: str):
            sql = text(f"SELECT DISTINCT [{column}] FROM [dbo].[{table}] WHERE [{column}] IS NOT NULL AND [{column}] <> '' ORDER BY [{column}]")
            result = db.execute(sql).fetchall()
            return [row[0] for row in result]
        meta_data = {
            "countries": get_distinct_values("data_author_name_aff_country", "ip_doc_address_country"),
            "scopus_affs": get_distinct_values("data_author_name_aff_country", "ip_doc_parent_preferred_name"),
            "cities": get_distinct_values("data_author_name_aff_country", "ip_doc_address_city"),
            "c302_orgs": get_distinct_values("data_author_c302_Basic", "organization"),
            "grant_cats": get_distinct_values("data_author_Plan_all", "補助類別"),
            "disc_codes": get_distinct_values("data_author_Plan_all", "學門代碼"),
            "top2_fields": get_distinct_values("data_author_top2_author_id", "sm_subfield_1"),
            "ieee_titles": get_distinct_values("data_author_IEEE_author_id", "職稱"),
            "non_nstc_areas": get_distinct_values("data_author_non_nstc_field", "non_nstc_area")
        }
        return meta_data
    except Exception as e:
        print(f"Error fetching metadata: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch metadata for filters.")

@router.get("/{author_id}/full", response_model=schemas.AuthorFullSchema)
def get_full(author_id: str, db: Session=Depends(get_db)):
    try:
        aid_str = str(author_id)
        sql = text("""
            SELECT 
                i.*, 
                h.h_index, 
                c.document_count, c.cited_by_count,
                br.rsNo,
                b.name_chinese, b.organization as organization_c302, b.title as title_c302,
                t.rank_ns as top2_rank, t.sm_subfield_1 as top2_field,
                ie.[職稱] as ieee_title, ie.[貢獻] as ieee_contribution, ie.[年度] as ieee_year,
                r.[start] as pub_start, r.[end] as pub_end,
                CASE WHEN i.author_id IS NOT NULL AND i.author_id <> '0' 
                     THEN CONCAT('https://www.scopus.com/authid/detail.uri?authorId=', i.author_id) ELSE NULL END AS scopus_link
            FROM [dbo].[data_author_name_aff_country] i
            LEFT JOIN [dbo].[data_author_h_index] h ON CAST(i.author_id AS VARCHAR(50)) = CAST(h.author_id AS VARCHAR(50))
            LEFT JOIN [dbo].[data_author_coredata] c ON CAST(i.author_id AS VARCHAR(50)) = CAST(c.author_id AS VARCHAR(50))
            LEFT JOIN [dbo].[data_author_id_rsNo] br ON CAST(i.author_id AS VARCHAR(50)) = CAST(br.author_id AS VARCHAR(50))
            LEFT JOIN [dbo].[data_author_c302_Basic] b ON br.rsNo = b.rsNo
            LEFT JOIN [dbo].[data_author_top2_author_id] t ON CAST(i.author_id AS VARCHAR(50)) = CAST(t.author_id AS VARCHAR(50))
            LEFT JOIN [dbo].[data_author_IEEE_author_id] ie ON CAST(i.author_id AS VARCHAR(50)) = CAST(ie.author_id AS VARCHAR(50))
            LEFT JOIN [dbo].[data_author_publication_range] r ON CAST(i.author_id AS VARCHAR(50)) = CAST(r.author_id AS VARCHAR(50))
            WHERE CAST(i.author_id AS VARCHAR(50)) = :aid
        """)
        row = db.execute(sql, {"aid": aid_str}).mappings().first()

        if not row:
            raise HTTPException(status_code=404, detail=f"Author with ID {author_id} not found.")

        def get_plan_agg(col_name: str):
            try:
                sql_agg = text(f"""
                    SELECT p.[{col_name}] as label, COUNT(*) as cnt 
                    FROM [dbo].[data_author_id_rsNo] m 
                    JOIN [dbo].[data_author_Plan_all] p ON m.rsNo = p.rsNo 
                    WHERE CAST(m.author_id AS VARCHAR(50)) = :aid AND p.[{col_name}] IS NOT NULL AND p.[{col_name}] <> '' 
                    GROUP BY p.[{col_name}] 
                    ORDER BY cnt DESC
                """)
                res = db.execute(sql_agg, {"aid": aid_str}).mappings().all()
                return [dict(r) for r in res]
            except Exception as e:
                print(f"DEBUG: Error aggregating {col_name} for author {aid_str}: {e}")
                return []

        fields_sql = text("""
            SELECT non_nstc_area as label, cnt 
            FROM [dbo].[data_author_non_nstc_field] 
            WHERE CAST(author_id AS VARCHAR(50)) = :aid 
            ORDER BY cnt DESC
        """)
        fields_res = db.execute(fields_sql, {"aid": aid_str}).mappings().all()
        
        return {
            **dict(row), 
            "non_nstc_fields": [dict(f) for f in fields_res],
            "plan_discipline_stats": get_plan_agg("學門代碼"),
            "plan_type_stats": get_plan_agg("補助類別"),
            "plan_name_stats": get_plan_agg("計畫名稱"),
            "plan_role_stats": get_plan_agg("擔任工作")
        }
    except Exception as e:
        print(f"Error in get_full for author {author_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{author_id}/papers")
def get_author_papers(author_id: str, db: Session = Depends(get_db)):
    sql = text("""
        WITH CoauthorCounts AS (
            SELECT scopus_id, COUNT(author_id) as coauthor_count
            FROM [dbo].[data_author_scopusid_all]
            WHERE scopus_id IN (SELECT scopus_id FROM [dbo].[data_author_scopusid_all] WHERE author_id = :aid)
            GROUP BY scopus_id
        )
        SELECT 
            a.[scopus_id],
            a.[author_id],
            b.[publicationName] AS publicationName_SJR,
            b.[citedby_count] AS citedby_count_SJR,
            b.[SJR_Best_Quartile],
            c.[source_type],
            c.[aggregation_type],
            c.[cover_date],
            c.[citation_count],
            c.[subtype_description],
            c.[publicationName] AS publicationName_Source,
            cc.coauthor_count
        FROM [dbo].[data_author_scopusid_all] AS a
        INNER JOIN [dbo].[data_Paper_SJR_Best_Quartile] AS b ON a.[scopus_id] = b.[scopus_id]
        INNER JOIN [dbo].[data_paper_type_cite_date] AS c ON a.[scopus_id] = c.[scopus_id]
        LEFT JOIN CoauthorCounts cc ON a.scopus_id = cc.scopus_id
        WHERE a.author_id = :aid
        ORDER BY b.citedby_count DESC, c.cover_date DESC
    """)
    try:
        result = db.execute(sql, {"aid": author_id}).mappings().all()
        return [dict(row) for row in result]
    except Exception as e:
        print(f"Error fetching papers for author {author_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch papers: {e}")

@router.get("/{author_id}/raw")
def get_raw_data(author_id: str, db: Session = Depends(get_db)):
    try:
        aid_str = str(author_id)
        sql_base = text("""
            SELECT 
                n.author_id, n.surname, n.given_name, n.parent, n.affiliation_id, 
                n.ip_doc_parent_preferred_name, n.ip_doc_sort_name, n.ip_doc_afdispname, 
                n.ip_doc_address_city, n.ip_doc_address_country,
                h.h_index,
                c.document_count, c.cited_by_count,
                r.rsNo,
                b.name_chinese, b.name_english, b.organization as c302_org, b.title as c302_title,
                ie.[年度] AS ieee_year, ie.name_e_first AS ieee_first, ie.name_e_last AS ieee_last, 
                ie.[英文姓名] AS ieee_en, ie.[姓名] AS ieee_cn, ie.[職稱] AS ieee_title, 
                ie.[貢獻] AS ieee_contrib, ie.aff_c AS ieee_aff_c, ie.aff_e AS ieee_aff_e,
                t.rank_ns AS top2_rank, t.sm_subfield_1 AS top2_sub1, t.sm_subfield_2 AS top2_sub2, 
                t.sm_field AS top2_field, t.firstyr AS top2_firstyr, t.lastyr AS top2_lastyr, 
                t.cntry AS top2_cntry, t.inst_name AS top2_inst,
                pr.[start] AS pub_start, pr.[end] AS pub_end
            FROM [dbo].[data_author_name_aff_country] n
            LEFT JOIN [dbo].[data_author_h_index] h ON n.author_id = h.author_id
            LEFT JOIN [dbo].[data_author_coredata] c ON n.author_id = c.author_id
            LEFT JOIN [dbo].[data_author_id_rsNo] r ON n.author_id = r.author_id
            LEFT JOIN [dbo].[data_author_c302_Basic] b ON r.rsNo = b.rsNo
            LEFT JOIN [dbo].[data_author_IEEE_author_id] ie ON n.author_id = ie.author_id
            LEFT JOIN [dbo].[data_author_top2_author_id] t ON n.author_id = t.author_id
            LEFT JOIN [dbo].[data_author_publication_range] pr ON n.author_id = pr.author_id
            WHERE n.author_id = :aid
        """)
        base_result = db.execute(sql_base, {"aid": aid_str}).mappings().first()
        if not base_result:
            raise HTTPException(status_code=404, detail="在資料庫中找不到該作者的原始數據。")
        data = dict(base_result)
        rsNo = data.get("rsNo")
        if rsNo:
            sql_plans = text("SELECT * FROM [dbo].[data_author_Plan_all] WHERE rsNo = :rsNo")
            plans_result = db.execute(sql_plans, {"rsNo": rsNo}).mappings().all()
            data["plans"] =[dict(p) for p in plans_result]
        else:
            data["plans"] =[]
        sql_fields = text("SELECT non_nstc_area, cnt FROM [dbo].[data_author_non_nstc_field] WHERE author_id = :aid ORDER BY cnt DESC")
        fields_result = db.execute(sql_fields, {"aid": aid_str}).mappings().all()
        data["non_nstc_fields"] = [dict(f) for f in fields_result]
        return data
    except Exception as e:
        print(f"Error fetching raw data for {author_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
