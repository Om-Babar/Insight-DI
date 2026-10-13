import sys
import os
import sqlite3

# Ensure UTF-8 output on Windows terminal
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Test independent read-only calculations against SQLite (which mirrors PostgreSQL schema)
db_path = os.path.join(os.path.dirname(__file__), "insightdi.db")
conn = sqlite3.connect(db_path)
cur = conn.cursor()

print("=" * 60)
print("INDEPENDENT DATABASE VERIFICATION FOR MARKETING ANALYTICS")
print("=" * 60)

# 1. Total Marketing records and date boundary
cur.execute("SELECT MIN(date), MAX(date), COUNT(*), COUNT(DISTINCT channel) FROM marketing")
min_d, max_d, row_cnt, ch_cnt = cur.fetchone()
print(f"Data Coverage: {min_d} to {max_d} | Rows: {row_cnt:,} | Active Channels: {ch_cnt}")

# 2. 30-Day Period Analysis (Anchor: 2024-12-31, Start: 2024-12-02)
s_date = "2024-12-02"
e_date = "2024-12-31"

cur.execute("""
    SELECT 
        channel,
        ROUND(SUM(spend), 2) as spend,
        SUM(impressions) as impr,
        SUM(clicks) as clicks,
        SUM(conversions) as conv
    FROM marketing
    WHERE date >= ? AND date <= ?
    GROUP BY channel
    ORDER BY spend DESC
""", (s_date, e_date))
ch_rows = cur.fetchall()

# 3. Valid orders in same 30d period for AOV
cur.execute("""
    SELECT COUNT(*), ROUND(SUM(total_amount), 2), ROUND(AVG(total_amount), 2)
    FROM orders
    WHERE order_date >= ? AND order_date <= ?
      AND order_status NOT IN ('Cancelled', 'Returned')
""", (s_date, e_date))
ord_cnt, ord_rev, aov = cur.fetchone()

print(f"\n30-Day Orders: {ord_cnt:,} orders | Net Sales: INR {ord_rev:,.2f} | AOV: INR {aov:,.2f}")

tot_spend = sum(r[1] for r in ch_rows)
tot_impr = sum(r[2] for r in ch_rows)
tot_clicks = sum(r[3] for r in ch_rows)
tot_conv = sum(r[4] for r in ch_rows)
attr_rev = round(tot_conv * aov, 2)
overall_roas = round(attr_rev / tot_spend, 2)
overall_cpa = round(tot_spend / tot_conv, 2)
overall_ctr = round((tot_clicks / tot_impr) * 100, 2)

print("\n--- 30-Day Portfolio Aggregates ---")
print(f"Total Ad Spend:        INR {tot_spend:,.2f}")
print(f"Total Impressions:     {tot_impr:,}")
print(f"Total Clicks:          {tot_clicks:,} (CTR: {overall_ctr:.2f}%)")
print(f"Total Conversions:     {tot_conv:,}")
print(f"Attributed Revenue:    INR {attr_rev:,.2f}")
print(f"Portfolio ROAS:        {overall_roas:.2f}x")
print(f"Portfolio CPA:         INR {overall_cpa:.2f}")

print("\n--- Channel Breakdown (30 Days) ---")
print(f"{'Channel':<15} {'Spend':>12} {'Conv':>6} {'Attr. Revenue':>16} {'ROAS':>8} {'CPA':>10} {'CTR':>7}")
print("-" * 80)
for ch, sp, imp, clk, cv in ch_rows:
    c_rev = round(cv * aov, 2)
    c_roas = round(c_rev / max(1.0, sp), 2)
    c_cpa = round(sp / max(1, cv), 2)
    c_ctr = round((clk / max(1, imp)) * 100, 2)
    print(f"{ch:<15} {sp:>12,.2f} {cv:>6} {c_rev:>16,.2f} {c_roas:>7.1f}x {c_cpa:>10,.2f} {c_ctr:>6.2f}%")

# 4. Previous 30-day period (2024-11-02 to 2024-12-01)
p_s_date = "2024-11-02"
p_e_date = "2024-12-01"
cur.execute("""
    SELECT 
        ROUND(SUM(spend), 2),
        SUM(impressions),
        SUM(clicks),
        SUM(conversions)
    FROM marketing
    WHERE date >= ? AND date <= ?
""", (p_s_date, p_e_date))
p_sp, p_imp, p_clk, p_cv = cur.fetchone()

cur.execute("""
    SELECT COUNT(*), ROUND(SUM(total_amount), 2), ROUND(AVG(total_amount), 2)
    FROM orders
    WHERE order_date >= ? AND order_date <= ?
      AND order_status NOT IN ('Cancelled', 'Returned')
""", (p_s_date, p_e_date))
p_ord_cnt, p_ord_rev, p_aov = cur.fetchone()

p_attr_rev = round(p_cv * p_aov, 2)
p_roas = round(p_attr_rev / p_sp, 2)
p_cpa = round(p_sp / p_cv, 2)

print("\n--- Period-over-Period Delta ---")
sp_pct = round(((tot_spend - p_sp) / p_sp) * 100, 1)
rev_pct = round(((attr_rev - p_attr_rev) / p_attr_rev) * 100, 1)
roas_pct = round(((overall_roas - p_roas) / p_roas) * 100, 1)
cpa_pct = round(((overall_cpa - p_cpa) / p_cpa) * 100, 1)

print(f"Spend Change:       {sp_pct:+.1f}% (INR {tot_spend:,.2f} vs {p_sp:,.2f})")
print(f"Revenue Change:     {rev_pct:+.1f}% (INR {attr_rev:,.2f} vs {p_attr_rev:,.2f})")
print(f"ROAS Change:        {roas_pct:+.1f}% ({overall_roas:.2f}x vs {p_roas:.2f}x)")
print(f"CPA Change:         {cpa_pct:+.1f}% (INR {overall_cpa:.2f} vs {p_cpa:.2f})")

conn.close()
print("\nIndependent DB Verification Complete!")
