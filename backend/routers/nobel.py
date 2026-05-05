from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, List
from database import get_db
from schemas import NobelSummarySchema, NobelTwAuthorSchema, NobelDetailSchema

router = APIRouter()

def execute_q(db, sql, params):
    res = db.execute(text(sql), params).mappings().all()
    return [dict(r) for r in res]

# ── SQL: 台灣作者 × 諾貝爾得主合作一覽（依論文為單位）
Q_NOBEL_DETAIL = """
SELECT
    n.categories,
    n.nobel_last_name,
    n.nobel_first_name,
    n.nobel_author_id,
    n.paper_id,
    n.author_id AS tw_author_id,
    ai.surname AS tw_surname,
    ai.given_name AS tw_given_name,
    ai.ip_doc_parent_preferred_name AS tw_affiliation,
    ai.ip_doc_address_city AS tw_city,
    n.aff_name AS nobel_aff_name,
    n.aff_disp_name AS nobel_aff_disp_name,
    n.country AS nobel_country,
    CASE WHEN n.nobel_author_id IS NOT NULL AND n.nobel_author_id <> 0 
         THEN CONCAT('https://www.scopus.com/authid/detail.uri?authorId=', n.nobel_author_id) 
         ELSE NULL END AS nobel_link,
    CASE WHEN n.author_id IS NOT NULL AND n.author_id <> 0 
         THEN CONCAT('https://www.scopus.com/authid/detail.uri?authorId=', n.author_id) 
         ELSE NULL END AS tw_link
FROM [dbo].[nobel] n
LEFT JOIN [dbo].[data_author_name_aff_country] ai ON n.author_id = ai.author_id
WHERE n.country = 'Taiwan'
  AND (:category IS NULL OR n.categories = :category)
  AND (:nobel_name IS NULL OR n.nobel_last_name LIKE :nobel_name)
  AND (:tw_author_id IS NULL OR n.author_id = :tw_author_id)
ORDER BY n.categories, n.nobel_last_name, n.paper_id
OFFSET 0 ROWS FETCH NEXT :limit ROWS ONLY
"""

# ── SQL: 統計每位諾貝爾得主與台灣的合作篇數
Q_NOBEL_SUMMARY = """
WITH BASE AS (
    SELECT categories, nobel_author_id, nobel_last_name, nobel_first_name, paper_id, author_id AS tw_author_id
    FROM [dbo].[nobel]
    WHERE country = 'Taiwan'
      AND (:category IS NULL OR categories = :category)
),
DISTINCT_PAPERS AS (
    SELECT DISTINCT categories, nobel_author_id, nobel_last_name, nobel_first_name, paper_id
    FROM BASE
)
SELECT
    p.categories,
    CAST(p.nobel_author_id AS VARCHAR) AS nobel_author_id,
    p.nobel_last_name,
    p.nobel_first_name,
    COUNT(p.paper_id) AS paper_count,
    (SELECT COUNT(DISTINCT tw_author_id) FROM BASE b WHERE b.nobel_author_id = p.nobel_author_id AND b.categories = p.categories) AS tw_author_count,
    STRING_AGG(CAST(p.paper_id AS VARCHAR(MAX)), ',') AS paper_ids,
    CASE WHEN p.nobel_author_id IS NOT NULL AND p.nobel_author_id <> '' 
         THEN CONCAT('https://www.scopus.com/authid/detail.uri?authorId=', p.nobel_author_id) 
         ELSE NULL END AS nobel_link
FROM DISTINCT_PAPERS p
GROUP BY p.categories, p.nobel_author_id, p.nobel_last_name, p.nobel_first_name
ORDER BY paper_count DESC
OFFSET 0 ROWS FETCH NEXT :limit ROWS ONLY
"""

# ── SQL: 統計台灣哪些作者與諾貝爾得主合作最多
Q_TW_AUTHOR_SUMMARY = """
WITH BASE AS (
    SELECT categories, nobel_author_id, nobel_last_name, nobel_first_name, paper_id, author_id AS tw_author_id
    FROM [dbo].[nobel]
    WHERE country = 'Taiwan'
      AND (:category IS NULL OR categories = :category)
),
DISTINCT_COLLABS AS (
    SELECT DISTINCT tw_author_id, nobel_author_id, nobel_last_name
    FROM BASE
),
DISTINCT_PAPERS AS (
    SELECT DISTINCT tw_author_id, paper_id
    FROM BASE
)
SELECT
    CAST(m.tw_author_id AS VARCHAR) AS author_id,
    ai.surname,
    ai.given_name,
    ai.ip_doc_parent_preferred_name AS affiliation,
    ai.ip_doc_address_city AS city,
    (SELECT COUNT(*) FROM DISTINCT_PAPERS dp WHERE dp.tw_author_id = m.tw_author_id) AS paper_count,
    COUNT(DISTINCT m.nobel_author_id) AS nobel_count,
    STRING_AGG(m.nobel_last_name, ', ') AS collaborated_nobels,
    CASE WHEN m.tw_author_id IS NOT NULL AND m.tw_author_id <> '' 
         THEN CONCAT('https://www.scopus.com/authid/detail.uri?authorId=', m.tw_author_id) 
         ELSE NULL END AS author_link
FROM DISTINCT_COLLABS m
LEFT JOIN [dbo].[data_author_name_aff_country] ai ON m.tw_author_id = ai.author_id
GROUP BY m.tw_author_id, ai.surname, ai.given_name,
         ai.ip_doc_parent_preferred_name, ai.ip_doc_address_city
ORDER BY paper_count DESC
OFFSET 0 ROWS FETCH NEXT :limit ROWS ONLY
"""

# ── SQL: 取得所有出現過的 Nobel 領域分類
Q_CATEGORIES = """
SELECT DISTINCT categories FROM [dbo].[nobel]
WHERE categories IS NOT NULL 
  AND country = 'Taiwan'
ORDER BY categories
"""


@router.get("/summary/by-nobel", response_model=List[NobelSummarySchema])
def nobel_summary(
    category: Optional[str] = None,
    limit: int = 30,
    db: Session = Depends(get_db)
):
    """諾貝爾得主視角：每位得主與台灣作者的合作篇數統計"""
    return execute_q(db, Q_NOBEL_SUMMARY, {"category": category, "limit": limit})


@router.get("/summary/by-tw-author", response_model=List[NobelTwAuthorSchema])
def tw_author_summary(
    category: Optional[str] = None,
    limit: int = 30,
    db: Session = Depends(get_db)
):
    """台灣作者視角：誰與最多諾貝爾得主合作"""
    return execute_q(db, Q_TW_AUTHOR_SUMMARY, {"category": category, "limit": limit})


@router.get("/detail", response_model=List[NobelDetailSchema])
def nobel_detail(
    category: Optional[str] = None,
    nobel_name: Optional[str] = None,
    tw_author_id: Optional[int] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """詳細合作紀錄：每筆論文 × 台灣作者 × 諾貝爾得主"""
    name_filter = f"%{nobel_name}%" if nobel_name else None
    return execute_q(db, Q_NOBEL_DETAIL, {
        "category": category,
        "nobel_name": name_filter,
        "tw_author_id": tw_author_id,
        "limit": limit
    })


@router.get("/categories")
def get_categories(db: Session = Depends(get_db)):
    """取得所有諾貝爾獎領域"""
    rows = db.execute(text(Q_CATEGORIES)).mappings().all()
    return [r["categories"] for r in rows]
