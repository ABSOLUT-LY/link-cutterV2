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
    
    assert await db.get_user_info(user_id=user_id) is not None
    
    await db.delete_user(user_id)
    
@pytest.mark.asyncio
async def test_user_exist():
    db = DBHelper()
    await db.init_test_db()
    
    user_id = "test_user_exist"
    
    await db.Add_user(user_id=user_id)
    
    assert await db.user_exists(user_id=user_id) == True
    
    await db.delete_user(user_id)
    if db.pool is not None:
        await db.pool.close()
    
@pytest.mark.asyncio
async def test_user_uniqueness():
    db = DBHelper()
    await db.init_test_db()
    
    user_id = "test_user_uniqueness"
    
    await db.Add_user(user_id=user_id)
    with pytest.raises(ValueError, match="Юзер с таким id уже зарегистрирован"):
        await db.Add_user(user_id=user_id)
    
    await db.delete_user(user_id)
    if db.pool is not None:
        await db.pool.close()
        
@pytest.mark.asyncio
async def test_get_user_info():
    db = DBHelper()
    await db.init_test_db()
    
    user_id = "test_get_user_info"
    
    await db.Add_user(user_id=user_id)

    assert await db.get_user_info(user_id=user_id) is not None
    
    await db.delete_user(user_id)
    if db.pool is not None:
        await db.pool.close()
        
@pytest.mark.asyncio
async def test_get_users_info():
    db = DBHelper()
    await db.init_test_db()
    
    for i in range(10):
        user_id = f"test_get_user_info{i}"
        await db.Add_user(user_id=user_id)

    assert await db.get_users_info() is not None
    
    for i in range(10):
        user_id = f"test_get_user_info{i}"
        await db.delete_user(user_id)
    if db.pool is not None:
        await db.pool.close()