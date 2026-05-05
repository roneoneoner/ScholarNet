from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend
from routers import author, coop, nobel
from database import engine
import models
import traceback

app = FastAPI(title="ScholarNet Data Analytics API", version="5.2.0")

@app.on_event("startup")
async def startup():
    FastAPICache.init(InMemoryBackend())

# 強化 CORS 設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 全域異常處理器：確保報錯時依然回傳 CORS Header
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"GLOBAL ERROR: {str(exc)}")
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"},
        headers={"Access-Control-Allow-Origin": "*"}
    )

models.Base.metadata.create_all(bind=engine)

app.include_router(author.router, prefix="/api/author", tags=["Author"])
app.include_router(coop.router,   prefix="/api/coop",   tags=["Cooperation"])
app.include_router(nobel.router,  prefix="/api/nobel",  tags=["Nobel"])

@app.get("/")
def root():
    return {"message": "ScholarNet API v5.2 Running"}
