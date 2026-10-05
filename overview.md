# InsightDI — Complete Project Overview

## 1. Final Project Name

> **InsightDI: AI-Powered Decision Intelligence Platform for Small and Medium Enterprises (SME’s)**

The project is focused specifically on **E-commerce SMEs**.

### Domain
**E-commerce / E-Business / Business Analytics**

---

# 2. Core Idea

InsightDI is an **AI-powered Decision Intelligence platform** designed to help E-commerce SMEs convert their business data into actionable decisions.

The central problem is that businesses generate data from:

- Sales
- Customers
- Products
- Inventory
- Marketing
- Pricing
- Promotions
- Competitive/market information

but data is often fragmented, and traditional BI mainly presents dashboards and reports.

InsightDI aims to move from:

> **What happened?**

towards:

> **Why did it happen?**  
> **What may happen next?**  
> **What action should be considered?**  
> **What could happen if we change a decision?**

Your original proposal also establishes the same overall direction around unified data, competitive intelligence, predictive analytics and explainable decision support. new_InsightDI_Project Proposal …

---

# 3. Main Business Problems Addressed

InsightDI focuses on these major problems:

### Fragmented Business Data
Business information may come from different files, APIs and sources.

### Limited Business Analytics
SMEs may have data but struggle to convert it into meaningful insights.

### Descriptive-Only Analysis
Traditional BI often shows historical performance but leaves interpretation and action to the user.

### Difficulty Finding Root Causes
A KPI may decline, but the business owner still needs to know why.

### Uncertainty About Future Outcomes
Historical data alone does not tell the seller what is likely to happen next.

### Generic Recommendations
Businesses need recommendations grounded in their actual data and business context.

### Risk in Decision Making
A business owner may want to test a decision before implementing it.

### Competition
Pricing, discounts, ratings and availability of competing products can influence business performance.

---

# 4. Core InsightDI Workflow

The central workflow is:

> **Acquire → Ingest → Validate → Process → Store → Analyze → Diagnose → Predict → Explain → Recommend → Simulate → Communicate → Support Decision**

In simplified form:

```text
Business Data
      ↓
Data Acquisition
      ↓
Data Ingestion
      ↓
Validation & Processing
      ↓
PostgreSQL
      ↓
Business Analytics
      ↓
Competitive Intelligence / RCA
      ↓
Predictive Analytics
      ↓
SHAP / XAI
      ↓
Recommendations / What-if Simulation
      ↓
Gemini / OpenAI
      ↓
Decision Support
      ↓
Dashboard / Chatbot / Reports
```

---

# 5. Data Acquisition

InsightDI can work with:

### File Inputs
- CSV
- Excel
- JSON

### Other Inputs
- Manual business inputs
- APIs
- External market information

### E-commerce Data Acquisition
You are planning to extend the system with an:

> **E-commerce Data Acquisition / Connector Module**

Potential sources discussed:

- Amazon
- Flipkart
- Other permitted e-commerce sources

The architecture should use terms such as:

> **E-commerce Data Acquisition**  
> **E-commerce Data Connector**

rather than presenting unrestricted scraping as a guaranteed implementation.

---

# 6. Data Ingestion & Validation

This is a necessary module because multiple types of data need to enter a common processing pipeline.

### Main functions

- File Upload
- Data Connector
- Format Validation
- Schema Validation
- Data Ingestion

Recommended name:

> **Data Ingestion & Validation**

We deliberately simplified this rather than creating a huge sub-system.

---

# 7. Data Processing

### Main technology

> **Pandas**

The processing pipeline includes:

- Data Cleaning
- Missing Value Handling
- Duplicate Detection
- Data Type Validation
- Outlier Detection
- Data Transformation
- Feature Engineering
- Dataset Validation

Flow:

```text
Raw Data
 ↓
Validation
 ↓
Cleaning
 ↓
Missing Values
 ↓
Duplicate Detection
 ↓
Outlier Detection
 ↓
Transformation
 ↓
Feature Engineering
 ↓
Validated / Processed Data
```

---

# 8. Database

