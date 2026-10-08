"""
External Knowledge & Domain RAG Service for InsightDI.
Provides verified industry benchmarks, marketplace policies, Indian e-commerce
regulations (GST/TCS/ONDC), logistics best practices, and optional web retrieval.
"""

import re
import logging
from typing import Dict, List, Any, Optional
import httpx

logger = logging.getLogger("insightdi.external_knowledge")

# ════════════════════════════════════════════════════════════════════
# CURATED E-COMMERCE INDUSTRY RAG REPOSITORY
# ════════════════════════════════════════════════════════════════════

KNOWLEDGE_DOCUMENTS = [
    {
        "id": "benchmarks_roas_conversion",
        "category": "industry_benchmarks",
        "title": "E-Commerce Advertising & Conversion Benchmarks",
        "keywords": ["roas", "cac", "conversion rate", "aov", "benchmark", "industry standard", "meta ads", "google ads"],
        "content": (
            "Industry Benchmarks for Indian E-Commerce:\n"
            "- Healthy ROAS (Return on Ad Spend) for consumer goods is 3.0x to 5.0x. ROAS below 2.0x is generally unprofitable after factoring COGS and shipping.\n"
            "- E-Commerce website conversion rates average 1.5% to 3.0% (Electronics: 1.2-2.0%, Fashion: 2.0-3.5%, Beauty: 2.5-4.0%).\n"
            "- Customer Acquisition Cost (CAC) should remain below 25-30% of Customer Lifetime Value (LTV).\n"
            "- Cart abandonment rate across Indian platforms averages 68% to 75%."
        ),
        "source": "India E-Commerce Industry Benchmark Report 2025-2026",
        "url": "https://insightdi.internal/benchmarks/ecommerce-kpis",
    },
    {
        "id": "logistics_rto_cod",
        "category": "logistics_supply_chain",
        "title": "Return-to-Origin (RTO) & COD Logistics Management in India",
        "keywords": ["rto", "return rate", "cod", "cash on delivery", "returns", "ndr", "courier", "shipping", "delhivery", "shiprocket"],
        "content": (
            "Indian Logistics & RTO Standards:\n"
            "- Cash on Delivery (COD) orders experience 20% to 35% RTO (Return to Origin) compared to 5% to 10% for prepaid orders.\n"
            "- Average forward courier shipping cost: INR 45-70 per 500g; Reverse shipping cost: INR 55-90 per 500g.\n"
            "- Recommended RTO mitigation strategies: Automated WhatsApp delivery address verification, IVR confirmation for COD orders over INR 1,000, 5% instant discount to convert COD to prepaid at checkout, and automated NDR (Non-Delivery Report) follow-ups within 2 hours of failed delivery attempt."
        ),
        "source": "Logistics & Supply Chain Handbook for Indian Sellers",
        "url": "https://insightdi.internal/logistics/rto-mitigation",
    },
    {
        "id": "marketplace_amazon_in",
        "category": "marketplace_policies",
        "title": "Amazon India Seller Fee Structure & Buy Box Dynamics",
        "keywords": ["amazon", "fba", "easy ship", "buy box", "referral fee", "closing fee", "amazon india", "seller central"],
        "content": (
            "Amazon India Marketplace Guidelines:\n"
            "- Seller fulfillment models: FBA (Fulfillment by Amazon - prime badge, automated storage/dispatch), Easy Ship (seller packs, Amazon picks and delivers), Self Ship.\n"
            "- Fee structure consists of: Referral Fee (typically 5% to 15% depending on category), Closing Fee (INR 5 to 50 based on item price), Weight Handling Fee, and Storage Fee.\n"
            "- Buy Box Win Factors: Competitive landed price (price + shipping), Prime eligibility (FBA/Easy Ship Prime), fast delivery promise (1-2 days), seller Order Defect Rate (ODR) below 1%, and Late Dispatch Rate under 4%."
        ),
        "source": "Amazon India Seller Fee Schedule & Performance Policies",
        "url": "https://sellercentral.amazon.in/help/fees",
    },
    {
        "id": "marketplace_flipkart",
        "category": "marketplace_policies",
        "title": "Flipkart Seller Tiers & Commission Framework",
        "keywords": ["flipkart", "fbf", "flipkart fulfilled", "seller tier", "commission", "smart fulfillment"],
        "content": (
            "Flipkart Marketplace Operational Guidelines:\n"
            "- Seller Tiers: Bronze, Silver, Gold, and Platinum. Higher tiers receive lower marketplace commission rebates, faster payment cycles (7 days vs 15 days), and dedicated account managers.\n"
            "- Fulfillment modes: FBF (Flipkart Fulfilled), Smart Fulfillment, and Standard Seller Fulfillment.\n"
            "- Commission rates vary from 4% to 18% based on sub-category; collection fee: 2% on prepaid, flat fee on COD; fixed fee: INR 5 to 45 depending on order value slab."
        ),
        "source": "Flipkart Seller Hub Fee & Policy Directory",
        "url": "https://seller.flipkart.com/fees-policy",
    },
    {
        "id": "gst_tax_compliance",
        "category": "taxation_compliance",
        "title": "Indian GST & E-Commerce Compliance (TCS, E-Way Bill)",
        "keywords": ["gst", "tax", "tcs", "section 52", "e-way bill", "invoice", "compliance", "government", "hsn"],
        "content": (
            "Tax Compliance for Indian E-Commerce Sellers:\n"
            "- Mandatory GST registration: All online sellers selling via e-commerce marketplaces must have GSTIN, regardless of the INR 40 Lakh threshold.\n"
            "- TCS (Tax Collected at Source): Under Section 52 of the CGST Act, marketplaces deduct 1% TCS (0.5% CGST + 0.5% SGST or 1% IGST) on net taxable supplies.\n"
            "- Standard GST rates: Apparel (< INR 1,000 at 5%, > INR 1,000 at 12%), Electronics (18%), FMCG/Food (5-18%).\n"
            "- E-Way Bill requirement: Mandatory for all inter-state goods shipments where consignment invoice value exceeds INR 50,000."
        ),
        "source": "Central Board of Indirect Taxes and Customs (CBIC) - E-Commerce Guidelines",
        "url": "https://cbic.gov.in/gst-ecommerce",
    },
    {
        "id": "ondc_open_network",
        "category": "market_ecosystems",
        "title": "ONDC (Open Network for Digital Commerce) Fundamentals",
        "keywords": ["ondc", "open network", "buyer app", "seller app", "protocol", "beckn", "marketplace alternate"],
        "content": (
            "ONDC Architecture & Seller Opportunities:\n"
            "- ONDC is a government-backed open protocol (based on Beckn) unbundling the e-commerce supply chain into Buyer Apps (Paytm, Magicpin, Pincode) and Seller Apps (eSamudaay, Mystore, GrowthFalcons).\n"
            "- Lower commissions: Total take-rates on ONDC are typically 5% to 10% vs 20% to 30% on traditional walled-garden platforms.\n"
            "- Sellers retain direct customer data and ownership of catalog, with interoperable delivery partners (Dunzo, Shadowfax, Delhivery)."
        ),
        "source": "ONDC Official Strategy & Protocol Whitepaper",
        "url": "https://ondc.org/resources",
    },
    {
        "id": "festive_season_strategy",
        "category": "marketing_strategy",
        "title": "Indian Festive Season Sales Playbook (BBD, Great Indian Festival)",
        "keywords": ["festive", "diwali", "big billion days", "bbd", "great indian festival", "sale season", "october sale", "seasonality"],
        "content": (
            "Festive E-Commerce Playbook:\n"
            "- October-November festive period (Diwali, Dussehra) accounts for 35% to 45% of annual GMV for Indian sellers.\n"
            "- Inventory rule: Maintain at least 45 to 60 days of safety stock for top 20% Pareto SKUs by September 15 to prevent stockouts.\n"
            "- Ad spend strategy: Scale ad budgets 2.5x to 4.0x starting 7 days before sale launch to build retargeting audiences and wishlists; switch to conversion bidding during peak 4 sale days.\n"
            "- Bundling: Multi-packs and accessory bundles increase Average Order Value (AOV) by 22-28% during festive events."
        ),
        "source": "E-Commerce Festive Peak Performance Playbook",
        "url": "https://insightdi.internal/playbooks/festive-sales",
    },
    {
        "id": "inventory_safety_stock",
        "category": "operations_inventory",
        "title": "Inventory Reorder Point (ROP) & Safety Stock Formulas",
        "keywords": ["reorder point", "rop", "safety stock", "lead time", "stockout", "eoq", "inventory management"],
        "content": (
            "Operational Inventory Formulas:\n"
            "- Reorder Point (ROP) = (Average Daily Sales × Supplier Lead Time in Days) + Safety Stock.\n"
            "- Safety Stock formula = Z-score (95% service level = 1.65) × Standard Deviation of Daily Demand × sqrt(Lead Time).\n"
            "- Stockout Cost: Every stockout day lowers Amazon/Flipkart algorithmic organic search ranking by an average of 15-25 positions, taking up to 14 days of sustained advertising to recover once restocked."
        ),
        "source": "Principles of Supply Chain & Inventory Operations for SMEs",
        "url": "https://insightdi.internal/operations/inventory-formulas",
    },
]


