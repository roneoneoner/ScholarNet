import os
from sqlalchemy import text, create_engine
from dotenv import load_dotenv

# 載入環境變數
load_dotenv()

DB_SERVER = os.getenv("DB_SERVER")
DB_NAME = os.getenv("DB_NAME")
DB_USERNAME = os.getenv("DB_USERNAME")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_DRIVER = os.getenv("DB_DRIVER", "ODBC Driver 17 for SQL Server")

DATABASE_URL = f"mssql+pyodbc://{DB_USERNAME}:{DB_PASSWORD}@{DB_SERVER}/{DB_NAME}?driver={DB_DRIVER}"
engine = create_engine(DATABASE_URL)

test_id = "34768392200"

print(f"--- 正在測試作者 ID: {test_id} ---")

# 這裡列出所有可能出錯的資料表名稱
queries = {
    "核心資料表": "SELECT TOP 1 author_id FROM [dbo].[data_author_name_aff_country]",
    "H-index 表": "SELECT TOP 1 author_id FROM [dbo].[author_id_h_index]",
    "rsNo 關聯表": "SELECT TOP 1 author_id FROM [dbo].[data_author_author_id_rsNo]",
    "Top 2% 表": "SELECT TOP 1 author_id FROM [dbo].[data_author_top2_author_id]",
    "Basic 表": "SELECT TOP 1 rsNo FROM [dbo].[data_author_c302_Basic]",
}

with engine.connect() as conn:
    for name, sql in queries.items():
        try:
            print(f"測試 {name}...", end=" ")
            conn.execute(text(sql))
            print("✅ 成功")
        except Exception as e:
            msg = str(e)
            if "Invalid object name" in msg:
                print(f"❌ 找不到資料表 (Invalid object name)")
            else:
                print(f"❌ 其他錯誤: {msg[:100]}...")

print("--- 測試結束 ---")