## Final decision: PostgreSQL ONLY

MongoDB has been completely removed from the current architecture.

PostgreSQL is the:

> **single source of truth**

for the system.

It can store:

- Users
- Products
- Customers
- Orders
- Sales
- Inventory
- Marketing Data
- Pricing
- Promotions
- Uploaded Data Metadata
- Processed Business Data
- KPI Results
- Forecast Results
- Root Cause Results
- Recommendations
- Decision Simulation Results
- Chatbot Data
- AI-generated Reports

The submitted proposal still shows MongoDB Atlas, which is an outdated state relative to your current design. new_InsightDI_Project Proposal …

---

# 9. Business Analytics

Business Analytics answers:

> **What is happening?**

Main analytical areas:

### Sales Analytics
- Revenue
- Orders
- Growth
- Product performance

### Customer Analytics
- Customer behaviour
- Purchase patterns
- Segmentation

### Inventory Analytics
- Stock levels
- Stock-outs
- Inventory performance
- Slow-moving products

### Marketing Analytics
- Advertising spend
- Campaign performance
- Conversion
- ROAS where data supports it

### Product Analytics
- Product performance
- Demand trends

### KPI / Performance Analysis
- KPI computation
- Trend analysis
- Performance metrics

---

# 10. Customer Segmentation

### Technique

> **K-Means Clustering**

Used to group customers based on similar behaviour.

Example:

```text
Customers
   ↓
K-Means
   ↓
Customer Groups
```

This is part of the Business Analytics capability.

---

# 11. Competitive Intelligence

This is a **core feature**, not an optional side feature.

It analyzes external market information such as:

- Competitor pricing
- Discounts
- Ratings
- Product availability
- Relative market position
- Market movement
- Competitive metrics

It may also include:

- Product / competitor matching
- Competitive summary

The original proposal explicitly identifies competitive intelligence as one of the project's objectives and scope. new_InsightDI_Project Proposal … new_InsightDI_Project Proposal …

---

# 12. Root Cause Analysis

RCA answers:

> **Why did it happen?**

Planned logical stages:

1. Problem Identification
2. Factor Detection
3. Drill-down Analysis
4. Impact Quantification
5. Root Cause Summary

Example:

```text
Sales decreased
      ↓
RCA
      ↓
Possible contributing factors:
• Reduced advertising
• Stock availability
• Increased returns
• Pricing changes
• Seasonal effect
```

Important:

RCA should be based on **business/analytical evidence**, not arbitrary LLM-generated explanations.

---

# 13. Predictive Analytics

Predictive Analytics answers:

> **What may happen next?**

Main use cases:

- Sales forecasting
- Demand forecasting
- Business outcome prediction
- Relevant customer/business prediction

### Current model set

#### XGBoost
Used for predictive business tasks.

#### Random Forest
Used for classification/prediction tasks.

#### ARIMA
Used for time-series forecasting.

#### LSTM
Used for deep-learning-based time-series forecasting.

The models are **not assumed to all be used simultaneously**.

The final model choice should depend on:

- Dataset
- Problem
- Model performance
- Evaluation results

---

# 14. Explainable AI

### Selected technique

> **SHAP**

XAI answers:

> **Why did the model produce this result?**

Example:

```text
Prediction
   ↓
SHAP
   ↓
Feature Contributions
```

Potential explanation:

- Marketing spend influenced prediction negatively.
- Inventory availability influenced prediction negatively.
- Return rate influenced prediction negatively.

### Important distinction

**Machine Learning → Prediction**

**SHAP → Explanation**

**Gemini/OpenAI → Natural-language interpretation**

Never describe Gemini/OpenAI themselves as the XAI technique.

---

# 15. AI Recommendation Engine

The recommendation engine converts analytical findings into possible actions.

### Inputs

- Business Analytics
- Competitive Intelligence
- Root Cause Analysis
- Predictive Analytics
- Business context
- Simulation results
- Model evidence

### Internal flow

```text
Insight Extraction
       ↓
Recommendation Generation
       ↓
Action Prioritization
       ↓
Best Action Suggestion
       ↓
Expected Outcome
```

