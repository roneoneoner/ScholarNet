# sql_templates.py

"""
命名規則說明：
Q_{主體}_{合作對象}
- 主體：C (Country 國家) / A (Affiliation 機構) / U (User 作者)
- 合作對象：C (Country 國家) / A (Affiliation 機構) / U (User 作者)
"""

# --- Core Filter Snippet ---
# Used in some queries to filter by country, affiliation, or author ID.
# :c -> country, :a -> affiliation, :u -> author_id
FILTER_SNIPPET = "AND (:c IS NULL OR C.ip_doc_address_country = :c) AND (:a IS NULL OR C.ip_doc_parent_preferred_name = :a) AND (:u IS NULL OR CAST(C.author_id AS VARCHAR) = :u)"

# --- Network Graph Specific Queries ---

# Q_NET_AUTHORS: Calculates collaboration edges between a given list of author_ids.
# Returns source, target, weight (number of shared papers), and sids (comma-separated Scopus IDs).
# :ids -> comma-separated string of author_ids
Q_NET_AUTHORS = """
WITH TargetAuthors AS (
    SELECT value AS author_id FROM STRING_SPLIT(:ids, ',')
),
Pairs AS (
    SELECT p1.scopus_id, p1.author_id AS a, p2.author_id AS b
    FROM [dbo].[data_author_scopusid_all] p1
    JOIN [dbo].[data_author_scopusid_all] p2 ON p1.scopus_id = p2.scopus_id AND p1.author_id < p2.author_id
    WHERE p1.author_id IN (SELECT author_id FROM TargetAuthors)
      AND p2.author_id IN (SELECT author_id FROM TargetAuthors)
)
SELECT a AS source, b AS target, COUNT(scopus_id) AS weight, STRING_AGG(CAST(scopus_id AS VARCHAR(MAX)), ',') AS sids
FROM Pairs
GROUP BY a, b
"""

# Q_NET_ENTITIES: Calculates collaboration edges between a given list of entities (countries or affiliations).
# :ids -> comma-separated string of entity names
# :mode -> 'country' or 'aff' to specify which column to use from data_author_name_aff_country
Q_NET_ENTITIES = """
WITH TargetEntities AS (
    SELECT value AS entity_name FROM STRING_SPLIT(:ids, ',')
),
Papers AS (
    SELECT p.scopus_id, 
           CASE WHEN :mode = 'country' THEN ai.ip_doc_address_country ELSE ai.ip_doc_parent_preferred_name END AS entity_name
    FROM [dbo].[data_author_scopusid_all] p
    JOIN [dbo].[data_author_name_aff_country] ai ON p.author_id = ai.author_id
    WHERE (CASE WHEN :mode = 'country' THEN ai.ip_doc_address_country ELSE ai.ip_doc_parent_preferred_name END) IN (SELECT entity_name FROM TargetEntities)
),
Pairs AS (
    SELECT p1.scopus_id, p1.entity_name AS a, p2.entity_name AS b
    FROM Papers p1
    JOIN Papers p2 ON p1.scopus_id = p2.scopus_id AND p1.entity_name < p2.entity_name
)
SELECT a AS source, b AS target, COUNT(DISTINCT scopus_id) AS weight, STRING_AGG(CAST(scopus_id AS VARCHAR(MAX)), ',') AS sids
FROM Pairs
GROUP BY a, b
"""

# --- New SQL Query for fetching all collaborators for a list of authors ---
# This query is crucial for building the graph for clustering and centrality.
# It retrieves all unique Scopus IDs for the given authors, and then for each Scopus ID,
# it finds all authors associated with it. This forms the basis for collaboration network data.
# :author_ids_str -> comma-separated string of author_ids
Q_ALL_COLLABORATORS_FOR_AUTHORS = """
WITH TargetAuthors AS (
    SELECT value AS author_id FROM STRING_SPLIT(:author_ids_str, ',')
),
AuthorPapers AS (
    SELECT DISTINCT author_id, scopus_id 
    FROM [dbo].[data_author_scopusid_all]
    WHERE author_id IN (SELECT author_id FROM TargetAuthors)
),
AllCollaborators AS (
    SELECT DISTINCT T.author_id AS source_author_id, P.author_id AS target_author_id, P.scopus_id
    FROM AuthorPapers T
    JOIN [dbo].[data_author_scopusid_all] P ON T.scopus_id = P.scopus_id AND T.author_id <> P.author_id -- Ensure it's a different author
)
SELECT 
    source_author_id, 
    target_author_id, 
    scopus_id
FROM AllCollaborators
"""

# --- Existing Collaboration Queries (Keep them as they are) ---

