import asyncpg
from typing import Optional
import os
from dotenv import load_dotenv

class DBHelper:
    def __init__(self) -> None:
        self.pool: Optional[asyncpg.Pool] = None
     
    #init db
    async def init_db(self):
        load_dotenv()
        self.pool = await asyncpg.create_pool(
            host=os.getenv("DB_HOST", "localhost"),
            port=os.getenv("DB_PORT", "5432"),
            user=os.getenv("DB_USER", "postgres"),
            password=os.getenv("DB_PASSWORD"),
            database=os.getenv("DB_NAME", "cutter_links"),
        )
        #create users
        await self.pool.execute("""
            CREATE TABLE IF NOT EXISTS users(
                user_id TEXT PRIMARY KEY,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

    #getters
    async def get_user_info(self, user_id: str):
        if not self.pool:
            raise RuntimeError("База данных не инициализирована.")
        return await self.pool.fetchrow("SELECT * FROM users WHERE user_id = $1", user_id)
    
    async def get_users_info(self):
        if not self.pool:
            raise RuntimeError("База данных не инициализирована.")
        return await self.pool.fetch("SELECT user_id, created_at FROM users ORDER BY created_at DESC")

    #setters
    async def Add_user(self, user_id:str):     
        if not self.pool:
            raise RuntimeError("База данных не инициализирована.")
        if await self.uniqueness_user_id(user_id):
            raise ValueError("Юзер с таким id уже зарегистрирован")
        else:
            return await self.pool.execute("INSERT INTO users (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING;", user_id)

    #deletters
    async def delete_user(self, user_id:str):
        if not self.pool:
            raise RuntimeError("База данных не инициализирована.")
        if await self.get_user_info(user_id):
            return await self.pool.execute("DELETE FROM users WHERE user_id = $1", user_id)
        else:
            raise ValueError("Юзера с таким id нет")

    #Validate heplers
    async def user_exists(self, user_id: str) -> bool:
        user = await self.get_user_info(user_id)
        return user is not None
    
    async def uniqueness_user_id(self, user_id: str) -> bool:
        if await self.get_user_info(user_id) is None:
            return False
        return True
