from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional

from database import get_db, engine
from backend.schemas import (
    AuthorHIndexSchema, AuthorInfoSchema, AuthorFullSchema,
    CollaborationSchema, CollaborationDetailSchema
)
import models

# ==================== FastAPI 應用程式 ====================
app = FastAPI(
    title="Author H-Index API",
    description="FastAPI + Microsoft SQL Server — 作者 H-index 查詢服務",
    version="3.0.0",
)

# ==================== CORS 設定 ====================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== 初始化 ====================
models.Base.metadata.create_all(bind=engine)


# ==================== 基礎路由 ====================
@app.get("/")
def root():
    return {
        "message": "Author H-Index API is running",
        "docs": "/docs",
        "frontend": "http://127.0.0.1:5500"
    }


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}


# ==================== H-Index API ====================
@app.get("/authors", response_model=List[AuthorHIndexSchema], tags=["H-Index"])
def get_all_authors(db: Session = Depends(get_db)):
    return db.query(models.AuthorHIndex).all()


@app.get("/authors/raw", response_model=List[AuthorHIndexSchema], tags=["H-Index"])
def get_authors_raw(db: Session = Depends(get_db)):
    sql = text("SELECT[author_id], [h_index] FROM [rone].[dbo].[author_id_h_index]")
    result = db.execute(sql).mappings().all()
    return [dict(row) for row in result]


@app.get("/authors/{author_id}", response_model=AuthorHIndexSchema, tags=["H-Index"])
def get_author_by_id(author_id: int, db: Session = Depends(get_db)):
    author = db.query(models.AuthorHIndex).filter(
        models.AuthorHIndex.author_id == author_id
    ).first()
    if not author:
        raise HTTPException(status_code=404, detail=f"Author {author_id} not found")
    return author


# ==================== 作者姓名與機構 API ====================
@app.get("/author-info", response_model=List[AuthorFullSchema], tags=["Author Info"])
def get_all_author_info(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=1000),
    surname: Optional[str] = Query(default=None, description="依姓氏篩選（部分比對）"),
    given_name: Optional[str] = Query(default=None, description="依名字篩選（部分比對）"),
    country: Optional[str] = Query(default=None, description="依國家篩選（部分比對）"),
    city: Optional[str] = Query(default=None, description="依城市篩選（部分比對）"),
    affiliation: Optional[str] = Query(default=None, description="依機構名稱篩選（部分比對）"),
    db: Session = Depends(get_db)
):
    """
    取得作者姓名與機構資料，支援分頁與篩選
    """
    sql_base = """
        SELECT
            i.author_id, i.surname, i.given_name,
            i.ip_doc_parent_preferred_name, i.ip_doc_afdispname,
            i.ip_doc_address_city, i.ip_doc_address_country, i.scopus_link,
            h.h_index,
            ie.[年度] AS ieee_year,
            ie.[name_e_first] AS ieee_name_e_first,
            ie.[name_e_last] AS ieee_name_e_last,
            ie.[英文姓名] AS ieee_name_en,
            ie.[姓名] AS ieee_name_cn,
            ie.[職稱] AS ieee_title,
            ie.[貢獻] AS ieee_contribution,
            ie.[aff_c] AS ieee_aff_c,
            ie.[aff_e] AS ieee_aff_e
        FROM [rone].[dbo].[data_author_name_aff_country] i
        LEFT JOIN [rone].[dbo].[author_id_h_index] h ON i.author_id = h.author_id
        LEFT JOIN [rone].[dbo].[data_author_IEEE_author_id] ie ON i.author_id = ie.author_id
        WHERE 1=1
    """
    params = {"skip": skip, "limit": limit}

    if surname:
        sql_base += " AND i.surname LIKE :surname"
        params["surname"] = f"%{surname}%"
    if given_name:
        sql_base += " AND i.given_name LIKE :given_name"
        params["given_name"] = f"%{given_name}%"
    if country:
        sql_base += " AND i.ip_doc_address_country LIKE :country"
        params["country"] = f"%{country}%"
    if city:
        sql_base += " AND i.ip_doc_address_city LIKE :city"
        params["city"] = f"%{city}%"
    if affiliation:
        sql_base += " AND (i.ip_doc_parent_preferred_name LIKE :aff OR i.ip_doc_afdispname LIKE :aff)"
        params["aff"] = f"%{affiliation}%"

    sql_base += " ORDER BY i.author_id OFFSET :skip ROWS FETCH NEXT :limit ROWS ONLY"
    result = db.execute(text(sql_base), params).mappings().all()
    return [dict(row) for row in result]


