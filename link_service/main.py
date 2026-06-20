import httpx
from fastapi import FastAPI, Depends
from fastapi import HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from link_service.Models.UrlModel import UrlModel
from link_service.Helpers.DBHelper import DBHelper
from contextlib import asynccontextmanager
from fastapi.responses import RedirectResponse
import os
from dotenv import load_dotenv

# Init BD
db_helper = DBHelper()


async def get_db() -> DBHelper:
    return db_helper


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db_helper.init_db()
    yield
    if db_helper.pool:
        await db_helper.pool.close()


async def get_user_service_url():
    load_dotenv()
    return os.getenv("USER_SERVICE_URL", "http://user_service:8001")


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://138.124.99.135:8004"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# functions for work


# function getter url for user
@app.get("/user/{user_id}/url/{short_code}")
async def get_url_for_user(
    short_code: str,
    user_id: str,
    db: DBHelper = Depends(get_db),
    user_service_url: str = Depends(get_user_service_url),
) -> JSONResponse:

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{user_service_url}/user/{user_id}")
            if response.status_code == 404:
                raise HTTPException(status_code=404, detail="User not found")
            response.raise_for_status()
        except httpx.RequestError:
            raise HTTPException(status_code=503, detail="User service unavailable")

    original_url = await db.get_original_url_for_user(short_code, user_id)

    if original_url is None:
        raise HTTPException(status_code=404, detail="Short URL not found")

    return JSONResponse(
        content={
            "short_code": short_code,
            "original_url": original_url["original_url"],
        },
        status_code=200,
    )


# curl -X POST http://192.168.3.124:8000/user/test/urls -H "Content-Type: application/json" -d "{\"url\":\"https://docs.python.org/3/library/asyncio.html\"}"


# function postter url for user
@app.post("/user/{user_id}/urls")
async def post_url_for_user(
    url_data: UrlModel,
    user_id: str,
    db: DBHelper = Depends(get_db),
    user_service_url: str = Depends(get_user_service_url),
) -> JSONResponse:

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{user_service_url}/user/{user_id}")
            if response.status_code == 404:
                raise HTTPException(status_code=404, detail="User not found")
            response.raise_for_status()
        except httpx.RequestError:
            raise HTTPException(status_code=503, detail="User service unavailable")

    # Создаём ссылку
    result = await db.Add_user_link(user_id, str(url_data.url))

    return JSONResponse(
        content={
            "short_code": result,
            "short_url": f"/{result}",
            "original_url": str(url_data.url),
            "message": "Link created",
        },
        status_code=201,
    )


# function getter list urls for user
@app.get("/user/{user_id}/urls")
async def get_user_urls(
    user_id: str,
    db: DBHelper = Depends(get_db),
    user_service_url: str = Depends(get_user_service_url),
) -> JSONResponse:

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{user_service_url}/user/{user_id}")
            if response.status_code == 404:
                raise HTTPException(status_code=404, detail="User not found")
            response.raise_for_status()
        except httpx.RequestError:
            raise HTTPException(status_code=503, detail="User service unavailable")

    original_urls = await db.get_user_original_urls(user_id)
    short_urls = await db.get_user_short_urls(user_id)

    links = [
        {"short_code": short, "original_url": original}
        for short, original in zip(short_urls, original_urls)
    ]

    return JSONResponse(content={"user_id": user_id, "links": links}, status_code=200)


# function getter url by short code
@app.get("/{short_code}")
async def redirect_to_url(short_code: str, db: DBHelper = Depends(get_db)):
    original = await db.get_original_url_by_short_code(short_code)
    if original is None:
        raise HTTPException(status_code=404, detail="Short URL not found")
    await db.update_clicks(short_code)
    return RedirectResponse(url=original, status_code=302)


# fucntion getter clicks by short code
@app.get("/short_code/{short_code}/clicks")
async def get_short_code_clicks(short_code: str, db: DBHelper = Depends(get_db)):
    clicks = await db.get_clicks_for_short_code(short_code=short_code)
    if clicks is None:
        raise HTTPException(status_code=404, detail="Short URL not found")
    return JSONResponse(content={"short_code": short_code, "clicks": clicks}, status_code=200)

# fucntion deletter user link
@app.delete("/user/{user_id}/url/{original_url}")
async def delete_user_link(user_id: str, original_url:str, db :DBHelper = Depends(get_db), user_service_url: str = Depends(get_user_service_url)):
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{user_service_url}/user/{user_id}")
            if response.status_code == 404:
                raise HTTPException(status_code=404, detail="User not found")
            response.raise_for_status()
        except httpx.RequestError:
            raise HTTPException(status_code=503, detail="User service unavailable")

    await db.delete_user_link(user_id, original_url)

    return JSONResponse(
        content={
            "user_id": user_id,
            "original_url": original_url,
            "message": "Link deleted",
        },
        status_code=200,
    )
    

@app.delete("/user/{user_id}/url/{short_code}")
async def delete_user_link_by_code(
    user_id: str,
    short_code: str,
    db: DBHelper = Depends(get_db),
    user_service_url: str = Depends(get_user_service_url)
):
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{user_service_url}/user/{user_id}")
            if response.status_code == 404:
                raise HTTPException(status_code=404, detail="User not found")
            response.raise_for_status()
        except httpx.RequestError:
            raise HTTPException(status_code=503, detail="User service unavailable")


    await db.delete_user_link_by_code(user_id, short_code)
    return JSONResponse(content={"message": "Link deleted"}, status_code=200)

# functions for exceptions
# funtion for falue error
# @app.exception_handler(ValueError)
# async def value_error_handler(request: Request) -> JSONResponse:
#     # code
#     return JSONResponse(content="", status_code=400)
