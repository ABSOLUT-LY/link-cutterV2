from pydantic import BaseModel, HttpUrl
    
class UrlModel (BaseModel):
    url: HttpUrl