@app.get("/author-info/{author_id}", response_model=AuthorInfoSchema, tags=["Author Info"])
def get_author_info_by_id(author_id: int, db: Session = Depends(get_db)):
    author = db.query(models.AuthorInfo).filter(
        models.AuthorInfo.author_id == author_id
    ).first()
    if not author:
        raise HTTPException(status_code=404, detail=f"Author info {author_id} not found")
    return author


# ==================== 合併查詢 API ====================
@app.get("/authors/{author_id}/full", response_model=AuthorFullSchema, tags=["Combined"])
def get_author_full(author_id: int, db: Session = Depends(get_db)):
    sql = text("""
        SELECT
            COALESCE(h.author_id, i.author_id, ie.author_id) AS author_id,
            i.surname,
            i.given_name,
            h.h_index,
            i.affiliation_id,
            i.ip_doc_parent_preferred_name,
            i.ip_doc_afdispname,
            i.ip_doc_address_city,
            i.ip_doc_address_country,
            ie.[年度] AS ieee_year,
            ie.[name_e_first] AS ieee_name_e_first,
            ie.[name_e_last] AS ieee_name_e_last,
            ie.[英文姓名] AS ieee_name_en,
            ie.[姓名] AS ieee_name_cn,
            ie.[職稱] AS ieee_title,
            ie.[貢獻] AS ieee_contribution,
            ie.[aff_c] AS ieee_aff_c,
            ie.[aff_e] AS ieee_aff_e
        FROM [rone].[dbo].[author_id_h_index] h
        FULL OUTER JOIN [rone].[dbo].[data_author_name_aff_country] i
            ON h.author_id = i.author_id
        LEFT JOIN [rone].[dbo].[data_author_IEEE_author_id] ie
            ON COALESCE(h.author_id, i.author_id) = ie.author_id
        WHERE COALESCE(h.author_id, i.author_id, ie.author_id) = :author_id
    """)
    row = db.execute(sql, {"author_id": author_id}).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail=f"Author {author_id} not found")
    return dict(row)