Example:

> Increase inventory for Product X.

The recommendation should be supported by actual business evidence such as demand, inventory, sales and competition.

---

# 16. Decision / What-If Simulation

A key InsightDI feature.

It lets the user test a hypothetical business decision.

Example:

> **What if advertising budget increases by 20%?**

Flow:

```text
Scenario Input
      ↓
Scenario Parameters
      ↓
Predictive / Simulation Model
      ↓
Estimated Outcomes
      ↓
Risk / Confidence
      ↓
Scenario Result
```

Possible outputs:

- Sales
- Revenue
- Profit
- Inventory impact
- Risk

Important:

These are **estimated model-based outcomes**, not guaranteed results.

---

# 17. LLM Layer

### Technologies

- **Google Gemini API**
- **OpenAI API**

Both are intended as interchangeable LLM providers.

### LLM responsibilities

- Natural-language business insights
- Business summaries
- Recommendation explanations
- Chatbot responses
- Business narratives
- Automated report generation

### LLM is NOT responsible for

- Core numerical calculations
- Core ML prediction
- Raw analytical computation

Correct architecture:

```text
Business Data
      ↓
Analytics / ML
      ↓
Validated Results
      ↓
XAI / Recommendations / Simulation
      ↓
Gemini / OpenAI
      ↓
Natural-language Output
```

---

# 18. AI Business Chatbot

The chatbot is intended to be a **business interface to InsightDI**, not a generic chatbot.

Possible questions:

> Why did my sales decrease?

> Which product is performing best?

> What will my sales look like next month?

> What caused returns to increase?

> What if I increase advertising by 20%?

Flow:

```text
User
 ↓
Chatbot Interface
 ↓
Chatbot API
 ↓
FastAPI
 ↓
Analytics / Forecasting / RCA / Simulation
 ↓
Gemini / OpenAI
 ↓
Natural-language Response
 ↓
User
```

---

# 19. AI Business Reports

The system should generate reports based on validated analytical results.

Possible content:

- Business Summary
- KPI analysis
- Forecast
- Root causes
- Recommendations
- Decision insights

Output formats discussed:

- **PDF**
- **CSV**

Again, the LLM is generating the understandable report text from system results, not inventing the numerical results.

---

# 20. AI Decision Support Engine

This is the final synthesis layer.

It combines:

- Business Analytics
- Competitive Intelligence
- RCA
- Predictive Analytics
- SHAP/XAI
- Recommendations
- Decision Simulation
- LLM explanations

Its purpose is to provide:

- Actionable Insights
- Prioritized Actions
- Expected Outcomes
- Decision Guidance

Conceptually:

```text
Analytics
   +
RCA
   +
Prediction
   +
XAI
   +
Recommendations
   +
Simulation
   +
LLM Explanation
          ↓
AI Decision Support
```

---

# 21. Final Dashboard

### Frontend technologies

**React.js + Tailwind CSS + Recharts**

The dashboard will provide:

- Sales Forecasting
- Customer Behaviour Analysis
- Business Performance Analysis
- Inventory Insights
- Marketing / Ad Analysis
- Competitive Intelligence
- Business Recommendations
- Root Cause Analysis
- Interactive Charts
- AI Business Reports
- AI Chatbot

---

# 22. Frontend Stack

### React.js
Builds the main interactive web dashboard.

### Tailwind CSS
Handles UI styling and responsive layout.

### Recharts
Creates business analytics and forecasting visualizations.

No separate Chart.js is currently planned.

---

# 23. Backend Stack

### Python
Main programming/backend language.

### FastAPI
Main REST API framework.

### Pandas
Primary data-processing library.

---

# 24. Middleware / Security

Current main components:

### CORS
Allows frontend-backend communication across origins.

### JWT Authentication
Provides secure authentication and protected API access.

### Exception Handling
Handles backend errors consistently.

---

# 25. APIs

Main API groups:

- Authentication API
- Data Upload API
- Analytics API
- Forecasting API
- Root Cause Analysis API
- Recommendation API
- Decision Simulation API
- Chatbot API
- Report Generation API