# Q_C_C: Country collaborates with Country
Q_C_C = f"""WITH T AS (SELECT DISTINCT author_id FROM [dbo].[data_author_name_aff_country] WHERE ip_doc_address_country = :p),
S AS (SELECT DISTINCT scopus_id FROM [dbo].[data_author_scopusid_all] WHERE author_id IN (SELECT author_id FROM T)),
FA AS (SELECT DISTINCT author_id, scopus_id FROM [dbo].[data_author_scopusid_all] WHERE scopus_id IN (SELECT scopus_id FROM S)),
B AS (SELECT A.scopus_id, C.ip_doc_address_country AS e FROM FA A JOIN [dbo].[data_author_name_aff_country] C ON A.author_id = C.author_id WHERE C.ip_doc_address_country IS NOT NULL AND C.ip_doc_address_country <> :p {FILTER_SNIPPET}),
D AS (SELECT e, scopus_id FROM B GROUP BY e, scopus_id)
SELECT e AS entity_name, COUNT(scopus_id) AS co_count, STRING_AGG(CAST(scopus_id AS VARCHAR(MAX)), ',') AS scopus_ids
FROM D GROUP BY e ORDER BY co_count DESC OFFSET 0 ROWS FETCH NEXT :limit ROWS ONLY"""

# Q_C_A: Country collaborates with Affiliation
Q_C_A = f"""WITH T AS (SELECT DISTINCT author_id FROM [dbo].[data_author_name_aff_country] WHERE ip_doc_address_country = :p),
S AS (SELECT DISTINCT scopus_id FROM [dbo].[data_author_scopusid_all] WHERE author_id IN (SELECT author_id FROM T)),
FA AS (SELECT DISTINCT author_id, scopus_id FROM [dbo].[data_author_scopusid_all] WHERE scopus_id IN (SELECT scopus_id FROM S)),
B AS (SELECT A.scopus_id, C.ip_doc_parent_preferred_name AS e FROM FA A JOIN [dbo].[data_author_name_aff_country] C ON A.author_id = C.author_id WHERE C.ip_doc_parent_preferred_name IS NOT NULL {FILTER_SNIPPET}),
D AS (SELECT e, scopus_id FROM B GROUP BY e, scopus_id)
SELECT e AS entity_name, COUNT(scopus_id) AS co_count, STRING_AGG(CAST(scopus_id AS VARCHAR(MAX)), ',') AS scopus_ids
FROM D GROUP BY e ORDER BY co_count DESC OFFSET 0 ROWS FETCH NEXT :limit ROWS ONLY"""

# Q_C_U: Country collaborates with User (Author)
Q_C_U = f"""WITH T AS (SELECT DISTINCT author_id FROM [dbo].[data_author_name_aff_country] WHERE ip_doc_address_country = :p),
S AS (SELECT DISTINCT scopus_id FROM [dbo].[data_author_scopusid_all] WHERE author_id IN (SELECT author_id FROM T)),
FA AS (SELECT DISTINCT author_id, scopus_id FROM [dbo].[data_author_scopusid_all] WHERE scopus_id IN (SELECT scopus_id FROM S)),
B AS (SELECT C.author_id, C.surname, C.given_name, A.scopus_id 
      FROM FA A 
      JOIN [dbo].[data_author_name_aff_country] C ON A.author_id = C.author_id 
      WHERE C.author_id NOT IN (SELECT author_id FROM T) {FILTER_SNIPPET}), -- Exclude authors from the primary country
D AS (SELECT author_id, surname, given_name, scopus_id FROM B GROUP BY author_id, surname, given_name, scopus_id)
SELECT CAST(author_id AS VARCHAR) AS author_id, surname, given_name, COUNT(scopus_id) AS co_count, STRING_AGG(CAST(scopus_id AS VARCHAR(MAX)), ',') AS scopus_ids
FROM D 
GROUP BY author_id, surname, given_name 
ORDER BY co_count DESC 
OFFSET 0 ROWS 
FETCH NEXT :limit ROWS ONLY"""

# Q_A_C: Affiliation collaborates with Country
Q_A_C = Q_C_C.replace("ip_doc_address_country = :p", "ip_doc_parent_preferred_name = :p")
# Q_A_A: Affiliation collaborates with Affiliation
Q_A_A = Q_C_A.replace("ip_doc_parent_preferred_name IS NOT NULL", "ip_doc_parent_preferred_name IS NOT NULL AND C.ip_doc_parent_preferred_name <> :p").replace("ip_doc_address_country = :p", "ip_doc_parent_preferred_name = :p")
# Q_A_U: Affiliation collaborates with User (Author)
Q_A_U = Q_C_U.replace("ip_doc_address_country = :p", "ip_doc_parent_preferred_name = :p")

