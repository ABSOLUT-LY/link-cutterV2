from link_service.Helpers.LinkCutterHelper import LinkCutter
import asyncpg
from typing import Optional
import os
from dotenv import load_dotenv

class DBHelper:
    def __init__(self) -> None:
        self.cutter = LinkCutter()
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
        #create links
        await self.pool.execute("""
            CREATE TABLE IF NOT EXISTS links(
                short_code TEXT PRIMARY KEY,
                original_url TEXT NOT NULL,
                user_id TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                clicks INTEGER DEFAULT 0
            )
        """)
        #index for index
        await self.pool.execute("""
            CREATE INDEX IF NOT EXISTS idx_links_user_id ON links(user_id)
        """)

    #init test db
    async def init_test_db(self):
        load_dotenv(".env.test")
        self.pool = await asyncpg.create_pool(
            host=os.getenv("DB_HOST", "localhost"),
            port=os.getenv("DB_PORT", "5433"),
            user=os.getenv("DB_USER", "postgres"),
            password=os.getenv("DB_PASSWORD"),
            database=os.getenv("DB_NAME", "cutter_links"),
        )
        #create links
        await self.pool.execute("""
            CREATE TABLE IF NOT EXISTS links(
                short_code TEXT PRIMARY KEY,
                original_url TEXT NOT NULL,
                user_id TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                clicks INTEGER DEFAULT 0
            )
        """)
        #index for index
        await self.pool.execute("""
            CREATE INDEX IF NOT EXISTS idx_links_user_id ON links(user_id)
        """)

    #getters
    async def get_user_original_urls(self, user_id: str):
        if not self.pool:
            raise RuntimeError("База данных не инициализирована.")
        return [i["original_url"] for i in await self.pool.fetch("SELECT original_url FROM links WHERE user_id = $1", user_id)]
    
    async def get_original_urls(self):
        if not self.pool:
            raise RuntimeError("База данных не инициализирована.")
        return [i["original_url"] for i in await self.pool.fetch("SELECT original_url FROM links")]
    
    async def get_user_short_urls(self, user_id: str):
        if not self.pool:
            raise RuntimeError("База данных не инициализирована.")
        return [i["short_code"] for i in await self.pool.fetch("SELECT short_code FROM links WHERE user_id = $1", user_id)]
    
    async def get_short_code_for_all(self, short_code:str):
        if not self.pool:
            raise RuntimeError("База данных не инициализирована.")
        return await self.pool.fetchrow("SELECT short_code FROM links WHERE short_code = $1", short_code)
    
    async def get_short_code_for_user(self, original_url: str) -> str | None:
        if not self.pool:
            raise RuntimeError("База данных не инициализирована.")
        row = await self.pool.fetchrow(
            "SELECT short_code FROM links WHERE original_url = $1", 
            original_url
        )
        return row["short_code"] if row else None
    
    async def get_original_url_for_user(self, short_code: str, user_id:str):
        if not self.pool:
            raise RuntimeError("База данных не инициализирована.")
        return await self.pool.fetchrow("SELECT original_url FROM links WHERE short_code = $1 AND user_id = $2", short_code, user_id)
    
    async def get_original_url_by_short_code(self, short_code: str) -> str | None:
        if not self.pool:
            raise RuntimeError("База данных не инициализирована.")
        row = await self.pool.fetchrow(
            "SELECT original_url FROM links WHERE short_code = $1", 
            short_code
        )
        return row["original_url"] if row else None
    
    async def get_clicks_for_short_code(self, short_code: str):
        if not self.pool:
            raise RuntimeError("База данных не инициализирована.")
        row = await self.pool.fetchrow("SELECT clicks FROM links WHERE short_code = $1", short_code)
        return row["clicks"] if row else None
    
    #setters
    async def Add_user_link(self, user_id: str, original_link:str):
        if not self.pool:
            raise RuntimeError("База данных не инициализирована.")
        # is_unique = await self.uniqueness_original_link_check(original_link)
        # if (is_unique):
        short_code = await self.cutter.generate_short_code()
        while (await self.uniqueness_short_code(short_code) == False):
            short_code = await self.cutter.generate_short_code()
        await self.pool.execute("INSERT INTO links (short_code, original_url, user_id) VALUES ($1,$2,$3)", short_code, original_link, user_id)
        return short_code
        # else:
        #     existing_code = await self.get_short_code_for_user(original_link)
        #     return existing_code

    async def update_clicks(self, short_code:str):
        if not self.pool:
            raise RuntimeError("База данных не инициализирована.")
        return await self.pool.execute("UPDATE links SET clicks = clicks + 1 WHERE short_code = $1", short_code)
        
    #deletters
    async def delete_user_link(self, user_id: str, original_link:str):
        if not self.pool:
            raise RuntimeError("База данных не инициализирована.")
        row = await self.pool.fetchrow(
            "SELECT original_url FROM links WHERE user_id = $1 AND original_url = $2",
            user_id, original_link
        )
        if not row:
            raise ValueError("Ссылка не найдена")
    
        return await self.pool.execute("DELETE FROM links WHERE original_url=$1 AND user_id = $2",original_link, user_id)
        
    async def delete_user_link_by_code(self, user_id: str, short_code: str):
        if not self.pool:
            raise RuntimeError("База данных не инициализирована.")
        row = await self.pool.fetchrow(
            "SELECT original_url FROM links WHERE user_id = $1 AND short_code = $2",
            user_id, short_code
        )
        if not row:
            raise ValueError("Ссылка не найдена")
        return await self.pool.execute(
            "DELETE FROM links WHERE user_id = $1 AND short_code = $2",
            user_id, short_code
        )
        
    #Validate heplers
    async def uniqueness_original_link_check(self, link_foreign: str) -> bool:
        # get all urls and validate uniqueness
        for link in await(self.get_original_urls()):
            if link == link_foreign:
                return False
        return True
    
    async def uniqueness_short_link_check(self, user_id: str, link_foreign: str) -> bool:
        # get all urls and validate uniqueness
        for link in await(self.get_user_short_urls(user_id)):
            if link == link_foreign:
                return False
        return True
    
    async def uniqueness_short_code(self, code: str) -> bool:
        if await self.get_short_code_for_all(code) is None:
            return True
        else:
            return False