@app.get("/authors-full", response_model=List[AuthorFullSchema], tags=["Combined"])
def get_all_authors_full(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    sql = text("""
        SELECT
            h.author_id,
            i.surname,
            i.given_name,
            h.h_index,
            i.affiliation_id,
            i.ip_doc_parent_preferred_name,
            i.ip_doc_afdispname,
            i.ip_doc_address_city,
            i.ip_doc_address_country,
            ie.[年度] AS ieee_year,
            ie.[name_e_first] AS ieee_name_e_first,
            ie.[name_e_last] AS ieee_name_e_last,
            ie.[英文姓名] AS ieee_name_en,
            ie.[姓名] AS ieee_name_cn,
            ie.[職稱] AS ieee_title,
            ie.[貢獻] AS ieee_contribution,
            ie.[aff_c] AS ieee_aff_c,
            ie.[aff_e] AS ieee_aff_e
        FROM [rone].[dbo].[author_id_h_index] h
        LEFT JOIN [rone].[dbo].[data_author_name_aff_country] i
            ON h.author_id = i.author_id
        LEFT JOIN [rone].[dbo].[data_author_IEEE_author_id] ie
            ON h.author_id = ie.author_id
        ORDER BY h.author_id
        OFFSET :skip ROWS FETCH NEXT :limit ROWS ONLY
    """)
    result = db.execute(sql, {"skip": skip, "limit": limit}).mappings().all()
    return[dict(row) for row in result]


# ==================== 合作分析 API ====================

@app.get("/collaboration/country-country", response_model=List[CollaborationSchema], tags=["Collaboration"])
def collab_country_country(
    country: Optional[str] = Query(default=None, description="以國家篩選（部分比對）"),
    limit: int = Query(default=50, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """
    國家與國家合作論文次數
    """
    base_sql = """
        SELECT
            a.ip_doc_address_country AS entity_a,
            b.ip_doc_address_country AS entity_b,
            COUNT(DISTINCT p1.scopus_id) AS collaboration_count
        FROM [rone].[dbo].[data_author_scopusid_all] p1
        JOIN [rone].[dbo].[data_author_scopusid_all] p2
            ON p1.scopus_id = p2.scopus_id AND p1.author_id < p2.author_id
        JOIN [rone].[dbo].[data_author_name_aff_country] a ON p1.author_id = a.author_id
        JOIN [rone].[dbo].[data_author_name_aff_country] b ON p2.author_id = b.author_id
        WHERE a.ip_doc_address_country IS NOT NULL
          AND b.ip_doc_address_country IS NOT NULL
          AND a.ip_doc_address_country <> b.ip_doc_address_country
    """
    params = {"limit": limit}
    if country:
        base_sql += " AND (a.ip_doc_address_country LIKE :country OR b.ip_doc_address_country LIKE :country)"
        params["country"] = f"%{country}%"

    base_sql += """
        GROUP BY a.ip_doc_address_country, b.ip_doc_address_country
        ORDER BY collaboration_count DESC
        OFFSET 0 ROWS FETCH NEXT :limit ROWS ONLY
    """
    result = db.execute(text(base_sql), params).mappings().all()
    return [dict(row) for row in result]


@app.get("/collaboration/affiliation-affiliation", response_model=List[CollaborationSchema], tags=["Collaboration"])
def collab_affiliation_affiliation(
    affiliation: Optional[str] = Query(default=None, description="以機構名稱篩選（部分比對）"),
    country: Optional[str] = Query(default=None, description="以所屬國家篩選（部分比對）"),
    limit: int = Query(default=50, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """
    機構與機構合作論文次數
    """
    base_sql = """
        SELECT
            a.ip_doc_parent_preferred_name AS entity_a,
            b.ip_doc_parent_preferred_name AS entity_b,
            COUNT(DISTINCT p1.scopus_id) AS collaboration_count
        FROM [rone].[dbo].[data_author_scopusid_all] p1
        JOIN [rone].[dbo].[data_author_scopusid_all] p2
            ON p1.scopus_id = p2.scopus_id AND p1.author_id < p2.author_id
        JOIN [rone].[dbo].[data_author_name_aff_country] a ON p1.author_id = a.author_id
        JOIN [rone].[dbo].[data_author_name_aff_country] b ON p2.author_id = b.author_id
        WHERE a.ip_doc_parent_preferred_name IS NOT NULL
          AND b.ip_doc_parent_preferred_name IS NOT NULL
          AND a.ip_doc_parent_preferred_name <> b.ip_doc_parent_preferred_name
    """
    params = {"limit": limit}
    if affiliation:
        base_sql += " AND (a.ip_doc_parent_preferred_name LIKE :aff OR b.ip_doc_parent_preferred_name LIKE :aff)"
        params["aff"] = f"%{affiliation}%"
    if country:
        base_sql += " AND (a.ip_doc_address_country LIKE :country OR b.ip_doc_address_country LIKE :country)"
        params["country"] = f"%{country}%"

    base_sql += """
        GROUP BY a.ip_doc_parent_preferred_name, b.ip_doc_parent_preferred_name
        ORDER BY collaboration_count DESC
        OFFSET 0 ROWS FETCH NEXT :limit ROWS ONLY
    """
    result = db.execute(text(base_sql), params).mappings().all()
    return[dict(row) for row in result]


@app.get("/collaboration/affiliation-country", response_model=List[CollaborationSchema], tags=["Collaboration"])
def collab_affiliation_country(
    affiliation: Optional[str] = Query(default=None, description="以機構名稱篩選（部分比對）"),
    country: Optional[str] = Query(default=None, description="以合作國家篩選（部分比對）"),
    limit: int = Query(default=50, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """
    機構與國家合作論文次數
    """
    base_sql = """
        SELECT
            a.ip_doc_parent_preferred_name AS entity_a,
            b.ip_doc_address_country AS entity_b,
            COUNT(DISTINCT p1.scopus_id) AS collaboration_count
        FROM [rone].[dbo].[data_author_scopusid_all] p1
        JOIN [rone].[dbo].[data_author_scopusid_all] p2
            ON p1.scopus_id = p2.scopus_id AND p1.author_id <> p2.author_id
        JOIN [rone].[dbo].[data_author_name_aff_country] a ON p1.author_id = a.author_id
        JOIN [rone].[dbo].[data_author_name_aff_country] b ON p2.author_id = b.author_id
        WHERE a.ip_doc_parent_preferred_name IS NOT NULL
          AND b.ip_doc_address_country IS NOT NULL
          AND a.ip_doc_address_country <> b.ip_doc_address_country
    """
    params = {"limit": limit}
    if affiliation:
        base_sql += " AND a.ip_doc_parent_preferred_name LIKE :aff"
        params["aff"] = f"%{affiliation}%"
    if country:
        base_sql += " AND b.ip_doc_address_country LIKE :country"
        params["country"] = f"%{country}%"

    base_sql += """
        GROUP BY a.ip_doc_parent_preferred_name, b.ip_doc_address_country
        ORDER BY collaboration_count DESC
        OFFSET 0 ROWS FETCH NEXT :limit ROWS ONLY
    """
    result = db.execute(text(base_sql), params).mappings().all()
    return [dict(row) for row in result]


@app.get("/collaboration/author-affiliation", response_model=List[CollaborationSchema], tags=["Collaboration"])
def collab_author_affiliation(
    author_id: Optional[int] = Query(default=None, description="指定作者 ID 篩選"),
    surname: Optional[str] = Query(default=None, description="以作者姓氏篩選"),
    given_name: Optional[str] = Query(default=None, description="以作者名字篩選"),
    country: Optional[str] = Query(default=None, description="以作者所屬國家篩選"),
    affiliation: Optional[str] = Query(default=None, description="以合作對象機構篩選（部分比對）"),
    limit: int = Query(default=50, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """
    作者與機構合作論文次數
    支援姓名/國家過濾主體作者，並可輸入 affiliation 過濾合作的目標機構
    """
    name_filter_ids = None
    if surname or given_name or country:
        sub = db.query(models.AuthorInfo.author_id)
        if surname:
            sub = sub.filter(models.AuthorInfo.surname.ilike(f"%{surname}%"))
        if given_name:
            sub = sub.filter(models.AuthorInfo.given_name.ilike(f"%{given_name}%"))
        if country:
            sub = sub.filter(models.AuthorInfo.ip_doc_address_country.ilike(f"%{country}%"))
        name_filter_ids = [r[0] for r in sub.all()]
        if not name_filter_ids:
            return[]

    base_sql = """
        SELECT
            CAST(p1.author_id AS VARCHAR) AS entity_a,
            b.ip_doc_parent_preferred_name AS entity_b,
            COUNT(DISTINCT p1.scopus_id) AS collaboration_count
        FROM [rone].[dbo].[data_author_scopusid_all] p1
        JOIN [rone].[dbo].[data_author_scopusid_all] p2
            ON p1.scopus_id = p2.scopus_id AND p1.author_id <> p2.author_id
        JOIN [rone].[dbo].[data_author_name_aff_country] b ON p2.author_id = b.author_id
        WHERE b.ip_doc_parent_preferred_name IS NOT NULL
    """
    params = {"limit": limit}
    if author_id:
        base_sql += " AND p1.author_id = :author_id"
        params["author_id"] = author_id
    elif name_filter_ids:
        ids_str = ",".join(str(i) for i in name_filter_ids)
        base_sql += f" AND p1.author_id IN ({ids_str})"

    if affiliation:
        base_sql += " AND b.ip_doc_parent_preferred_name LIKE :aff"
        params["aff"] = f"%{affiliation}%"

    base_sql += """
        GROUP BY p1.author_id, b.ip_doc_parent_preferred_name
        ORDER BY collaboration_count DESC
        OFFSET 0 ROWS FETCH NEXT :limit ROWS ONLY
    """
    result = db.execute(text(base_sql), params).mappings().all()
    return [dict(row) for row in result]


@app.get("/collaboration/author-country", response_model=List[CollaborationSchema], tags=["Collaboration"])
def collab_author_country(
    author_id: Optional[int] = Query(default=None, description="指定作者 ID 篩選"),
    surname: Optional[str] = Query(default=None, description="以作者姓氏篩選"),
    given_name: Optional[str] = Query(default=None, description="以作者名字篩選"),
    affiliation: Optional[str] = Query(default=None, description="以作者所屬機構篩選"),
    country: Optional[str] = Query(default=None, description="以合作對象國家篩選（部分比對）"),
    limit: int = Query(default=50, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """
    作者與國家合作論文次數
    支援姓名/機構過濾主體作者，並可輸入 country 過濾合作的目標國家
    """
    name_filter_ids = None
    if surname or given_name or affiliation:
        sub = db.query(models.AuthorInfo.author_id)
        if surname:
            sub = sub.filter(models.AuthorInfo.surname.ilike(f"%{surname}%"))
        if given_name:
            sub = sub.filter(models.AuthorInfo.given_name.ilike(f"%{given_name}%"))
        if affiliation:
            sub = sub.filter(
                models.AuthorInfo.ip_doc_parent_preferred_name.ilike(f"%{affiliation}%") |
                models.AuthorInfo.ip_doc_afdispname.ilike(f"%{affiliation}%")
            )
        name_filter_ids = [r[0] for r in sub.all()]
        if not name_filter_ids:
            return[]

    base_sql = """
        SELECT
            CAST(p1.author_id AS VARCHAR) AS entity_a,
            b.ip_doc_address_country AS entity_b,
            COUNT(DISTINCT p1.scopus_id) AS collaboration_count
        FROM [rone].[dbo].[data_author_scopusid_all] p1
        JOIN [rone].[dbo].[data_author_scopusid_all] p2
            ON p1.scopus_id = p2.scopus_id AND p1.author_id <> p2.author_id
        JOIN [rone].[dbo].[data_author_name_aff_country] b ON p2.author_id = b.author_id
        WHERE b.ip_doc_address_country IS NOT NULL
    """
    params = {"limit": limit}
    if author_id:
        base_sql += " AND p1.author_id = :author_id"
        params["author_id"] = author_id
    elif name_filter_ids:
        ids_str = ",".join(str(i) for i in name_filter_ids)
        base_sql += f" AND p1.author_id IN ({ids_str})"

    if country:
        base_sql += " AND b.ip_doc_address_country LIKE :country"
        params["country"] = f"%{country}%"

    base_sql += """
        GROUP BY p1.author_id, b.ip_doc_address_country
        ORDER BY collaboration_count DESC
        OFFSET 0 ROWS FETCH NEXT :limit ROWS ONLY
    """
    result = db.execute(text(base_sql), params).mappings().all()
    return [dict(row) for row in result]


@app.get("/collaboration/author-author", response_model=List[CollaborationSchema], tags=["Collaboration"])
def collab_author_author(
    surname: Optional[str] = Query(default=None, description="以作者姓氏篩選（部分比對）"),
    given_name: Optional[str] = Query(default=None, description="以作者名字篩選（部分比對）"),
    affiliation: Optional[str] = Query(default=None, description="以機構名稱篩選（部分比對）"),
    country: Optional[str] = Query(default=None, description="以國家篩選（部分比對）"),
    author_id: Optional[int] = Query(default=None, description="指定作者 ID 篩選"),
    limit: int = Query(default=50, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """
    作者與作者合作論文次數（共同 scopus_id 交集）
    支援以 surname / given_name / affiliation / country / author_id 篩選目標作者
    """
    name_filter_ids = None
    if surname or given_name or affiliation or country:
        sub = db.query(models.AuthorInfo.author_id)
        if surname:
            sub = sub.filter(models.AuthorInfo.surname.ilike(f"%{surname}%"))
        if given_name:
            sub = sub.filter(models.AuthorInfo.given_name.ilike(f"%{given_name}%"))
        if affiliation:
            sub = sub.filter(
                models.AuthorInfo.ip_doc_parent_preferred_name.ilike(f"%{affiliation}%") |
                models.AuthorInfo.ip_doc_afdispname.ilike(f"%{affiliation}%")
            )
        if country:
            sub = sub.filter(models.AuthorInfo.ip_doc_address_country.ilike(f"%{country}%"))
        name_filter_ids = [r[0] for r in sub.all()]
        if not name_filter_ids:
            return[]

    base_sql = """
        SELECT
            CAST(p1.author_id AS VARCHAR) AS entity_a,
            CAST(p2.author_id AS VARCHAR) AS entity_b,
            COUNT(DISTINCT p1.scopus_id) AS collaboration_count
        FROM [rone].[dbo].[data_author_scopusid_all] p1
        JOIN [rone].[dbo].[data_author_scopusid_all] p2
            ON p1.scopus_id = p2.scopus_id AND p1.author_id < p2.author_id
        WHERE 1=1
    """
    params = {"limit": limit}
    if author_id:
        base_sql += " AND (p1.author_id = :author_id OR p2.author_id = :author_id)"
        params["author_id"] = author_id
    elif name_filter_ids:
        ids_str = ",".join(str(i) for i in name_filter_ids)
        base_sql += f" AND (p1.author_id IN ({ids_str}) OR p2.author_id IN ({ids_str}))"

    base_sql += """
        GROUP BY p1.author_id, p2.author_id
        ORDER BY collaboration_count DESC
        OFFSET 0 ROWS FETCH NEXT :limit ROWS ONLY
    """
    result = db.execute(text(base_sql), params).mappings().all()
    return[dict(row) for row in result]


@app.get("/collaboration/author-author/papers", response_model=List[CollaborationDetailSchema], tags=["Collaboration"])
def collab_author_author_papers(
    author_id_a: int = Query(..., description="作者 A 的 ID"),
    author_id_b: int = Query(..., description="作者 B 的 ID"),
    db: Session = Depends(get_db)
):
    """
    查詢兩位作者共同發表的所有論文 scopus_id 列表
    """
    sql = text("""
        SELECT DISTINCT p1.scopus_id
        FROM [rone].[dbo].[data_author_scopusid_all] p1
        JOIN [rone].[dbo].[data_author_scopusid_all] p2
            ON p1.scopus_id = p2.scopus_id
        WHERE p1.author_id = :author_id_a AND p2.author_id = :author_id_b
        ORDER BY p1.scopus_id
    """)
    result = db.execute(sql, {"author_id_a": author_id_a, "author_id_b": author_id_b}).mappings().all()
    return [{"scopus_id": row["scopus_id"]} for row in result]


@app.get("/collaboration/country-country/papers", response_model=List[CollaborationDetailSchema], tags=["Collaboration"])
def collab_country_country_papers(
    country_a: str = Query(..., description="國家 A"),
    country_b: str = Query(..., description="國家 B"),
    db: Session = Depends(get_db)
):
    """
    查詢兩個國家共同合作發表的論文 scopus_id 列表
    """
    sql = text("""
        SELECT DISTINCT p1.scopus_id
        FROM [rone].[dbo].[data_author_scopusid_all] p1
        JOIN [rone].[dbo].[data_author_name_aff_country] a ON p1.author_id = a.author_id
        JOIN [rone].[dbo].[data_author_scopusid_all] p2
            ON p1.scopus_id = p2.scopus_id AND p1.author_id <> p2.author_id
        JOIN [rone].[dbo].[data_author_name_aff_country] b ON p2.author_id = b.author_id
        WHERE a.ip_doc_address_country = :country_a AND b.ip_doc_address_country = :country_b
        ORDER BY p1.scopus_id
    """)
    result = db.execute(sql, {"country_a": country_a, "country_b": country_b}).mappings().all()
    return [{"scopus_id": row["scopus_id"]} for row in result]