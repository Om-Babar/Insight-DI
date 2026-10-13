import sqlite3

conn = sqlite3.connect('insightdi.db')
cur = conn.cursor()

# Check date range of marketing
cur.execute('SELECT MIN(date), MAX(date), COUNT(*), COUNT(DISTINCT date), COUNT(DISTINCT channel) FROM marketing')
print('Marketing overall (min_date, max_date, rows, distinct_dates, distinct_channels):', cur.fetchone())

# Channels list
cur.execute('SELECT DISTINCT channel FROM marketing ORDER BY channel')
print('Channels:', [r[0] for r in cur.fetchall()])

# Last 30 days date range: anchor 2024-12-31 minus 29 days = 2024-12-02 to 2024-12-31
cur.execute('''
    SELECT channel, 
           COUNT(*) as days,
           ROUND(SUM(spend), 2) as spend,
           SUM(impressions) as impr,
           SUM(clicks) as clicks,
           SUM(conversions) as conv
    FROM marketing
    WHERE date >= '2024-12-02' AND date <= '2024-12-31'
    GROUP BY channel
    ORDER BY spend DESC
''')
print('30d marketing by channel:')
for r in cur.fetchall():
    print(' ', r)

# Check orders in last 30d
cur.execute('''
    SELECT COUNT(*), ROUND(SUM(total_amount), 2), ROUND(AVG(total_amount), 2)
    FROM orders
    WHERE order_date >= '2024-12-02' AND order_date <= '2024-12-31'
      AND order_status NOT IN ('Cancelled', 'Returned')
''')
print('30d valid orders (count, sum_revenue, aov):', cur.fetchone())

# Check orders by channel in orders table
cur.execute('''
    SELECT channel, COUNT(*), ROUND(SUM(total_amount), 2)
    FROM orders
    WHERE order_date >= '2024-12-02' AND order_date <= '2024-12-31'
      AND order_status NOT IN ('Cancelled', 'Returned')
    GROUP BY channel
''')
print('30d orders by channel in orders table:')
for r in cur.fetchall():
    print(' ', r)

conn.close()