# Q_U_C: User (Author) collaborates with Country
Q_U_C = f"""WITH S AS (SELECT scopus_id FROM [dbo].[data_author_scopusid_all] WHERE author_id = :p),
FA AS (SELECT author_id, scopus_id FROM [dbo].[data_author_scopusid_all] WHERE scopus_id IN (SELECT scopus_id FROM S)),
B AS (SELECT A.scopus_id, C.ip_doc_address_country AS e FROM FA A JOIN [dbo].[data_author_name_aff_country] C ON A.author_id = C.author_id WHERE C.author_id <> :p AND C.ip_doc_address_country IS NOT NULL {FILTER_SNIPPET}),
D AS (SELECT e, scopus_id FROM B GROUP BY e, scopus_id)
SELECT e AS entity_name, COUNT(scopus_id) AS co_count, STRING_AGG(CAST(scopus_id AS VARCHAR(MAX)), ',') AS scopus_ids
FROM D GROUP BY e ORDER BY co_count DESC OFFSET 0 ROWS FETCH NEXT :limit ROWS ONLY"""

# Q_U_A: User (Author) collaborates with Affiliation
Q_U_A = Q_U_C.replace("C.ip_doc_address_country AS e", "C.ip_doc_parent_preferred_name AS e").replace("C.ip_doc_address_country IS NOT NULL", "C.ip_doc_parent_preferred_name IS NOT NULL")

# Q_U_U: User (Author) collaborates with User (Author)
Q_U_U = f"""WITH S AS (SELECT scopus_id FROM [dbo].[data_author_scopusid_all] WHERE author_id = :p),
FA AS (SELECT author_id, scopus_id FROM [dbo].[data_author_scopusid_all] WHERE scopus_id IN (SELECT scopus_id FROM S)),
B AS (SELECT C.author_id, C.surname, C.given_name, A.scopus_id 
      FROM FA A 
      JOIN [dbo].[data_author_name_aff_country] C ON A.author_id=C.author_id 
      WHERE C.author_id <> :p {FILTER_SNIPPET}), -- Exclude the author itself
D AS (SELECT author_id, surname, given_name, scopus_id FROM B GROUP BY author_id, surname, given_name, scopus_id)
SELECT CAST(author_id AS VARCHAR) AS author_id, surname, given_name, COUNT(scopus_id) AS co_count, STRING_AGG(CAST(scopus_id AS VARCHAR(MAX)), ',') AS scopus_ids
FROM D 
GROUP BY author_id, surname, given_name 
ORDER BY co_count DESC 
OFFSET 0 ROWS 
FETCH NEXT :limit ROWS ONLY"""

# --- New SQL Query for fetching all collaborators for a list of authors ---
# This query is crucial for building the graph for clustering and centrality.
# It retrieves all unique Scopus IDs for the given authors, and then for each Scopus ID,
# it finds all authors associated with it. This forms the basis for collaboration network data.
# :author_ids_str -> comma-separated string of author_ids
Q_ALL_COLLABORATORS_FOR_AUTHORS = """
WITH TargetAuthors AS (
    SELECT value AS author_id FROM STRING_SPLIT(:author_ids_str, ',')
),
AuthorPapers AS (
    SELECT DISTINCT author_id, scopus_id 
    FROM [dbo].[data_author_scopusid_all]
    WHERE author_id IN (SELECT author_id FROM TargetAuthors)
),
AllCollaborators AS (
    SELECT DISTINCT T.author_id AS source_author_id, P.author_id AS target_author_id, P.scopus_id
    FROM AuthorPapers T
    JOIN [dbo].[data_author_scopusid_all] P ON T.scopus_id = P.scopus_id AND T.author_id <> P.author_id -- Ensure it's a different author
)
SELECT 
    source_author_id, 
    target_author_id, 
    scopus_id
FROM AllCollaborators
"""

# --- 統計分析專用查詢 ---

# 獲取作者的 SJR 分佈 (Q1~Q4)
Q_AUTHOR_SJR_STATS = """
SELECT s.SJR_Best_Quartile as label, COUNT(*) as cnt
FROM [dbo].[data_author_scopusid_all] a
JOIN [dbo].[data_Paper_SJR_Best_Quartile] s ON a.scopus_id = s.scopus_id
WHERE CAST(a.author_id AS VARCHAR(50)) = :aid AND s.SJR_Best_Quartile IS NOT NULL AND s.SJR_Best_Quartile <> ''
GROUP BY s.SJR_Best_Quartile
ORDER BY s.SJR_Best_Quartile
"""

# 獲取作者的年度出版統計
Q_AUTHOR_PUB_YEARLY_STATS = """
SELECT YEAR(p.cover_date) as label, COUNT(*) as cnt
FROM [dbo].[data_author_scopusid_all] a
JOIN [dbo].[data_paper_type_cite_date] p ON a.scopus_id = p.scopus_id
WHERE CAST(a.author_id AS VARCHAR(50)) = :aid AND p.cover_date IS NOT NULL
GROUP BY YEAR(p.cover_date)
ORDER BY label DESC
"""

# 獲取作者的 Subject Area (Top2 資料表)
Q_AUTHOR_TOP2_SUBJECTS = """
SELECT sm_field as label, COUNT(*) as cnt
FROM [dbo].[data_author_top2_author_id]
WHERE CAST(author_id AS VARCHAR(50)) = :aid AND sm_field IS NOT NULL AND sm_field <> ''
GROUP BY sm_field
"""
