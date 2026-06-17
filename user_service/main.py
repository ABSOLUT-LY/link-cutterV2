from fastapi import FastAPI, Depends
from fastapi import HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from user_service.Helpers.DBHelper import DBHelper
from contextlib import asynccontextmanager

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


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# functions for work


# function getter user id
@app.get("/user/{user_id}")
async def get_user(user_id: str, db: DBHelper = Depends(get_db)) -> JSONResponse:
    user = await db.get_user_info(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return JSONResponse(
        content={"user_id": user["user_id"], "created_at": str(user["created_at"])},
        status_code=200,
    )

# function getter users
@app.get("/users")
async def get_users(db: DBHelper = Depends(get_db)) -> JSONResponse:
    users = await db.get_users_info()
    if users == []:
        raise HTTPException(status_code=400, detail="Users are not found")
    return JSONResponse(
        content={"users": [{"user_id": u["user_id"], "created_at": str(u["created_at"])} for u in users]},
        status_code=200,
    )


# function postter user id
@app.post("/user/{user_id}")
async def post_user(user_id: str, db: DBHelper = Depends(get_db)) -> JSONResponse:
    try:
        await db.Add_user(user_id)
        return JSONResponse(
            content={"message": f"User {user_id} created", "user_id": user_id},
            status_code=201,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# function delete user
@app.delete("/user/{user_id}")
async def delete_user(user_id: str, db: DBHelper = Depends(get_db)) -> JSONResponse:
    user = await db.get_user_info(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    try:
        await db.delete_user(user_id)
        return JSONResponse(
            content={"message": f"User {user_id} deleted"}, status_code=200
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# functions for exceptions
# funtion for falue error
# @app.exception_handler(ValueError)
# async def value_error_handler(request: Request) -> JSONResponse:
#     # code
#     return JSONResponse(content="", status_code=400)
