import os
import shutil
import difflib
import logging
from typing import Dict, List, Tuple, Any, Optional
from datetime import datetime, timezone
import pandas as pd
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.models.upload import UploadMetadata, SchemaMapping
from app.schemas.datasources import (
    FileUploadResponse,
    ColumnMappingItem,
    DataQualityReport,
    DataQualityIssue,
    ProcessUploadResponse,
)
from app.db.session import engine

logger = logging.getLogger("insightdi.datasources")

UPLOAD_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "uploads",
)
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Canonical signatures for dataset classification
CANONICAL_SIGNATURES: Dict[str, List[str]] = {
    "CUSTOMERS": [
        "customer_id",
        "age_group",
        "gender",
        "city",
        "state",
        "customer_segment",
        "loyalty_status",
        "preferred_payment_method",
        "registration_date",
    ],
    "PRODUCTS": [
        "product_id",
        "product_name",
        "category",
        "brand",
        "cost_price",
        "selling_price",
        "current_stock",
        "reorder_level",
        "rating",
    ],
    "SALES": [
        "order_id",
        "customer_id",
        "order_date",
        "order_status",
        "channel",
        "payment_method",
        "total_amount",
        "refund_amount",
        "return_date",
    ],
    "INVENTORY": [
        "inventory_id",
        "product_id",
        "date",
        "opening_stock",
        "units_sold",
        "restocked_units",
        "closing_stock",
        "stockout_flag",
    ],
    "MARKETING": [
        "marketing_id",
        "date",
        "channel",
        "spend",
        "impressions",
        "clicks",
        "conversions",
    ],
    "COMPETITORS": [
        "competitor_id",
        "date",
        "product_id",
        "competitor_name",
        "competitor_price",
        "competitor_discount",
        "competitor_rating",
        "availability",
    ],
    "PROMOTIONS": [
        "promotion_id",
        "promotion_name",
        "start_date",
        "end_date",
        "discount_pct",
        "promotion_type",
        "festival",
    ],
}

# Synonyms for intelligent column mapping
SYNONYM_MAP: Dict[str, List[str]] = {
    # Customer fields
    "customer_id": ["cust_id", "cust_no", "customer_no", "client_id", "user_id", "id", "customer", "customerid"],
    "customer_segment": ["segment", "customer_type", "tier", "group", "user_segment", "cohort"],
    "loyalty_status": ["loyalty_tier", "loyalty", "membership", "tier_level"],
    "preferred_payment_method": ["payment_pref", "payment_method", "payment_type", "payment_mode"],
    "registration_date": ["signup_date", "date_joined", "created_at", "registered_on", "reg_date", "join_date", "signup"],
    "city": ["town", "location_city", "customer_city", "city_name"],
    "state": ["province", "region", "customer_state", "state_name"],
    "gender": ["sex"],
    "age_group": ["age", "age_bracket", "age_range"],
    
    # Product fields
    "product_id": ["sku", "item_id", "prod_id", "product_code", "item_code", "productid"],
    "product_name": ["title", "item_name", "product_title", "description", "name", "item_title", "item_desc"],
    "category": ["dept", "department", "product_category", "cat"],
    "brand": ["manufacturer", "make", "brand_name", "vendor"],
    "cost_price": ["cost", "unit_cost", "purchase_price", "cogs", "wholesale_price", "buying_price"],
    "selling_price": ["price", "unit_price", "sale_price", "mrp", "retail_price", "list_price"],
    "current_stock": ["stock", "qty_available", "inventory_level", "quantity", "units_in_stock", "stock_quantity", "stock_qty"],
    "reorder_level": ["reorder_point", "min_stock", "threshold", "buffer_level", "safety_stock"],
    "rating": ["stars", "score", "avg_rating", "product_rating"],

    # Order fields
    "order_id": ["order_no", "invoice_no", "transaction_id", "order_number", "orderid", "txn_id"],
    "order_date": ["date", "transaction_date", "purchase_date", "created_at", "orderdate", "placed_at"],
    "order_status": ["status", "fulfillment_status", "delivery_status"],
    "channel": ["sales_channel", "source", "platform", "store"],
    "total_amount": ["revenue", "order_total", "amount", "total_price", "sales_amount", "grand_total", "total"],
    "refund_amount": ["refund", "return_amount", "refunded"],
    "return_date": ["refund_date", "returned_at", "return_time"],

    # Inventory fields
    "opening_stock": ["start_stock", "beginning_inventory", "open_units"],
    "units_sold": ["sold_qty", "qty_sold", "units_out"],
    "restocked_units": ["restock", "units_in", "received_units", "restock_qty"],
    "closing_stock": ["end_stock", "ending_inventory", "final_stock"],
    "stockout_flag": ["out_of_stock", "is_stockout", "stockout"],

    # Marketing fields
    "spend": ["ad_spend", "cost", "marketing_spend", "budget_spent", "expenses"],
    "impressions": ["views", "ad_views", "impr"],
    "clicks": ["ad_clicks", "tap_count"],
    "conversions": ["leads", "sales_count", "acquisitions", "orders_generated"],

    # Competitor fields
    "competitor_name": ["competitor", "seller_name", "vendor_name", "rival"],
    "competitor_price": ["comp_price", "market_price", "rival_price", "external_price"],
    "competitor_discount": ["comp_discount", "market_discount"],
    "competitor_rating": ["comp_rating", "market_rating"],
    "availability": ["stock_status", "in_stock", "available"],
}


