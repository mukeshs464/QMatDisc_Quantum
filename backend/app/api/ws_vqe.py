"""WebSocket endpoint for real-time streaming of VQE optimization trajectory."""

import asyncio
import json
from typing import Any, Dict
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import numpy as np

from ..chemistry.h2_molecule import H2HamiltonianBuilder, ANGSTROM_TO_BOHR
from ..chemistry.sto3g import compute_h2_integrals
from ..quantum.vqe import VQERunner, VQEStep

router = APIRouter(tags=["WebSocket VQE"])
h2_builder = H2HamiltonianBuilder()


@router.websocket("/ws/vqe")
async def websocket_vqe_endpoint(websocket: WebSocket):
    """Streams live VQE optimization iterations to frontend subscribers."""
    await websocket.accept()

    try:
        while True:
            raw_text = await websocket.receive_text()
            try:
                msg: Dict[str, Any] = json.loads(raw_text)
            except Exception:
                await websocket.send_json({"error": "Invalid JSON payload."})
                continue

            system = msg.get("system", "h2")
            distance = float(msg.get("distance", 0.735))
            optimizer = str(msg.get("optimizer", "BFGS")).upper()
            maxiter = int(msg.get("maxiter", 30))

            if system == "h2":
                r_bohr = distance * ANGSTROM_TO_BOHR
                integrals = compute_h2_integrals(r_bohr)
                h_mat = h2_builder.build_hamiltonian_matrix(integrals)
                ansatz_fn = h2_builder.uccd.state
                init_p = [float(msg.get("theta_init", 0.0))]
                exact_energy = float(np.linalg.eigvalsh(h_mat)[0])
            else:
                # Default to H2 if unrecognized
                r_bohr = 0.735 * ANGSTROM_TO_BOHR
                integrals = compute_h2_integrals(r_bohr)
                h_mat = h2_builder.build_hamiltonian_matrix(integrals)
                ansatz_fn = h2_builder.uccd.state
                init_p = [0.0]
                exact_energy = float(np.linalg.eigvalsh(h_mat)[0])

            # Send job start announcement
            await websocket.send_json({
                "type": "start",
                "system": system,
                "distance": distance,
                "exact_energy": exact_energy,
                "optimizer": optimizer,
            })

            # Queue steps to stream asynchronously
            steps_queue: asyncio.Queue[VQEStep] = asyncio.Queue()
            loop = asyncio.get_running_loop()

            def sync_callback(step: VQEStep):
                loop.call_soon_threadsafe(steps_queue.put_nowait, step)

            runner = VQERunner(
                hamiltonian=h_mat,
                ansatz_fn=ansatz_fn,
                optimizer=optimizer,
                maxiter=maxiter,
                callback=sync_callback,
            )

            # Run in worker thread so async loop streams updates cleanly
            fut = loop.run_in_executor(None, runner.run, init_p)

            # Stream steps as they arrive
            while not fut.done() or not steps_queue.empty():
                try:
                    step = await asyncio.wait_for(steps_queue.get(), timeout=0.1)
                    await websocket.send_json({
                        "type": "step",
                        "iteration": step.iteration,
                        "energy": step.energy,
                        "best_energy": step.best_energy,
                        "energy_error_mHa": abs(step.energy - exact_energy) * 1000.0,
                        "theta": step.theta,
                        "grad_norm": step.grad_norm,
                    })
                    # Subtle pacing for smooth human visual perception
                    await asyncio.sleep(0.04)
                except asyncio.TimeoutError:
                    continue

            final_result = await fut

            await websocket.send_json({
                "type": "done",
                "optimal_energy": final_result.optimal_energy,
                "optimal_theta": final_result.optimal_theta,
                "final_error_mHa": abs(final_result.optimal_energy - exact_energy) * 1000.0,
                "total_evaluations": final_result.total_evaluations,
                "converged": final_result.converged,
            })

    except WebSocketDisconnect:
        pass
