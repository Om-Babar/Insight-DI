from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.entities import (
    CustomerOut,
    ProductOut,
    OrderOut,
    InventoryOut,
    CompetitorOut,
)
from app.schemas.common import PaginatedResponse, APIResponse
from app.services.entity_service import EntityService

router = APIRouter()


@router.get("/customers", response_model=APIResponse[PaginatedResponse[CustomerOut]], summary="Get paginated customers")
def list_customers(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    segment: Optional[str] = None,
    city: Optional[str] = None,
    db: Session = Depends(get_db),
):
    skip = (page - 1) * page_size
    items, total = EntityService.get_customers(
        db, skip=skip, limit=page_size, search=search, segment=segment, city=city
    )
    total_pages = (total + page_size - 1) // page_size
    return APIResponse(
        success=True,
        message="Customers retrieved successfully",
        data=PaginatedResponse(
            items=[CustomerOut.model_validate(c) for c in items],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        ),
    )


@router.get("/products", response_model=APIResponse[PaginatedResponse[ProductOut]], summary="Get paginated products")
def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    category: Optional[str] = None,
    low_stock_only: bool = False,
    db: Session = Depends(get_db),
):
    skip = (page - 1) * page_size
    items, total = EntityService.get_products(
        db, skip=skip, limit=page_size, search=search, category=category, low_stock_only=low_stock_only
    )
    total_pages = (total + page_size - 1) // page_size
    return APIResponse(
        success=True,
        message="Products retrieved successfully",
        data=PaginatedResponse(
            items=[ProductOut.model_validate(p) for p in items],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        ),
    )


@router.get("/orders", response_model=APIResponse[PaginatedResponse[OrderOut]], summary="Get paginated orders")
def list_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    channel: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
):
    skip = (page - 1) * page_size
    items, total = EntityService.get_orders(
        db, skip=skip, limit=page_size, status=status, channel=channel, start_date=start_date, end_date=end_date
    )
    total_pages = (total + page_size - 1) // page_size
    return APIResponse(
        success=True,
        message="Orders retrieved successfully",
        data=PaginatedResponse(
            items=[OrderOut.model_validate(o) for o in items],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        ),
    )


@router.get("/inventory", response_model=APIResponse[PaginatedResponse[InventoryOut]], summary="Get paginated inventory logs")
def list_inventory(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    product_id: Optional[str] = None,
    stockouts_only: bool = False,
    inventory_date: Optional[date] = None,
    db: Session = Depends(get_db),
):
    skip = (page - 1) * page_size
    items, total = EntityService.get_inventory(
        db, skip=skip, limit=page_size, product_id=product_id, stockouts_only=stockouts_only, inventory_date=inventory_date
    )
    total_pages = (total + page_size - 1) // page_size
    return APIResponse(
        success=True,
        message="Inventory records retrieved successfully",
        data=PaginatedResponse(
            items=[InventoryOut.model_validate(i) for i in items],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        ),
    )


@router.get("/competitors", response_model=APIResponse[PaginatedResponse[CompetitorOut]], summary="Get paginated competitor observations")
def list_competitors(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    product_id: Optional[str] = None,
    competitor_name: Optional[str] = None,
    db: Session = Depends(get_db),
):
    skip = (page - 1) * page_size
    items, total = EntityService.get_competitors(
        db, skip=skip, limit=page_size, product_id=product_id, competitor_name=competitor_name
    )
    total_pages = (total + page_size - 1) // page_size
    return APIResponse(
        success=True,
        message="Competitor observations retrieved successfully",
        data=PaginatedResponse(
            items=[CompetitorOut.model_validate(c) for c in items],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        ),
    )
