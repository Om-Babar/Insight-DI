import sys
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.db.session import engine
from app.services.analytics_service import AnalyticsService

def audit_range(conn, range_str, cat=None, comp='previous_period'):
    # Determine max order date
    max_date = conn.execute(text("SELECT MAX(order_date) FROM orders")).scalar()
    
    # 1. Independent Direct SQL calculation
    from datetime import datetime, timedelta, date
    max_d = max_date if isinstance(max_date, date) else datetime.strptime(str(max_date), "%Y-%m-%d").date()
    days_map = {"7d": 7, "30d": 30, "90d": 90, "1y": 365, "365d": 365}
    end_d = max_d
    if range_str.lower() == 'ytd':
        start_d = date(max_d.year, 1, 1)
        days = (end_d - start_d).days + 1
    else:
        days = days_map.get(range_str.lower(), 30)
        start_d = end_d - timedelta(days=days - 1)
        
    if comp == 'previous_year':
        p_start_d = start_d - timedelta(days=365)
        p_end_d = end_d - timedelta(days=365)
    else:
        p_end_d = start_d - timedelta(days=1)
        p_start_d = p_end_d - timedelta(days=days - 1)
        
    s_str, e_str = start_d.strftime("%Y-%m-%d"), end_d.strftime("%Y-%m-%d")
    ps_str, pe_str = p_start_d.strftime("%Y-%m-%d"), p_end_d.strftime("%Y-%m-%d")
    
    cat_sql = "AND p.category = :cat" if (cat and cat.lower() != 'all') else ""
    cat_params = {'cat': cat} if (cat and cat.lower() != 'all') else {}
    
    query = f"""
        SELECT p.product_id,
               ROUND(CAST(SUM(oi.final_price * oi.quantity) AS numeric), 2) as rev,
               ROUND(CAST(SUM((oi.final_price - oi.cost_price) * oi.quantity) AS numeric), 2) as gp
        FROM products p
        JOIN order_items oi ON p.product_id = oi.product_id
        JOIN orders o ON oi.order_id = o.order_id
        WHERE o.order_date >= :s AND o.order_date <= :e {cat_sql}
        GROUP BY p.product_id
    """
    
    p1_params = {'s': s_str, 'e': e_str, **cat_params}
    p0_params = {'s': ps_str, 'e': pe_str, **cat_params}
    
    rows1 = conn.execute(text(query), p1_params).fetchall()
    rows0 = conn.execute(text(query), p0_params).fetchall()
    
    curr = {r.product_id: {'rev': float(r.rev), 'gp': float(r.gp)} for r in rows1}
    prev = {r.product_id: {'rev': float(r.rev), 'gp': float(r.gp)} for r in rows0}
    
    active_cnt = len(curr)
    prev_active_cnt = len(prev)
    act_delta = round(((active_cnt - prev_active_cnt) / prev_active_cnt) * 100, 1) if prev_active_cnt > 0 else 0.0
    
    tot_rev = sum(v['rev'] for v in curr.values())
    tot_gp = sum(v['gp'] for v in curr.values())
    avg_margin = round((tot_gp / tot_rev) * 100, 2) if tot_rev > 0 else 0.0
    
    p_tot_rev = sum(v['rev'] for v in prev.values())
    p_tot_gp = sum(v['gp'] for v in prev.values())
    p_avg_margin = round((p_tot_gp / p_tot_rev) * 100, 2) if p_tot_rev > 0 else 0.0
    margin_delta = round(avg_margin - p_avg_margin, 1)
    
    s_rev = sorted([v['rev'] for v in curr.values()], reverse=True)
    t5_rev = sum(s_rev[:5])
    t5_share = round((t5_rev / tot_rev) * 100, 2) if tot_rev > 0 else 0.0
    
    ps_rev = sorted([v['rev'] for v in prev.values()], reverse=True)
    pt5_rev = sum(ps_rev[:5])
    pt5_share = round((pt5_rev / p_tot_rev) * 100, 2) if p_tot_rev > 0 else 0.0
    t5_delta = round(t5_share - pt5_share, 1)
    
    dec_cnt = sum(1 for pid, v in curr.items() if pid in prev and v['rev'] < prev[pid]['rev'])
    
    # 2. AnalyticsService calculation
    with Session(engine) as db:
        resp = AnalyticsService.get_product_performance(db, range=range_str, category=cat, comparison=comp)
        kpis = {k['key']: k for k in resp.kpis}
        
    print(f"\n--- AUDIT: range={range_str}, category={cat}, comp={comp} ---")
    print(f"Direct SQL   -> Active: {active_cnt} (Delta: {act_delta}%), Margin: {avg_margin}% (Delta: {margin_delta}pp), Top5: {t5_share}% (Delta: {t5_delta}pp), Declining: {dec_cnt}")
    print(f"Service API  -> Active: {kpis['active_products']['value']} (Delta: {kpis['active_products']['change_pct']}%), Margin: {kpis['avg_margin']['value']}% (Delta: {kpis['avg_margin']['change_pct']}pp), Top5: {kpis['top_5_share']['value']}% (Delta: {kpis['top_5_share']['change_pct']}pp), Declining: {kpis['declining_products']['value']}")
    
    # Assert exact matches
    assert kpis['active_products']['value'] == active_cnt, f"Active count mismatch: {kpis['active_products']['value']} != {active_cnt}"
    assert kpis['avg_margin']['value'] == avg_margin, f"Margin mismatch: {kpis['avg_margin']['value']} != {avg_margin}"
    assert kpis['top_5_share']['value'] == t5_share, f"Top5 share mismatch: {kpis['top_5_share']['value']} != {t5_share}"
    assert kpis['declining_products']['value'] == dec_cnt, f"Declining mismatch: {kpis['declining_products']['value']} != {dec_cnt}"
    
    # Assert deltas
    assert abs(kpis['active_products']['change_pct'] - act_delta) < 0.15, "Active delta mismatch"
    assert abs(kpis['avg_margin']['change_pct'] - margin_delta) < 0.15, "Margin delta mismatch"
    assert abs(kpis['top_5_share']['change_pct'] - t5_delta) < 0.15, "Top5 delta mismatch"
    print("MATCH: 100% exact numerical match between Raw SQL and Service API!")

def main():
    with engine.connect() as conn:
        print("=======================================================")
        print("      INDEPENDENT DATABASE KPI VALIDATION SUITE        ")
        print("=======================================================")
        
        # 1. 30 Days (Default)
        audit_range(conn, '30d')
        
        # 2. 7 Days
        audit_range(conn, '7d')
        
        # 3. 90 Days
        audit_range(conn, '90d')
        
        # 4. Year to Date
        audit_range(conn, 'ytd')
        
        # 5. Category filter: Electronics
        audit_range(conn, '30d', cat='Electronics')
        
        # 6. Category filter: Fashion
        audit_range(conn, '30d', cat='Fashion')
        
        # 7. Comparison: previous_year
        audit_range(conn, '30d', comp='previous_year')
        
        # 8. Empty/Invalid Category Edge Case
        audit_range(conn, '30d', cat='NonExistentCategory')

if __name__ == '__main__':
    main()
