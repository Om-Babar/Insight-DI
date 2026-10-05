# InsightDI — Backend-First Implementation Plan (with Dedicated Lovable Frontend Phase)

> **Architectural Strategy:** 
> 1. **Backend First:** Fully build, test, and document all backend services, database schemas, data processing pipelines, ML/forecasting models, scrapers, and decision engines as rock-solid FastAPI REST APIs with complete OpenAPI/Swagger specifications.
> 2. **Dedicated Frontend Phase via Lovable:** Use Lovable to generate and craft a state-of-the-art, high-converting, modern React + Tailwind CSS dashboard that directly consumes the finalized FastAPI backend contracts.
> 3. **Dual Role for Synthetic Dataset:** Serves as the primary training and development backbone, and later as a demo input via the Data Source ingestion pipeline to prove the platform is truly dataset-agnostic.

---

```
                       BACKEND FIRST (Phases 1 to 9)
┌────────────────────────────────────────────────────────────────────────┐
│  Phase 1: Foundation (FastAPI + PostgreSQL Unified Schema + Auth)      │
│  Phase 2: Synthetic Dataset Ingestion & Entity Services                │
│  Phase 3: Data Source Engine (Auto-Detect, Map, Validate, Clean)       │
│  Phase 4: Business Analytics & KPI Engine                              │
│  Phase 5: ML Models, Customer Segmentation & Time-Series Forecast      │
│  Phase 6: Competitive Intelligence & Live Scrapers (Amazon / Flipkart) │
│  Phase 7: Root Cause Analysis (RCA) & Explainable AI (SHAP)            │
│  Phase 8: Prescriptive Recommendations & What-If Simulation Engine     │
│  Phase 9: LLM Orchestration (Gemini/OpenAI), Chatbot & Report Gen      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (Complete OpenAPI / Swagger Contract)
                                    ▼
       SPECIAL DEDICATED FRONTEND PHASE VIA LOVABLE (Phase 10)
┌────────────────────────────────────────────────────────────────────────┐
│  Phase 10: Complete UI/UX & Dashboard Development via Lovable          │
│   • Data Source Ingestion Center (Upload, Auto-Mapping, Quality Score) │
│   • Core Business Intelligence & Recharts Visual Dashboards            │
│   • Forecasting & K-Means Cohort Explorer                              │
│   • Live Competitor Benchmark & Price Gap Monitor                      │
│   • Interactive RCA & SHAP Feature Contribution Visualizer             │
│   • Prescriptive Action Center & What-If Scenario Sandbox              │
│   • AI Business Copilot Chatbot & PDF/CSV Report Generation Center     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
       INTEGRATION, MULTI-DATASET DEMO & DEPLOYMENT (Phase 11)
┌────────────────────────────────────────────────────────────────────────┐
│  Phase 11: End-to-End System Testing, Dual-Dataset Demo & Docker/AWS   │
└────────────────────────────────────────────────────────────────────────┘
```

---

# SECTION A: BACKEND & AI ENGINES (PHASES 1 – 9)

---

## Phase 1 — Project Foundation & Backend Scaffolding

Set up the backend structure, database, and security layer.

### 1.1 Python & FastAPI Project Initialization
- Create clean directory structure:
  - `app/` → `main.py`, `config.py`, `dependencies.py`
  - `app/api/v1/` → modular routers (`auth`, `datasources`, `analytics`, `forecast`, `competitors`, `rca`, `simulation`, `recommendations`, `chatbot`, `reports`)
  - `app/models/` → SQLAlchemy 2.0 / SQLModel ORM models
  - `app/schemas/` → Pydantic v2 validation models
  - `app/services/` → pure business logic and analytical services
  - `app/core/` → security (`jwt.py`), middleware (`cors.py`), custom exception handlers
  - `tests/` → Pytest unit and integration test suite
- Setup JWT authentication (seller registration, login, token refresh, dependency injection for protected endpoints).
- Configure CORS for cross-origin requests with the upcoming Lovable frontend.
- Standardized API response format and global exception handling.
- Root and health endpoints: `GET /` and `GET /api/v1/health`.

