from app.db.session import SessionLocal
from app.services.analytics_service import AnalyticsService

db = SessionLocal()

# Test 1: all channels, 30d, previous_period
res_all = AnalyticsService.get_marketing_campaigns(db, range="30d", comparison="previous_period")
print("=== ALL CHANNELS (30d) ===")
print("Total Spend:", res_all.total_spend)
print("Overall ROAS:", res_all.overall_roas)
print("Overall CPA:", res_all.overall_cpa)
for k in res_all.kpis:
    print(f"  KPI {k['label']}: {k['value']} ({k['change_pct']}%) | Hint: {k.get('hint')}")
print(f"Trend points: {len(res_all.trend)}")
print(f"Table rows: {len(res_all.table['rows'])}")
print(f"Insights count: {len(res_all.marketing_insights)}")

# Test 2: Search channel, 30d
res_search = AnalyticsService.get_marketing_campaigns(db, range="30d", comparison="previous_period", channel="Search")
print("\n=== SEARCH CHANNEL (30d) ===")
print("Total Spend:", res_search.total_spend)
for k in res_search.kpis:
    print(f"  KPI {k['label']}: {k['value']} ({k['change_pct']}%) | Hint: {k.get('hint')}")
print(f"Trend points: {len(res_search.trend)}")
print(f"Table rows: {len(res_search.table['rows'])}")

db.close()