For the architecture, these should be grouped under:

> **FastAPI REST API Layer**

rather than making the diagram enormous.

---

# 26. Development Tools

Current:

- **VS Code**
- **Git**
- **GitHub**

These are development tools, not runtime system components.

---

# 27. Deployment

Current:

- **Docker**
- **AWS**

Do not claim:

- Load balancing
- Autoscaling
- Full CI/CD
- Advanced orchestration

unless you actually implement them.

Your submitted proposal currently marks scalability/load balancing and CI/CD-related benchmark items positively, so those should be revisited if the actual implementation does not support those claims. new_InsightDI_Project Proposal …

---

# 36. Complete Current Technology Stack

## Frontend
**React.js | Tailwind CSS | Recharts**

## Backend
**Python | FastAPI | Pandas**

## Database
**PostgreSQL ONLY**

## Security / Request Handling
**JWT | CORS | Exception Handling**

## AI / ML
**XGBoost | Random Forest | K-Means | ARIMA | LSTM | SHAP**

## LLM
**Google Gemini API | OpenAI API**

## Development
**VS Code | Git | GitHub**

## Deployment
**Docker | AWS**

## Data Acquisition
**CSV | Excel | JSON | E-commerce Data Acquisition / Connectors**

---

# 37. Final High-Level Architecture

The clean current architecture is:

```text
                         USER
                           ↓
                  React Web Dashboard
              React + Tailwind + Recharts
                           ↓
              API Security / Request Handling
                 CORS + JWT + Errors
                           ↓
                    FastAPI Backend
                         Python
                           ↓
            ┌──────────────┴──────────────┐
            ↓                             ↓
    Data Acquisition                 PostgreSQL
 CSV / Excel / JSON                    Database
 E-commerce Connector                     ↑
            │                             │
            └──────────────┬──────────────┘
                           ↓
                    Pandas Processing
                           ↓
              Analytics & Intelligence
                           ↓
      ┌────────────┬────────────┬─────────────┐
      ↓            ↓            ↓             ↓
 Business      Competitive      RCA       Predictive
 Analytics     Intelligence                 Analytics
                                             ↓
                                        ARIMA/LSTM
                                      XGBoost/RF
                           ↓
                      SHAP / XAI
                           ↓
                 Recommendation Engine
                           ↓
                  Decision Simulation
                           ↓
                    Gemini / OpenAI
                           ↓
                 AI Decision Support
                    ↙          ↘
              Chatbot        Reports
                    \          /
                     ↓        ↓
                   InsightDI Dashboard
```

The exact final Agentic AI layer will be added **after its architecture is properly studied and finalized**.

---

# 38. The Core InsightDI Story

The simplest way to understand the whole project is:

> **Traditional BI shows data. InsightDI aims to turn that data into decisions.**

Its intended decision cycle is:

### **What happened?**
Business Analytics

↓

### **Why did it happen?**
Root Cause Analysis

↓

### **What may happen next?**
Predictive Analytics

↓

### **Why should I trust the prediction?**
SHAP / Explainable AI

↓

### **What should I do?**
Recommendation Engine

↓

### **What could happen if I do it?**
Decision Simulation

↓

### **Explain it in simple language**
Gemini / OpenAI

↓

### **Let me interact with the system**
AI Chatbot

↓

### **Give me the complete decision view**
InsightDI Dashboard + Reports

---

## Final source-of-truth rule

For all future InsightDI work, the **current updated design** is:

> **React + Tailwind + Recharts → Python + FastAPI + Pandas → PostgreSQL → Analytics/ML → SHAP → Recommendations/Simulation → Gemini/OpenAI → Decision Support → Dashboard/Chatbot/Reports**

with **Competitive Intelligence and Synthetic Dataset Generation as important project components**, and **Agentic AI still under research/finalization**.

The old MongoDB-based architecture in the submitted proposal should be treated as the **previous version**, not the current implementation direction. new_InsightDI_Project Proposal … new_InsightDI_Project Proposal …