### 1.2 Unified Business Schema (PostgreSQL)
Design and build the canonical PostgreSQL schema that serves as the single source of truth:
- **Core Entities:**
  - `users` (id, email, hashed_password, company_name, created_at)
  - `customers` (customer_id, city, state, tier, age_group, gender, loyalty_tier, preferred_payment)
  - `products` (product_id, category, sub_category, cost_price, selling_price, reorder_level, current_stock, rating)
  - `orders` (order_id, customer_id, order_date, channel, payment_method, total_amount, discount_amount, refund_amount, return_date, order_status)
  - `order_items` (item_id, order_id, product_id, quantity, unit_price, cost_price, discount_pct, final_price)
  - `inventory` (inventory_id, product_id, date, opening_stock, restock_units, units_sold, closing_stock, stockout_flag)
  - `promotions` (promo_id, promo_name, start_date, end_date, discount_pct, applicable_category)
  - `marketing` (marketing_id, date, channel, spend, impressions, clicks, conversions)
  - `competitors` (observation_id, product_id, competitor_name, competitor_url, competitor_price, discount_pct, rating, review_count, stock_status, observation_date)
- **System & Engine Tables:**
  - `upload_metadata` (upload_id, filename, file_type, detected_type, status, row_count, column_count, upload_date)
  - `schema_mappings` (mapping_id, upload_id, user_column, canonical_column, confidence)
  - `kpi_cache` (kpi_key, period, value, metadata, calculated_at)
  - `forecast_results` (forecast_id, model_name, target_metric, forecast_date, predicted_value, lower_bound, upper_bound)
  - `rca_results` (rca_id, kpi_name, period, change_pct, primary_cause, contributing_factors)
  - `recommendations` (rec_id, category, priority, recommendation_text, rationale, expected_impact, confidence_score)
  - `simulation_history` (sim_id, input_parameters, baseline_metrics, simulated_metrics, created_at)
- Alembic configuration with initial migration files.

### ✅ Done when
- FastAPI runs on `http://localhost:8000`.
- Swagger UI (`/docs`) exposes auth and health endpoints.
- PostgreSQL tables are verified and successfully migrated via Alembic.

---

## Phase 2 — Synthetic Dataset Ingestion & Entity Services

Populate PostgreSQL with the rich 1-year synthetic dataset so all downstream analytics and ML development have real data immediately.

### 2.1 Bulk Ingestion Script
- Create `scripts/seed_database.py` using Pandas to bulk-insert `Dataset/output/final/*.csv`.
- Enforce strict foreign key loading order:
  `promotions` → `customers` → `products` → `orders` → `order_items` → `inventory` → `marketing` → `competitors`.
- Add integrity validation step verifying row counts match:
  - 5,000 customers, 500 products, 100,000 orders, 159,770 order items, 183,000 inventory records, 1,830 marketing records, 124,500 competitor observations.

### 2.2 Base Entity Data Services & APIs
- Implement repository services and REST endpoints (`GET /api/v1/entities/...`):
  - Paginated list & filter endpoints for orders, products, inventory, customers, competitors.
  - Quick summary endpoint `GET /api/v1/overview/summary` returning total revenue, total orders, active products, and low stock count.

### ✅ Done when
- Database contains the complete, validated synthetic dataset.
- Entity endpoints return paginated JSON data with response times < 100ms.

---

## Phase 3 — Data Source Module (Automated Ingestion Pipeline)

Build the engine that enables SMEs to upload heterogeneous, arbitrarily formatted business files.

### 3.1 Upload & File Profiling Service
- Endpoint: `POST /api/v1/datasources/upload`
- Accepts `.csv`, `.xlsx`, `.xls`, `.json`.
- Automatic inspection: MIME type, file size, encoding, sheet discovery, row/column counts, detected data types, and first 5 sample rows.
- Saves raw file to secure storage and creates record in `upload_metadata`.