class DataSourceService:
    @staticmethod
    def read_uploaded_file(file_path: str) -> pd.DataFrame:
        """Read CSV, Excel, or JSON file into a pandas DataFrame."""
        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".csv":
            return pd.read_csv(file_path)
        elif ext in [".xlsx", ".xls"]:
            return pd.read_excel(file_path)
        elif ext == ".json":
            return pd.read_json(file_path)
        else:
            raise ValueError(f"Unsupported file format: {ext}")

    @staticmethod
    def classify_dataset_type(columns: List[str]) -> Tuple[str, float]:
        """Infer what kind of dataset this is based on column names."""
        normalized_cols = {c.strip().lower().replace(" ", "_"): c for c in columns}
        col_names = set(normalized_cols.keys())

        best_type = "SALES"
        best_score = 0.0

        for dataset_type, canonical_cols in CANONICAL_SIGNATURES.items():
            matched_count = 0
            for c_col in canonical_cols:
                # Direct match
                if c_col in col_names:
                    matched_count += 1
                    continue
                # Synonym match
                synonyms = SYNONYM_MAP.get(c_col, [])
                if any(syn in col_names for syn in synonyms):
                    matched_count += 1

            score = matched_count / len(canonical_cols)
            if score > best_score:
                best_score = score
                best_type = dataset_type

        # Confidence bounded between 0.35 and 1.0
        confidence = round(min(1.0, max(0.40, best_score * 1.25)), 2)
        return best_type, confidence

    @staticmethod
    def suggest_schema_mappings(
        detected_type: str, columns: List[str]
    ) -> List[ColumnMappingItem]:
        """Automatically map user source columns to canonical schema columns."""
        canonical_cols = CANONICAL_SIGNATURES.get(detected_type, [])
        mappings: List[ColumnMappingItem] = []

        used_canonicals = set()

        for col in columns:
            col_norm = col.strip().lower().replace(" ", "_")
            matched_canonical = None
            confidence = 0.0

            # 1. Exact match
            if col_norm in canonical_cols and col_norm not in used_canonicals:
                matched_canonical = col_norm
                confidence = 1.0
            else:
                # 2. Synonym dictionary match
                for c_col in canonical_cols:
                    if c_col in used_canonicals:
                        continue
                    synonyms = SYNONYM_MAP.get(c_col, [])
                    if col_norm in synonyms:
                        matched_canonical = c_col
                        confidence = 0.95
                        break

            # 3. Fuzzy distance match
            if not matched_canonical:
                for c_col in canonical_cols:
                    if c_col in used_canonicals:
                        continue
                    sim = difflib.SequenceMatcher(None, col_norm, c_col).ratio()
                    if sim > 0.65 and sim > confidence:
                        matched_canonical = c_col
                        confidence = round(sim, 2)

            if matched_canonical:
                used_canonicals.add(matched_canonical)
                mappings.append(
                    ColumnMappingItem(
                        source_column=col,
                        canonical_column=matched_canonical,
                        confidence=confidence,
                        is_confirmed=True,
                    )
                )
            else:
                mappings.append(
                    ColumnMappingItem(
                        source_column=col,
                        canonical_column=None,
                        confidence=0.0,
                        is_confirmed=False,
                    )
                )

        return mappings

    @staticmethod
    def upload_and_profile_file(
        db: Session, filename: str, file_bytes: bytes
    ) -> FileUploadResponse:
        """Handle file upload, persist to storage, profile data, and infer schema."""
        ext = os.path.splitext(filename)[1].lower()
        if ext not in [".csv", ".xlsx", ".xls", ".json"]:
            raise ValueError("Only CSV, Excel (.xlsx/.xls), and JSON files are supported.")

        # Save to disk
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        safe_filename = f"{timestamp}_{filename}"
        file_path = os.path.join(UPLOAD_DIR, safe_filename)
        with open(file_path, "wb") as f:
            f.write(file_bytes)

        # Profile dataframe
        df = DataSourceService.read_uploaded_file(file_path)
        row_count, col_count = df.shape
        detected_columns = df.columns.tolist()

        # Classify dataset type
        detected_type, confidence = DataSourceService.classify_dataset_type(detected_columns)

        # Generate initial mapping suggestions
        mappings = DataSourceService.suggest_schema_mappings(detected_type, detected_columns)

        # Extract sample records
        sample_df = df.head(5).where(pd.notnull(df.head(5)), None)
        sample_records = sample_df.to_dict(orient="records")

        # Save record in upload_metadata
        upload_meta = UploadMetadata(
            filename=filename,
            file_type=ext.replace(".", ""),
            detected_type=detected_type,
            detection_confidence=confidence,
            status="UPLOADED",
            row_count=row_count,
            column_count=col_count,
            file_profile={
                "stored_path": file_path,
                "columns": detected_columns,
                "dtypes": {c: str(t) for c, t in df.dtypes.items()},
            },
        )
        db.add(upload_meta)
        db.commit()
        db.refresh(upload_meta)

        # Save mappings in schema_mappings
        for m in mappings:
            sm = SchemaMapping(
                upload_id=upload_meta.upload_id,
                source_column=m.source_column,
                canonical_column=m.canonical_column or "",
                confidence=m.confidence,
                is_confirmed=m.is_confirmed,
            )
            db.add(sm)
        db.commit()

        return FileUploadResponse(
            upload_id=upload_meta.upload_id,
            filename=filename,
            file_type=ext.replace(".", ""),
            detected_type=detected_type,
            detection_confidence=confidence,
            row_count=row_count,
            column_count=col_count,
            detected_columns=detected_columns,
            sample_records=sample_records,
            suggested_mappings=mappings,
        )

    @staticmethod
    def get_mappings(db: Session, upload_id: int) -> List[ColumnMappingItem]:
        """Fetch current column mappings for an upload."""
        mappings = (
            db.query(SchemaMapping)
            .filter(SchemaMapping.upload_id == upload_id)
            .all()
        )
        return [
            ColumnMappingItem(
                source_column=m.source_column,
                canonical_column=m.canonical_column if m.canonical_column else None,
                confidence=m.confidence,
                is_confirmed=m.is_confirmed,
            )
            for m in mappings
        ]

    @staticmethod
    def update_mappings(
        db: Session, upload_id: int, new_mappings: List[ColumnMappingItem]
    ) -> List[ColumnMappingItem]:
        """Update and confirm column mappings for an upload."""
        db.query(SchemaMapping).filter(SchemaMapping.upload_id == upload_id).delete()
        for m in new_mappings:
            db.add(
                SchemaMapping(
                    upload_id=upload_id,
                    source_column=m.source_column,
                    canonical_column=m.canonical_column or "",
                    confidence=m.confidence,
                    is_confirmed=m.is_confirmed,
                )
            )

        # Update metadata status
        upload_meta = db.query(UploadMetadata).filter(UploadMetadata.upload_id == upload_id).first()
        if upload_meta:
            upload_meta.status = "MAPPED"

        db.commit()
        return new_mappings

    @staticmethod
    def generate_quality_report(db: Session, upload_id: int) -> DataQualityReport:
        """Run structural, quality, and relational checks to produce a quality score."""
        upload_meta = db.query(UploadMetadata).filter(UploadMetadata.upload_id == upload_id).first()
        if not upload_meta:
            raise ValueError(f"Upload with ID {upload_id} not found.")

        file_path = upload_meta.file_profile.get("stored_path")
        df = DataSourceService.read_uploaded_file(file_path)
        total_rows, total_cols = df.shape

        issues: List[DataQualityIssue] = []
        suggested_actions: List[str] = []

        # 1. Missing Values
        total_missing = int(df.isnull().sum().sum())
        for col in df.columns:
            missing_count = int(df[col].isnull().sum())
            if missing_count > 0:
                pct = round((missing_count / total_rows) * 100, 2)
                severity = "WARNING" if pct < 15 else "CRITICAL"
                issues.append(
                    DataQualityIssue(
                        field=col,
                        issue_type="missing_values",
                        severity=severity,
                        description=f"Field '{col}' has {missing_count} missing values ({pct}%).",
                        impacted_rows=missing_count,
                        impacted_percentage=pct,
                        suggested_action=f"Impute missing values using {'median' if pd.api.types.is_numeric_dtype(df[col]) else 'most frequent value'}.",
                    )
                )

        if total_missing > 0:
            suggested_actions.append(f"Auto-impute {total_missing} missing values across {len(issues)} columns.")

        # 2. Duplicate Records
        duplicates_count = int(df.duplicated().sum())
        if duplicates_count > 0:
            dup_pct = round((duplicates_count / total_rows) * 100, 2)
            issues.append(
                DataQualityIssue(
                    field="All Columns",
                    issue_type="duplicates",
                    severity="WARNING",
                    description=f"Found {duplicates_count} exact duplicate rows ({dup_pct}%).",
                    impacted_rows=duplicates_count,
                    impacted_percentage=dup_pct,
                    suggested_action="Deduplicate dataset keeping the first occurrence.",
                )
            )
            suggested_actions.append(f"Remove {duplicates_count} exact duplicate rows.")

        # 3. Numeric Domain Validation (Negative values where disallowed)
        mappings = {
            m.source_column: m.canonical_column
            for m in db.query(SchemaMapping).filter(SchemaMapping.upload_id == upload_id).all()
        }

        non_negative_fields = ["selling_price", "cost_price", "total_amount", "spend", "current_stock"]
        for src_col, canon_col in mappings.items():
            if canon_col in non_negative_fields and src_col in df.columns:
                if pd.api.types.is_numeric_dtype(df[src_col]):
                    neg_count = int((df[src_col] < 0).sum())
                    if neg_count > 0:
                        neg_pct = round((neg_count / total_rows) * 100, 2)
                        issues.append(
                            DataQualityIssue(
                                field=src_col,
                                issue_type="invalid_value",
                                severity="CRITICAL",
                                description=f"Field '{src_col}' contains {neg_count} negative numbers.",
                                impacted_rows=neg_count,
                                impacted_percentage=neg_pct,
                                suggested_action="Clamp negative values to 0.0.",
                            )
                        )
                        suggested_actions.append(f"Standardize negative values in '{src_col}' to 0.")

        # Calculate Overall Score (Starts at 100)
        missing_penalty = min(25.0, (total_missing / (total_rows * total_cols + 1e-5)) * 100 * 2)
        duplicate_penalty = min(25.0, (duplicates_count / (total_rows + 1e-5)) * 100 * 2)
        critical_issues_count = sum(1 for i in issues if i.severity == "CRITICAL")
        critical_penalty = critical_issues_count * 10.0

        overall_score = max(0.0, round(100.0 - missing_penalty - duplicate_penalty - critical_penalty, 1))

        status = "CLEAN" if overall_score >= 90 else ("NEEDS_CLEANING" if overall_score >= 60 else "CRITICAL_ISSUES")

        # Save to database
        upload_meta.quality_score = overall_score
        upload_meta.status = "VALIDATED"
        upload_meta.quality_report = {
            "overall_score": overall_score,
            "status": status,
            "issues_count": len(issues),
        }
        db.commit()

        return DataQualityReport(
            upload_id=upload_id,
            filename=upload_meta.filename,
            detected_type=upload_meta.detected_type or "UNKNOWN",
            overall_score=overall_score,
            status=status,
            total_rows=total_rows,
            total_columns=total_cols,
            missing_values_count=total_missing,
            duplicate_records_count=duplicates_count,
            issues=issues,
            suggested_actions=suggested_actions,
        )

    @staticmethod
    def process_and_ingest(
        db: Session,
        upload_id: int,
        apply_imputation: bool = True,
        drop_duplicates: bool = True,
        standardize_dates: bool = True,
    ) -> ProcessUploadResponse:
        """Apply approved cleaning and ingest dataset into canonical PostgreSQL table."""
        upload_meta = db.query(UploadMetadata).filter(UploadMetadata.upload_id == upload_id).first()
        if not upload_meta:
            raise ValueError(f"Upload with ID {upload_id} not found.")

        file_path = upload_meta.file_profile.get("stored_path")
        df = DataSourceService.read_uploaded_file(file_path)

        # 1. Fetch confirmed mappings
        mappings = (
            db.query(SchemaMapping)
            .filter(SchemaMapping.upload_id == upload_id, SchemaMapping.canonical_column != "")
            .all()
        )

        if not mappings:
            raise ValueError("No valid column mappings found for this upload.")

        rename_dict = {m.source_column: m.canonical_column for m in mappings if m.canonical_column}
        
        # Keep only mapped columns and rename
        mapped_df = df[[col for col in df.columns if col in rename_dict]].rename(columns=rename_dict)

        # 2. Cleaning operations
        if drop_duplicates:
            mapped_df = mapped_df.drop_duplicates()

        if apply_imputation:
            for col in mapped_df.columns:
                if mapped_df[col].isnull().sum() > 0:
                    if pd.api.types.is_numeric_dtype(mapped_df[col]):
                        median_val = mapped_df[col].median()
                        mapped_df[col] = mapped_df[col].fillna(median_val)
                    else:
                        mode_val = mapped_df[col].mode()
                        if not mode_val.empty:
                            mapped_df[col] = mapped_df[col].fillna(mode_val[0])
                        else:
                            mapped_df[col] = mapped_df[col].fillna("Unknown")

        # 3. Standardize dates
        date_columns = [
            "registration_date",
            "order_date",
            "return_date",
            "date",
            "start_date",
            "end_date",
        ]
        if standardize_dates:
            for col in mapped_df.columns:
                if col in date_columns:
                    mapped_df[col] = pd.to_datetime(mapped_df[col], errors="coerce").dt.date

        # Determine target canonical table
        target_table_map = {
            "CUSTOMERS": "customers",
            "PRODUCTS": "products",
            "SALES": "orders",
            "INVENTORY": "inventory",
            "MARKETING": "marketing",
            "COMPETITORS": "competitors",
            "PROMOTIONS": "promotions",
        }
        target_table = target_table_map.get(upload_meta.detected_type, "customers")

        # 4. Filter out existing primary key records if already in DB to avoid integrity errors
        pk_col_map = {
            "customers": "customer_id",
            "products": "product_id",
            "orders": "order_id",
            "inventory": "inventory_id",
            "marketing": "marketing_id",
            "competitors": "competitor_id",
            "promotions": "promotion_id",
        }
        pk_col = pk_col_map.get(target_table)
        if pk_col and pk_col in mapped_df.columns:
            existing = pd.read_sql(f"SELECT {pk_col} FROM {target_table}", con=engine)[pk_col].tolist()
            mapped_df = mapped_df[~mapped_df[pk_col].isin(existing)]

        rows_inserted = len(mapped_df)
        if rows_inserted > 0:
            mapped_df = mapped_df.where(pd.notnull(mapped_df), None)
            mapped_df.to_sql(target_table, con=engine, if_exists="append", index=False)

        # Update metadata
        upload_meta.status = "PROCESSED"
        db.commit()

        return ProcessUploadResponse(
            upload_id=upload_id,
            status="PROCESSED",
            target_table=target_table,
            rows_ingested=rows_inserted,
            message=f"Successfully cleaned and ingested {rows_inserted} rows into canonical table '{target_table}'.",
        )
