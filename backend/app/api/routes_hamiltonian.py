"""API endpoint for custom downfolded Hamiltonian uploads and analysis."""

from fastapi import APIRouter, HTTPException
from ..models.schemas import CustomUploadRequest
from ..chemistry.downfolding import CustomHamiltonianPayload, solve_custom_hamiltonian
from ..quantum.pauli import PauliTerm

router = APIRouter(prefix="/hamiltonian", tags=["Hamiltonian Upload"])


@router.post("/upload")
def upload_custom_hamiltonian(req: CustomUploadRequest):
    """Parses user-uploaded Pauli Hamiltonian from external DFT downfolding and solves it."""
    try:
        terms = [PauliTerm(label=t.pauli, coeff=t.coeff) for t in req.terms]
        payload = CustomHamiltonianPayload(
            name=req.name,
            n_qubits=req.n_qubits,
            terms=terms,
            description=req.description,
        )
        result = solve_custom_hamiltonian(payload, run_vqe=req.run_vqe)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