class ExternalKnowledgeService:
    """
    RAG & Knowledge Retrieval Engine for general business, e-commerce industry,
    tax compliance, marketplace rules, and web inquiries.
    """

    @staticmethod
    def retrieve_domain_knowledge(query: str, top_k: int = 2) -> List[Dict[str, Any]]:
        """
        Search the curated domain RAG knowledge base using BM25-style term frequency
        and keyword intersection.
        """
        q_tokens = set(re.findall(r"\w+", query.lower()))
        scored_docs = []

        for doc in KNOWLEDGE_DOCUMENTS:
            doc_tokens = set(re.findall(r"\w+", doc["content"].lower())) | set(re.findall(r"\w+", doc["title"].lower()))
            keyword_tokens = set(doc["keywords"])

            # Match score
            exact_kw_matches = sum(1 for kw in doc["keywords"] if kw in query.lower())
            token_overlap = len(q_tokens.intersection(doc_tokens))
            score = (exact_kw_matches * 5.0) + (token_overlap * 1.0)

            if score > 0:
                scored_docs.append((score, doc))

        # Sort by score descending
        scored_docs.sort(key=lambda x: x[0], reverse=True)

        results = []
        for score, doc in scored_docs[:top_k]:
            results.append({
                "title": doc["title"],
                "content": doc["content"],
                "category": doc["category"],
                "source": doc["source"],
                "url": doc["url"],
                "relevance_score": score,
            })
        return results

    @staticmethod
    async def search_web_knowledge(query: str, max_results: int = 2) -> List[Dict[str, Any]]:
        """
        Lightweight external web knowledge retrieval using DuckDuckGo instant answer / search.
        Falls back smoothly if offline or unavailable.
        """
        clean_q = re.sub(r"[^\w\s]", "", query).strip()
        if not clean_q:
            return []

        try:
            url = "https://api.duckduckgo.com/"
            params = {
                "q": clean_q,
                "format": "json",
                "no_html": "1",
                "skip_disambig": "1",
            }
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.get(url, params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    abstract = data.get("AbstractText", "")
                    heading = data.get("Heading", "External Web Result")
                    source_url = data.get("AbstractURL", "https://duckduckgo.com")

                    if abstract:
                        return [{
                            "title": heading,
                            "content": abstract,
                            "category": "web_search",
                            "source": f"Web Knowledge via DuckDuckGo ({data.get('AbstractSource', 'Web')})",
                            "url": source_url,
                            "relevance_score": 10.0,
                        }]
        except Exception as e:
            logger.debug(f"Web knowledge search skipped: {e}")

        return []

    @staticmethod
    async def get_external_knowledge(query: str, top_k: int = 2) -> List[Dict[str, Any]]:
        """
        Unified retrieval combining curated E-Commerce RAG and Web retrieval.
        Always prioritizes reliable e-commerce domain knowledge.
        """
        domain_items = ExternalKnowledgeService.retrieve_domain_knowledge(query, top_k=top_k)
        
        # If domain items have strong relevance, return them immediately
        if domain_items and domain_items[0]["relevance_score"] >= 4.0:
            return domain_items

        # Otherwise, attempt web search supplement
        web_items = await ExternalKnowledgeService.search_web_knowledge(query, max_results=1)
        if web_items:
            return web_items + domain_items[:1]

        return domain_items[:top_k]