### 3.2 Automatic Dataset Type Classifier
- Heuristic + signature engine comparing column sets against canonical signatures:
  - `SALES / ORDERS`: order_id, customer_id, order_date, total_amount, etc.
  - `INVENTORY`: product_id, stock_quantity, opening_stock, closing_stock, reorder_level.
  - `PRODUCTS`: product_id, sku, title, cost_price, selling_price, category.
  - `CUSTOMERS`: customer_id, email, phone, city, state, signup_date.
  - `MARKETING`: ad_spend, impressions, clicks, campaign_name, conversions.
  - `COMPETITORS`: competitor_name, price, competitor_url, rating.
- Returns detected type with confidence score (0.0 to 1.0).

### 3.3 Semantic Column Mapper
- Maps user column aliases to the canonical schema:
  - Exact normalization (e.g., `Cust ID` → `customer_id`).
  - E-commerce synonym lexicon (e.g., `date_joined`, `registered_at`, `signup_time` → `registration_date`).
  - Levenshtein / fuzzy string distance matching for ambiguous columns.
- Endpoint: `GET /api/v1/datasources/{upload_id}/mapping` allowing preview and manual overrides via `PUT /api/v1/datasources/{upload_id}/mapping`.

### 3.4 Multi-Level Data Validation & Quality Scorecard
- Validates data against structural, quality, and relational gates:
  - Missing value counts & rates.
  - Duplicate detection.
  - Value domain violations (e.g., negative prices, negative stock, invalid date sequences).
  - Broken foreign keys against existing database tables.
- Endpoint: `GET /api/v1/datasources/{upload_id}/quality-report` returning:
  - Quality score (0–100%).
  - Detected anomalies and severity tags.
  - Suggested auto-remediation actions (impute median, drop duplicates, standardize date format).

### 3.5 Automated Cleaning, Transformation & Canonical Store
- Endpoint: `POST /api/v1/datasources/{upload_id}/process`
- Applies approved remediation operations via Pandas.
- Ingests cleaned data directly into the canonical PostgreSQL tables.

### ✅ Done when
- An unformatted customer or sales CSV with messy headers is uploaded, auto-classified, mapped, validated with a quality score, cleaned, and ingested into PostgreSQL without manual DB schema alterations.

---

## Phase 4 — Business Analytics Engine

Build the quantitative engine answering **"What happened?"**

### 4.1 Analytical Services
- **Sales Analytics:** Daily/weekly/monthly revenue, orders count, AOV (Average Order Value), discount rate impact, return rate trends.
- **Product Performance:** Top 10 revenue-generating SKUs, bottom 10 slow movers, category-wise profit margins, stock-to-sales ratios.
- **Customer Metrics:** RFM distributions, new vs returning customer split, geographic concentration by state/city tier.
- **Inventory & Stockout Metrics:** Stockout event frequency, inventory turnover ratio, reorder urgency ranking.
- **Marketing & Ad Spend Analytics:** Blended ROAS, CAC (Customer Acquisition Cost), conversion rates by ad channel, promo lift analysis.

### 4.2 Analytical Endpoints
- `GET /api/v1/analytics/sales/trends`
- `GET /api/v1/analytics/products/performance`
- `GET /api/v1/analytics/customers/demographics`
- `GET /api/v1/analytics/inventory/status`
- `GET /api/v1/analytics/marketing/campaigns`
- `GET /api/v1/analytics/kpis/overview`

### ✅ Done when
- All endpoints return pre-calculated, aggregated time-series and categorical metrics with millisecond latency.

---

## Phase 5 — Machine Learning, Segmentation & Time-Series Forecasting

Build the predictive engine answering **"What may happen next?"**

### 5.1 Customer Segmentation Service (K-Means)
- Feature pipeline: Recency (days since last purchase), Frequency (order count), Monetary (total spent), and Average Order Value.
- Standard scaler + K-Means clustering ($k=4$).
- Exposes cluster personas (e.g., "High-Value Loyalists", "Occasional Bargain Hunters", "At-Risk Inactive").
- Endpoint: `GET /api/v1/forecast/segmentation`.

