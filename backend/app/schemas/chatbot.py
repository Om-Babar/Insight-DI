from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


# ── Chatbot Schemas ──────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str = Field(..., description="'user', 'assistant', or 'system'")
    content: str


class ChatbotQueryRequest(BaseModel):
    message: str = Field(..., description="User query in natural language")
    conversation_id: Optional[str] = Field(None, description="Optional persistent conversation identifier")
    llm_provider: Optional[str] = Field(None, description="Override LLM provider: 'gemini', 'openai', or 'trained_dataset'")


class DataFactCitation(BaseModel):
    category: str
    fact: str
    source_table: str
    source_type: Optional[str] = Field("internal_business_data", description="'internal_business_data', 'live_competitive_data', or 'external_knowledge'")
    provenance_url: Optional[str] = Field(None, description="Direct URL or table/document reference for verification")


class ChatbotQueryResponse(BaseModel):
    conversation_id: str
    detected_intent: str = Field(..., description="'sales_kpi', 'root_cause', 'forecast', 'what_if_simulation', 'competitor_intel', 'recommendation', 'customer_segmentation', 'inventory_status', 'external_knowledge', 'hybrid'")
    reply: str = Field(..., description="Contextual natural-language response trained/grounded in enterprise dataset and external intelligence")
    llm_provider_used: str
    sources_used: List[str] = Field(default_factory=list, description="Information sources activated: 'internal_business_data', 'live_competitive_data', 'external_knowledge'")
    data_citations: List[DataFactCitation]
    suggested_followups: List[str]



# ── Automated Reports Schemas ────────────────────────────────────────

class ReportGenerateRequest(BaseModel):
    title: Optional[str] = "InsightDI Executive Intelligence Report"
    include_kpis: bool = True
    include_forecast: bool = True
    include_rca: bool = True
    include_recommendations: bool = True
    include_competitors: bool = True
    format: str = Field("json", description="'json', 'pdf', or 'csv'")


class BusinessReportData(BaseModel):
    report_id: str
    generated_at: str
    title: str
    executive_summary: str
    kpi_scorecard: Dict[str, Any]
    revenue_forecast_summary: Dict[str, Any]
    root_cause_findings: Dict[str, Any]
    strategic_recommendations: List[Dict[str, Any]]
    competitive_overview: Dict[str, Any]
