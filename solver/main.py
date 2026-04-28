"""
FastAPI application — HTTP bridge between the PHP backend and the OR-Tools solver.

Endpoints:
  POST /solve    — Run the CP-SAT solver on the given blocks + parameters
  GET  /health   — Health check
"""
from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.responses import JSONResponse

from crew_solver import solve
from models import SolveRequest, SolveResponse

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Shift Schedule OR-Tools Solver",
    description="CP-SAT constraint programming solver for crew scheduling",
    version="1.0.0",
)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.post("/solve", response_model=SolveResponse)
async def solve_endpoint(request: SolveRequest) -> SolveResponse:
    logger.info(
        "Solve request: %d blocks, timeout=%ds",
        len(request.blocks),
        request.timeout_seconds,
    )

    result = solve(
        blocks=request.blocks,
        params=request.parameters,
        phase0_block_ids=request.phase0_shift_block_ids,
        timeout_seconds=request.timeout_seconds,
    )

    logger.info(
        "Solve result: status=%s, %d shifts, %d unassigned, %.0fms",
        result.status,
        len(result.shifts),
        len(result.unassigned_block_indices),
        result.solve_time_ms,
    )

    return result


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.exception("Unhandled exception in solver")
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "shifts": [],
            "unassigned_block_indices": [],
            "objective_value": 0,
            "solve_time_ms": 0,
            "feedback": [f"Вътрешна грешка на солвъра: {str(exc)}"],
        },
    )
