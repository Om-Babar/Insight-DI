from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, Response
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.common import APIResponse
from app.schemas.chatbot import (
    ChatbotQueryRequest,
    ChatbotQueryResponse,
    ReportGenerateRequest,
    BusinessReportData,
)
from app.services.chatbot_service import DatasetTrainedChatbot
from app.services.report_service import ReportGeneratorService

router = APIRouter()


@router.post("/query", response_model=APIResponse[ChatbotQueryResponse])
async def query_business_chatbot(
    request: ChatbotQueryRequest,
    db: Session = Depends(get_db),
):
    """
    Query the SME AI Business Chatbot trained on the enterprise dataset.
    Recognizes intents across:
      - What-If Scenario Simulations
      - Root Cause Analysis (RCA)
      - Revenue Forecasting & TreeSHAP
      - Competitive Market Intelligence
      - Prescriptive Business Directives
      - Core Sales KPIs
    Grounds answers in factual dataset evidence and incorporates LLM narratives.
    """
    try:
        response = await DatasetTrainedChatbot.process_query(db=db, request=request)
        return APIResponse(
            success=True,
            message="Chatbot query processed successfully.",
            data=response,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chatbot failed: {str(e)}")


@router.post("/report/generate")
def generate_business_report(
    request: ReportGenerateRequest,
    db: Session = Depends(get_db),
):
    """
    Generate an automated comprehensive business report in JSON, PDF, or CSV format.
    Aggregates KPIs, forecasts, root causes, and recommendations.
    """
    try:
        report_data = ReportGeneratorService.generate_report_data(db=db, request=request)

        if request.format.lower() == "pdf":
            pdf_bytes = ReportGeneratorService.generate_pdf(report_data)
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={"Content-Disposition": f"attachment; filename={report_data.report_id}.pdf"},
            )
        elif request.format.lower() == "csv":
            csv_str = ReportGeneratorService.generate_csv(report_data)
            return Response(
                content=csv_str,
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename={report_data.report_id}.csv"},
            )
        else:
            return APIResponse(
                success=True,
                message="Report generated successfully.",
                data=report_data,
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")
