# InsightDI Project Understanding

## 1. Project Overview
**InsightDI** is an AI-powered Decision Intelligence platform designed to help E-commerce SMEs translate complex, fragmented data into actionable business decisions. It moves beyond traditional descriptive Business Intelligence ("What happened?") to answer deeper questions like "Why did it happen?", "What may happen next?", "What should I do?", and "What happens if I change a decision?".

## 2. Core Technology Stack & Architecture
- **Frontend:** React.js, Tailwind CSS, Recharts (for building the interactive web dashboard).
- **Backend:** Python, FastAPI, Pandas (for REST API, data processing pipelines, and integrations).
- **Database:** PostgreSQL serves as the strict, single source of truth
- **LLM Layer:** Google Gemini API / OpenAI API (handles natural language explanations, chatbot interfaces, business narratives, and reporting, not core analytical math).

## 3. Key AI & Analytical Modules
- **Business Analytics:** Descriptive analytics for sales, inventory, marketing, and customer performance.
- **Customer Segmentation:** K-Means clustering to identify behavioral personas.
- **Competitive Intelligence:** Actively tracks competitor pricing, discounts, and market positioning as a core component.
- **Root Cause Analysis (RCA):** Fact-based drill-downs to determine factors (like ad-spend, seasonality, or stockouts) affecting KPIs.
- **Predictive Analytics:** Forecasting sales and demand using models like XGBoost, Random Forest, ARIMA, and LSTM.
- **Explainable AI (XAI):** Utilizing SHAP to explain *why* the ML models produced their specific predictions.
- **AI Recommendation Engine:** Suggesting concrete business actions backed by data evidence.
- **Decision Simulation (What-If):** Allowing users to safely simulate hypothetical scenarios (e.g., increasing marketing budget) to estimate potential outcomes and risks.

## 4. Output Interfaces
- **AI Business Chatbot:** For interactive, natural language queries about the business state and hypothetical scenarios.
- **AI Business Reports:** Automated synthesis of summaries, KPIs, RCA, and recommendations.
- **InsightDI Dashboard:** Unified UI mapping all insights, models, and predictions to a single control center.

## 5. The Synthetic Dataset
To drive InsightDI's models, a highly realistic, relationally consistent synthetic dataset was generated, simulating one full year (2024) of an Indian e-commerce SME.
- **Data Scale:** 5,000 customers, 500 products, 100,000 orders across 8 normalized tables (`customers`, `products`, `orders`, `order_items`, `inventory`, `promotions`, `marketing`, `competitors`).
- **Generation Logic:** Avoids pure randomness in favor of microeconomic principles (price elasticity), realistic Indian festival surges, explicit marketing funnel attribution, and strict physical inventory conservation.
- **Validation:** Passes rigorous checks including referential integrity across 754,000+ foreign keys and zero violations of hard business rules (e.g., no negative stock, accurate financial accounting).
- **Demonstrated Utility:** Benchmarked successfully with models like XGBoost and K-Means, proving it can effectively support InsightDI's forecasting, RCA, and simulation modules.
