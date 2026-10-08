import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.services.chatbot_service import HybridGroundedChatbot
from app.schemas.chatbot import ChatbotQueryRequest
from app.services.external_knowledge_service import ExternalKnowledgeService

client = TestClient(app)


def test_external_knowledge_retriever():
    """Verify that ExternalKnowledgeService retrieves domain benchmarks and compliance facts."""
    results = ExternalKnowledgeService.retrieve_domain_knowledge("What is the typical ROAS and conversion rate?")
    assert len(results) > 0
    assert any("ROAS" in r["content"] or "conversion" in r["content"].lower() for r in results)
    assert results[0]["source"] is not None

    gst_results = ExternalKnowledgeService.retrieve_domain_knowledge("GST rules and TCS section 52")
    assert len(gst_results) > 0
    assert any("GST" in r["title"] or "TCS" in r["content"] for r in gst_results)


@pytest.mark.asyncio
async def test_chatbot_internal_what_if():
    """Verify that what-if simulation uses WhatIfSimulator with exact mathematical metrics."""
    db = SessionLocal()
    try:
        req = ChatbotQueryRequest(message="What if I increase ad spend by 30% and reduce price by 5%?")
        resp = await HybridGroundedChatbot.process_query(db, req)
        assert resp.detected_intent == "what_if_simulation"
        assert "internal_business_data" in resp.sources_used
        assert len(resp.data_citations) >= 2
        assert any(c.source_type == "internal_business_data" for c in resp.data_citations)
        assert "Projected Revenue" in resp.reply
        assert "Projected Net Profit" in resp.reply
        assert len(resp.suggested_followups) == 3
    finally:
        db.close()


@pytest.mark.asyncio
async def test_chatbot_internal_rca():
    """Verify Root Cause Analysis grounding."""
    db = SessionLocal()
    try:
        req = ChatbotQueryRequest(message="Why did our revenue drop in the latest period?")
        resp = await HybridGroundedChatbot.process_query(db, req)
        assert resp.detected_intent == "root_cause"
        assert "internal_business_data" in resp.sources_used
        assert "Root Cause" in resp.reply or "Diagnostic" in resp.reply
        assert len(resp.data_citations) > 0
    finally:
        db.close()


@pytest.mark.asyncio
async def test_chatbot_internal_forecast_shap():
    """Verify Predictive Revenue Forecast and TreeSHAP attribution."""
    db = SessionLocal()
    try:
        req = ChatbotQueryRequest(message="Forecast revenue for next month with XGBoost and SHAP waterfall")
        resp = await HybridGroundedChatbot.process_query(db, req)
        assert resp.detected_intent == "forecast"
        assert "internal_business_data" in resp.sources_used
        assert "XGBoost" in resp.reply or "Forecast" in resp.reply
        assert len(resp.data_citations) > 0
    finally:
        db.close()


@pytest.mark.asyncio
async def test_chatbot_internal_customer_segmentation():
    """Verify Customer Segmentation with K-Means and RFM metrics."""
    db = SessionLocal()
    try:
        req = ChatbotQueryRequest(message="Show me our customer segments and k-means rfm clusters")
        resp = await HybridGroundedChatbot.process_query(db, req)
        assert resp.detected_intent == "customer_segmentation"
        assert "internal_business_data" in resp.sources_used
        assert "Cluster" in resp.reply or "Persona" in resp.reply or "RFM" in resp.reply
        assert len(resp.data_citations) > 0
    finally:
        db.close()


@pytest.mark.asyncio
async def test_chatbot_internal_inventory():
    """Verify Inventory Health and stockout diagnostics."""
    db = SessionLocal()
    try:
        req = ChatbotQueryRequest(message="Which products are out of stock and what is our stockout rate?")
        resp = await HybridGroundedChatbot.process_query(db, req)
        assert resp.detected_intent == "inventory_status"
        assert "internal_business_data" in resp.sources_used
        assert "Stockout" in resp.reply or "Inventory" in resp.reply
        assert len(resp.data_citations) > 0
    finally:
        db.close()


@pytest.mark.asyncio
async def test_chatbot_live_competitor_intel():
    """Verify Live Competitive Data retrieval from Amazon and Flipkart scrapers."""
    db = SessionLocal()
    try:
        req = ChatbotQueryRequest(message="What are competitor prices and discounts for headphones on Amazon and Flipkart?")
        resp = await HybridGroundedChatbot.process_query(db, req)
        assert resp.detected_intent == "competitor_intel"
        assert "live_competitive_data" in resp.sources_used
        assert "Amazon India" in resp.reply
        assert "Flipkart" in resp.reply
        # Check that live provenance citations are present
        comp_citations = [c for c in resp.data_citations if c.source_type == "live_competitive_data"]
        assert len(comp_citations) > 0
        assert any("Amazon" in c.source_table for c in comp_citations)
        assert any(c.provenance_url is not None for c in comp_citations)
    finally:
        db.close()


@pytest.mark.asyncio
async def test_chatbot_external_knowledge():
    """Verify External Knowledge retrieval for e-commerce benchmarks and GST compliance."""
    db = SessionLocal()
    try:
        req = ChatbotQueryRequest(message="What are the Indian GST and TCS rules for e-commerce sellers?")
        resp = await HybridGroundedChatbot.process_query(db, req)
        assert resp.detected_intent == "external_knowledge"
        assert "external_knowledge" in resp.sources_used
        assert "GST" in resp.reply or "TCS" in resp.reply or "Tax" in resp.reply
        ext_citations = [c for c in resp.data_citations if c.source_type == "external_knowledge"]
        assert len(ext_citations) > 0
    finally:
        db.close()


@pytest.mark.asyncio
async def test_chatbot_hybrid_query():
    """Verify Hybrid Query combining internal sales KPIs, live competitors, and external benchmarks."""
    db = SessionLocal()
    try:
        req = ChatbotQueryRequest(message="Compare our revenue performance with Amazon competitors and industry return rate benchmarks")
        resp = await HybridGroundedChatbot.process_query(db, req)
        assert resp.detected_intent == "hybrid"
        assert "internal_business_data" in resp.sources_used
        assert "live_competitive_data" in resp.sources_used
        assert "external_knowledge" in resp.sources_used
        assert len(resp.data_citations) >= 3
    finally:
        db.close()


def test_api_chatbot_query_endpoint():
    """Verify FastAPI /api/v1/chatbot/query endpoint execution."""
    payload = {
        "message": "Give me prescriptive recommendations to increase our profit margin.",
        "llm_provider": "trained_dataset"
    }
    response = client.post("/api/v1/chatbot/query", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["detected_intent"] == "recommendation"
    assert "internal_business_data" in data["data"]["sources_used"]
    assert len(data["data"]["data_citations"]) > 0
    assert len(data["data"]["suggested_followups"]) > 0
