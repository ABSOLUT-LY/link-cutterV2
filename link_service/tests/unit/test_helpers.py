from link_service.Helpers.LinkCutterHelper import LinkCutter
import pytest

@pytest.mark.asyncio
async def test_generate_short_code():
    cutter = LinkCutter()
    
    code = await cutter.generate_short_code()
    
    assert code is not None
    assert len(code) > 0

    assert code.isalnum()
    
    assert len(code) == 6
    
@pytest.mark.asyncio
async def test_set_len_short_code():
    cutter = LinkCutter()
    
    await cutter.set_length(10)
    
    code = await cutter.generate_short_code()
    
    assert len(code) == 10