### 5.2 Demand & Revenue Forecasting (XGBoost & Random Forest)
- Features: Day of week, day of month, Indian festival calendar flags, lagged 7-day/14-day sales, rolling average, competitor price delta, ad spend.
- Train and persist models using joblib.
- Evaluate R², MAE, and RMSE against a 74-day holdout set.
- Endpoint: `POST /api/v1/forecast/revenue` (accepts projection horizon 7–90 days).

### 5.3 Classical Time-Series Forecasting (ARIMA & LSTM)
- Stationarity testing (ADF test) and auto-ARIMA parameter fitting.
- Deep sequential model (LSTM with PyTorch/TensorFlow) for sequential trend comparison.
- Comparative evaluation endpoint returning model benchmark comparisons (ARIMA vs LSTM vs XGBoost).
- Endpoint: `GET /api/v1/forecast/timeseries`.

### ✅ Done when
- Trained models produce realistic multi-day forecasts and customer segments stored in PostgreSQL.

---

## Phase 6 — Competitive Intelligence & Live Scraping Module

Collect and analyze live external market signals from Amazon and Flipkart.

### 6.1 Live Amazon Scraper
- Modular collector fetching runtime data: product title, brand, price, discount, rating, review count, stock availability, product URL, and timestamp.
- Proper request headers, session management, and rate-limiting/backoff.

### 6.2 Live Flipkart Scraper
- Modular collector tailored to Flipkart DOM layout extracting equivalent competitor attributes.

### 6.3 Competitor Matching Engine
- Match internal catalog products to scraped competitor items via SKU/barcode or fuzzy text matching on product title, brand, and category.
- Assigns match confidence score (0–100%).

### 6.4 Competitive Analytics & Benchmarking API
- Compares seller's internal prices against Amazon/Flipkart benchmarks.
- Calculates:
  - Price disparity percentage (`(our_price - competitor_price) / competitor_price`).
  - Discount competitiveness.
  - Rating vs Price quadrant analysis.
- Endpoints:
  - `POST /api/v1/competitors/scrape` (trigger live scrape for given SKUs or keywords).
  - `GET /api/v1/competitors/benchmark` (get live price comparison matrix).
  - `GET /api/v1/competitors/trends` (historical competitor price movement).

### ✅ Done when
- Scrapers collect live competitor pricing for target categories/products and return structured comparisons without mock/hardcoded values.

---

## Phase 7 — Root Cause Analysis (RCA) & Explainable AI (SHAP)

Build the diagnostic and interpretability engine answering **"Why did it happen?"**

### 7.1 Algorithmic Root Cause Analysis Engine
- Automated anomaly detection identifying sharp drops or spikes in sales/revenue.
- Multi-factor attribution evaluation:
  - Stockout correlation (did closing stock hit 0?).
  - Competitor price undercut (did Amazon/Flipkart drop prices or increase discounts?).
  - Ad spend cut (did marketing spend reduce on key channels?).
  - Seasonal drop (is it a post-festival lull?).
- Calculates percentage contribution of each factor.
- Endpoint: `GET /api/v1/rca/diagnose?kpi=revenue&start_date=...&end_date=...`

