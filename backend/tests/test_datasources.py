"""Test suite for InsightDI Data Source Module (Upload, Auto-detect, Map, Validate, Clean, Ingest)"""
import io
import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_datasource_complete_pipeline():
    uid = uuid.uuid4().hex[:6]
    id1 = f"CUST_{uid}_1"
    id2 = f"CUST_{uid}_2"
    id3 = f"CUST_{uid}_3"

    # 1. Prepare an unformatted arbitrary customer CSV with messy non-standard headers
    csv_content = f"""cust_no,signup_date,town,province,user_segment,payment_pref
{id1},2024-01-15,Pune,Maharashtra,Loyal Regular,UPI
{id2},2024-02-20,Jaipur,Rajasthan,Occasional,Credit Card
{id3},,Ahmedabad,Gujarat,,Cash on Delivery
{id2},2024-02-20,Jaipur,Rajasthan,Occasional,Credit Card
"""
    file_bytes = io.BytesIO(csv_content.encode("utf-8"))

    # 2. Upload file
    upload_res = client.post(
        "/api/v1/datasources/upload",
        files={"file": (f"messy_export_{uid}.csv", file_bytes, "text/csv")},
    )
    assert upload_res.status_code == 200
    upload_data = upload_res.json()["data"]
    upload_id = upload_data["upload_id"]

    # Verify Auto-Detection
    assert upload_data["detected_type"] == "CUSTOMERS"
    assert upload_data["detection_confidence"] >= 0.70
    assert upload_data["row_count"] == 4
    assert upload_data["column_count"] == 6

    # Verify intelligent mapping suggestions
    mappings = {m["source_column"]: m["canonical_column"] for m in upload_data["suggested_mappings"]}
    assert mappings.get("cust_no") == "customer_id"
    assert mappings.get("signup_date") == "registration_date"
    assert mappings.get("town") == "city"
    assert mappings.get("province") == "state"
    assert mappings.get("user_segment") == "customer_segment"
    assert mappings.get("payment_pref") == "preferred_payment_method"

    # 3. Retrieve mappings via GET endpoint
    get_map_res = client.get(f"/api/v1/datasources/{upload_id}/mapping")
    assert get_map_res.status_code == 200
    assert len(get_map_res.json()["data"]) == 6

    # 4. Generate Quality Report
    qr_res = client.get(f"/api/v1/datasources/{upload_id}/quality-report")
    assert qr_res.status_code == 200
    qr_data = qr_res.json()["data"]

    # Check detected anomalies
    assert qr_data["duplicate_records_count"] == 1  # duplicated row
    assert qr_data["missing_values_count"] == 2      # missing date and segment
    assert qr_data["overall_score"] < 100.0          # penalty applied
    assert len(qr_data["issues"]) >= 2
    assert len(qr_data["suggested_actions"]) >= 1

    # 5. Clean, Process & Ingest
    process_res = client.post(
        f"/api/v1/datasources/{upload_id}/process",
        json={
            "apply_imputation": True,
            "drop_duplicates": True,
            "standardize_dates": True,
        },
    )
    assert process_res.status_code == 200
    proc_data = process_res.json()["data"]
    assert proc_data["status"] == "PROCESSED"
    assert proc_data["target_table"] == "customers"
    assert proc_data["rows_ingested"] == 3  # 4 rows minus 1 duplicate = 3 ingested rows

    # 6. Verify newly ingested customer is queryable in warehouse entities API
    cust_res = client.get(f"/api/v1/entities/customers?search={id1}")
    assert cust_res.status_code == 200
    c_data = cust_res.json()["data"]
    assert c_data["total"] >= 1
    found_item = next((item for item in c_data["items"] if item["customer_id"] == id1), None)
    assert found_item is not None
    assert found_item["city"] == "Pune"
    assert found_item["state"] == "Maharashtra"
    assert found_item["preferred_payment_method"] == "UPI"

    # 7. Verify History endpoint
    hist_res = client.get("/api/v1/datasources/history")
    assert hist_res.status_code == 200
    hist_data = hist_res.json()["data"]
    assert len(hist_data) >= 1
    assert hist_data[0]["status"] == "PROCESSED"
