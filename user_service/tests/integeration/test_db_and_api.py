import pytest
from dotenv import load_dotenv
from user_service.Helpers.DBHelper import DBHelper

load_dotenv(".env.test")

@pytest.mark.asyncio
async def test_connection():
    db = DBHelper()
    await db.init_test_db()
    assert db.pool is not None
    await db.pool.close()
    
@pytest.mark.asyncio
async def test_add_user():
    db = DBHelper()
    await db.init_test_db()
    
    user_id = "test_add_user"
    
    await db.Add_user(user_id=user_id)
    
    assert db.get_user_info(user_id=user_id) is not None
    
# @pytest.mark.asyncio
# async def test_user_exist