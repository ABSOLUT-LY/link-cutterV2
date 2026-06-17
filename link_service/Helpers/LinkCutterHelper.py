import string
import secrets

class LinkCutter:
    def __init__(self, lenght: int = 6) -> None:
        self.lenght = lenght
        
    async def generate_short_code(self) -> str:
        alphabet: str = string.ascii_letters + string.digits
        return ''.join(secrets.choice(alphabet) for _ in range(self.lenght))
        
    async def set_lenght(self, lenght: int) -> None:
        self.lenght = lenght