### 7.2 Explainable AI Service (SHAP)
- Integrates TreeSHAP with the trained XGBoost model.
- Calculates global feature importances (which variables influence sales most).
- Calculates local instance explanations (why was a specific day's forecast high or low).
- Endpoint: `GET /api/v1/rca/shap-values`.

### ✅ Done when
- Calling `/api/v1/rca/diagnose` during a simulated sales drop correctly attributes causality (e.g., 60% competitor undercut, 30% stockout, 10% ad spend pause).
- SHAP values return exact feature attribution weights.

---

## Phase 8 — Prescriptive Recommendation & What-If Simulation Engine

Build the prescriptive engine answering **"What should I do?"** and **"What if I change a decision?"**

### 8.1 Prescriptive Recommendation Engine
- Synthesizes findings from Analytics, Competitor Intel, RCA, and Predictions.
- Generates prioritized, evidence-backed action items:
  - Category: Pricing, Inventory, Marketing, or Promotional.
  - Specific action (e.g., *"Reduce SKU-104 price by ₹45 to regain market share from Amazon competitor"*).
  - Quantified rationale and expected financial impact.
  - Confidence rating (High / Medium / Low).
- Endpoint: `GET /api/v1/recommendations`.

### 8.2 What-If Simulation Engine
- Interactive scenario testing:
  - Input parameters: `delta_ad_spend_pct`, `delta_price_pct`, `delta_discount_pct`, `restock_units`.
  - Simulates demand shifts using trained elasticity formulas and ML models.
  - Compares Baseline vs. Simulated:
    - Projected Orders, Projected Revenue, Projected Gross Profit, Stockout Probability.
- Endpoint: `POST /api/v1/simulation/simulate`.

### ✅ Done when
- Simulation endpoint computes updated financial metrics based on altered marketing and pricing inputs.
- Recommendations return actionable, structured suggestions with data proof.

---

## Phase 9 — LLM Integration, Conversational Chatbot & Automated Reports

Build the natural-language decision support layer.

### 9.1 Unified LLM Adapter (Gemini & OpenAI)
- Modular provider interface with fallback support between Google Gemini and OpenAI.
- Grounding constraint: The LLM is provided structured JSON outputs from Analytics, RCA, and Recommendations — it does not hallucinate raw mathematical calculations.

### 9.2 Intent-Routed AI Business Chatbot
- Chatbot endpoint: `POST /api/v1/chatbot/query`
- Intent classification:
  - Sales Inquiry → calls Analytics Engine.
  - Diagnostic / "Why" Query → calls RCA Engine.
  - Forecast Query → calls Forecasting Engine.
  - Simulation Query → calls Simulation Engine.
  - Strategic Advice → calls Recommendation Engine.
- Formats synthesized facts into crisp, executive-ready SME advisory responses.

### 9.3 Automated Business Report Generator
- Endpoint: `POST /api/v1/reports/generate` (Format: PDF / CSV / JSON)
- Compiles executive summary, KPI highlights, competitor overview, forecasting outlook, and recommended action roadmap into professional downloadable PDF reports.

### ✅ Done when
- Chatbot accurately answers complex questions like *"Why did revenue drop last week?"* by pulling real RCA engine outputs.
- Professional PDF report downloads cleanly with charts and data tables.

---

# SECTION B: DEDICATED FRONTEND PHASE VIA LOVABLE (PHASE 10)

---

## Phase 10 — Complete UI/UX & Dashboard Development via Lovable

Use **Lovable** to generate, iterate, and polish a world-class, responsive, aesthetic web application connected directly to the FastAPI OpenAPI schema.

### 10.1 Design System & Shell Architecture (Lovable Prompts & Scaffolding)
- **Visual Design:** Dark/light mode theme, clean glassmorphic touches, modern typography (Inter/Outfit), micro-animations, semantic color status badges (success green, warning amber, critical red).
- **Core Navigation:** Collapsible sidebar, header with active user profile, notification center for stockouts and competitor alerts, and breadcrumb trails.
- **Client Architecture:** Axios/React Query data fetching layer with TypeScript types auto-generated from FastAPI's `/openapi.json`.

### 10.2 Data Source Ingestion Center UI
- Drag-and-drop file upload zone supporting CSV, Excel, and JSON.
- Real-time file profiling modal (sheet selector, row count, detected data types).
- **Interactive Schema Mapping Table:**
  - Visual side-by-side mapping (User Column → Canonical InsightDI Column).
  - Confidence pills (e.g., "98% Match").
  - Dropdown selector to manually re-map columns.
- **Data Quality Report Card:**
  - Health gauge score (e.g., 94/100).
  - Detected issue cards with "Auto-Fix" buttons.
  - Final "Approve & Ingest into Warehouse" trigger.

### 10.3 Core Business Intelligence & Recharts Dashboards
- **Executive Overview:** Top metric hero cards (Revenue, Orders, Net Profit Margin, Active Stockouts) with percentage delta badges.
- **Sales Analytics View:** Interactive Recharts area chart for revenue over time, date-range picker, AOV breakdown.
- **Product Matrix:** Sortable, filterable data grid with thumbnail placeholders, margins, units sold, and return rates.
- **Customer & Inventory Views:** Demographics distribution charts, inventory health gauge, restock alerts list.

### 10.4 Predictive Analytics & Forecasting Hub
- Interactive forecast horizon slider (7, 14, 30, 60, 90 days).
- Historical actuals vs. model projected lines with confidence intervals (shaded upper/lower bounds).
- Customer segmentation 2D scatter plot visualizing K-Means clusters with persona cards.
- Model performance benchmark comparison cards (XGBoost vs ARIMA vs LSTM).

### 10.5 Live Competitive Intelligence Monitor
- Side-by-side competitor product comparison cards (Our Price vs Amazon vs Flipkart).
- Price disparity indicator bar charts (undercut / overcut percentages).
- Competitor stock status alerts (e.g., *"Competitor out of stock — Opportunity to capture demand"*).
- Instant live scrape trigger button with real-time status loader.

### 10.6 Interactive RCA & SHAP Visual Explanations
- Anomaly timeline highlighting detected revenue drops or return spikes.
- Diagnostic breakdown modal: Interactive waterfall / pie chart showing exact percentage attribution (Stockout 45%, Competitor Undercut 35%, Ad Spend 20%).
- SHAP feature importance horizontal bar chart with plain-language tooltips.

### 10.7 Prescriptive Action Center & What-If Sandbox
- **Action Feed:** Prioritized recommendation cards tagged by urgency (`HIGH PRIORITY`, `QUICK WIN`), with expandable evidence panels and "Implement" toggles.
- **What-If Simulation Sandbox:**
  - Interactive sliders for Ad Spend (+/- 50%), Selling Price (+/- 30%), Restock Units.
  - Real-time side-by-side comparison table (Baseline vs. Simulated outcome).
  - Risk assessment meter.

### 10.8 AI Business Copilot & Chatbot Drawer
- Persistent conversational drawer accessible from any screen.
- Pre-built quick prompt chips (*"Why did sales drop yesterday?"*, *"Which products should I restock?"*, *"Simulate 15% ad increase"*).
- Streaming chat response display with markdown rendering, tables, and clickable drill-down links.

### 10.9 Automated Reports & Export Center
- Instant preview of generated executive reports.
- One-click PDF download and CSV export buttons.

### ✅ Done when
- The entire Lovable-generated React application runs smoothly, looks stunning, and interacts seamlessly with all live FastAPI endpoints without mock data.

---

# SECTION C: INTEGRATION, DEMO & DEPLOYMENT (PHASE 11)

---

## Phase 11 — End-to-End System Testing, Dual-Dataset Demo & Deployment

Validate the unified platform, prove dataset independence, and prepare for production deployment.

### 11.1 Dual-Dataset Real-World Demonstration
- **Demo 1 (Real-world Arbitrary Upload):** Upload a brand new, unformatted e-commerce CSV through the Lovable Data Source UI. Watch it detect, map, clean, store, and dynamically populate the entire dashboard.
- **Demo 2 (Synthetic Benchmark Dataset):** Run the complete 1-year synthetic dataset through the same Data Source pipeline to prove the platform is truly generic and not hardcoded.

### 11.2 End-to-End Automated Testing
- Pytest suite covering all API endpoints, mapping logic, and ML inference.
- Frontend smoke tests verifying all Lovable views load without console errors.

### 11.3 Containerization & Production Deployment
- Multi-stage `Dockerfile` for FastAPI backend (Python 3.11 slim).
- Multi-stage `Dockerfile` for React frontend (Nginx alpine).
- `docker-compose.yml` linking:
  - `insightdi-postgres`
  - `insightdi-backend`
  - `insightdi-frontend`
- Deployment guidelines for AWS EC2 / RDS.

### ✅ Done when
- Complete platform boots with `docker compose up --build`.
- Both demo workflows succeed end-to-end.
- Production-ready handover complete.
