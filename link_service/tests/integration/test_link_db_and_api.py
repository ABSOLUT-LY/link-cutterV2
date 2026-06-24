import pytest
from dotenv import load_dotenv
from link_service.Helpers.DBHelper import DBHelper

load_dotenv(".env.test")

@pytest.mark.asyncio
async def test_db_connection():
    #Проверяем, что БД подключается
    db = DBHelper()
    await db.init_test_db()
    assert db.pool is not None
    await db.pool.close()
    
@pytest.mark.asyncio
async def test_add_link():
    db = DBHelper()
    await db.init_test_db()
    
    user_id = "test_user_add_link"
    original_url = "https://example.com/integration"


    #создаем код
    short_code = await db.Add_user_link(user_id, original_url)

    assert short_code is not None
    assert len(short_code) > 0
    
    #проверяем что ссылка сохранилась
    saved = await db.get_original_url_by_short_code(short_code=short_code)
    assert saved == original_url
    
    #проверяем уникальность кода
    code_check = await db.get_short_code_for_all(short_code=short_code)
    assert code_check is not None
    
    # Очистка
    await db.delete_user_link(user_id,original_link=original_url)
    if db.pool is not None:
        await db.pool.close()
        
@pytest.mark.asyncio
async def test_get_user_links():
    db = DBHelper()
    await db.init_test_db()
    
    user_id = "test_get_user_link"
    urls = ["https://example.com/integration/1", "https://example.com/integration/2"]
    
    codes : list[str] = []
    for url in urls:
        code = await db.Add_user_link(user_id=user_id, original_link=url)
        codes.append(code)
        
    original_urls = await db.get_user_original_urls(user_id=user_id)
    short_urls = await db.get_user_short_urls(user_id=user_id)
    
    assert len(original_urls) == len(urls)
    assert len(short_urls) == len(codes)
    
    for url in urls:
        await db.delete_user_link(user_id, original_link=url)
    if db.pool is not None:
        await db.pool.close()

@pytest.mark.asyncio
async def test_update_clicks():
    db = DBHelper()
    await db.init_test_db()
    
    user_id = "test_update_clicks"
    original_url = "https://example.com/integration/clicks"
    
    short_code = await db.Add_user_link(user_id, original_url)
    
    # Обновляем клики
    await db.update_clicks(short_code)
    await db.update_clicks(short_code)
    
    # Проверяем, что клики увеличились
    clicks = await db.get_clicks_for_short_code(short_code)
    assert clicks == 2
    
    # Очистка
    await db.delete_user_link(user_id,original_link=original_url)
    if db.pool is not None:
        await db.pool.close()
@pytest.mark.asyncio
async def test_get_original_url_by_short_code():
    db = DBHelper()
    await db.init_test_db()
    
    user_id = "test_get_original_url_by_short_code"
    original_url = "https://example.com/integration/find"
    
    short_code = await db.Add_user_link(user_id, original_url)
    
    result = await db.get_original_url_by_short_code(short_code)
    assert result == original_url
    
    # Несуществующий код
    result = await db.get_original_url_by_short_code("notexist")
    assert result is None
    
    # Очистка
    await db.delete_user_link(user_id,original_link=original_url)
    if db.pool is not None:
        await db.pool.close()
