from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_current_user, require_roles
from app.models.contract import (
    ContractCreate,
    ContractUpdate,
    ContractResponse,
    ContractDetailResponse,
    TerminateRequest,
)
from app.services import contract_service

router = APIRouter(prefix="/contracts", tags=["contracts"])


@router.get("/expiring-soon", response_model=list[ContractResponse])
async def get_expiring_soon(
    current_user: dict = Depends(get_current_user),
):
    """Get contracts expiring within 30 days."""
    return contract_service.get_expiring_soon(
        org_id=current_user["organization_id"],
    )


@router.get("", response_model=list[ContractResponse])
async def list_contracts(
    status: Optional[str] = Query(None),
    unit_id: Optional[str] = Query(None),
    renter_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """List contracts for the organization."""
    return contract_service.list_contracts(
        org_id=current_user["organization_id"],
        contract_status=status,
        unit_id=unit_id,
        renter_id=renter_id,
    )


@router.post("", response_model=ContractResponse, status_code=201)
async def create_contract(
    data: ContractCreate,
    current_user: dict = Depends(require_roles(["owner", "manager"])),
):
    """Create a new contract."""
    return contract_service.create_contract(
        data=data,
        org_id=current_user["organization_id"],
        user_id=current_user["user_id"],
    )


@router.get("/{contract_id}", response_model=ContractDetailResponse)
async def get_contract(
    contract_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get contract detail."""
    return contract_service.get_contract(
        contract_id=contract_id,
        org_id=current_user["organization_id"],
    )


@router.patch("/{contract_id}", response_model=ContractResponse)
async def update_contract(
    contract_id: str,
    data: ContractUpdate,
    current_user: dict = Depends(require_roles(["owner", "manager"])),
):
    """Update a draft contract."""
    return contract_service.update_contract(
        contract_id=contract_id,
        data=data,
        org_id=current_user["organization_id"],
    )


@router.post("/{contract_id}/activate", response_model=ContractResponse)
async def activate_contract(
    contract_id: str,
    current_user: dict = Depends(require_roles(["owner", "manager"])),
):
    """Activate a draft contract."""
    return contract_service.activate_contract(
        contract_id=contract_id,
        org_id=current_user["organization_id"],
    )


@router.post("/{contract_id}/terminate", response_model=ContractResponse)
async def terminate_contract(
    contract_id: str,
    body: TerminateRequest,
    current_user: dict = Depends(require_roles(["owner", "manager"])),
):
    """Terminate an active contract."""
    return contract_service.terminate_contract(
        contract_id=contract_id,
        reason=body.termination_reason,
        org_id=current_user["organization_id"],
    )


@router.post("/{contract_id}/export-pdf")
async def export_pdf(
    contract_id: str,
    current_user: dict = Depends(require_roles(["owner", "manager"])),
):
    """Generate and export contract PDF."""
    return contract_service.export_pdf(
        contract_id=contract_id,
        org_id=current_user["organization_id"],
    )
