from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.responses import HTMLResponse
from app.core.config import settings

app = FastAPI(
    title="SideKick API",
    docs_url=None, # Disable default docs to use our custom UI
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    html_response = get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title=app.title + " - API Reference",
        oauth2_redirect_url=app.swagger_ui_oauth2_redirect_url,
    )
    
    custom_css = """
    <style>
      body {
        background-color: #F8FAFC !important;
        color: #0F172A !important;
        font-family: 'Inter', sans-serif !important;
      }
      .swagger-ui .topbar {
        background-color: #FFFFFF !important;
        border-bottom: 1px solid #E2E8F0 !important;
        box-shadow: 0 4px 20px rgba(0,0,0,0.04) !important;
      }
      .swagger-ui .topbar .wrapper .link {
        color: #0F172A !important;
        font-weight: 800;
        font-size: 1.25rem;
      }
      .swagger-ui .topbar .wrapper .link img {
        display: none !important;
      }
      .swagger-ui .topbar .wrapper .link::before {
        content: 'Side';
        color: #0F172A;
      }
      .swagger-ui .topbar .wrapper .link::after {
        content: 'Kick';
        color: #FACC15;
      }
      .swagger-ui .info .title {
        color: #0F172A !important;
      }
      .swagger-ui .opblock-tag {
        color: #0F172A !important;
        border-bottom: 1px solid #E2E8F0 !important;
      }
      .swagger-ui .opblock {
        background-color: #FFFFFF !important;
        border: 1px solid #E2E8F0 !important;
        border-radius: 16px !important;
        box-shadow: 0 4px 20px rgba(0,0,0,0.04) !important;
        margin-bottom: 20px !important;
      }
      .swagger-ui .opblock .opblock-summary {
        border-bottom: 1px solid transparent !important;
      }
      .swagger-ui .opblock.is-open .opblock-summary {
        border-bottom: 1px solid #E2E8F0 !important;
      }
      .swagger-ui .opblock .opblock-summary-method {
        background: #FACC15 !important;
        color: #0F172A !important;
        border-radius: 8px !important;
      }
      .swagger-ui .opblock .opblock-summary-path {
        color: #0F172A !important;
      }
      .swagger-ui .opblock .opblock-summary-description {
        color: #64748B !important;
      }
      .swagger-ui .btn {
        background-color: #FACC15 !important;
        color: #0F172A !important;
        border: none !important;
        border-radius: 8px !important;
        font-weight: bold !important;
        box-shadow: 0 4px 10px rgba(250, 204, 21, 0.2) !important;
      }
      .swagger-ui .btn:hover {
        opacity: 0.9 !important;
      }
      .swagger-ui section.models {
        background-color: #FFFFFF !important;
        border: 1px solid #E2E8F0 !important;
        border-radius: 16px !important;
        box-shadow: 0 4px 20px rgba(0,0,0,0.04) !important;
      }
      .swagger-ui section.models h4 {
        color: #0F172A !important;
        border-bottom: 1px solid #E2E8F0 !important;
      }
      .swagger-ui .model, .swagger-ui .model-title {
        color: #0F172A !important;
      }
      .swagger-ui table thead tr th {
        color: #0F172A !important;
        border-bottom: 1px solid #E2E8F0 !important;
      }
      .swagger-ui .parameter__name {
        color: #0F172A !important;
      }
      .swagger-ui .parameter__type, .swagger-ui .parameter__in {
        color: #64748B !important;
      }
      .swagger-ui .response-col_status {
        color: #0F172A !important;
      }
      .swagger-ui .response-col_description {
        color: #64748B !important;
      }
      .swagger-ui .opblock-body pre.microlight {
        background-color: #F8FAFC !important;
        border-radius: 8px !important;
        border: 1px solid #E2E8F0 !important;
        color: #0F172A !important;
      }
      .swagger-ui .markdown p, .swagger-ui .markdown li {
        color: #64748B !important;
      }
    </style>
    """
    
    response_content = html_response.body.decode("utf-8")
    response_content = response_content.replace("</head>", f"{custom_css}</head>")
    return HTMLResponse(response_content)

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.v1 import auth, profiles, jobs

app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(profiles.router, prefix=f"{settings.API_V1_STR}/profiles", tags=["profiles"])
app.include_router(jobs.router, prefix=f"{settings.API_V1_STR}/jobs", tags=["jobs"])
@app.get("/")
def read_root():
    return {"message": "Welcome to Sidekick API"}
