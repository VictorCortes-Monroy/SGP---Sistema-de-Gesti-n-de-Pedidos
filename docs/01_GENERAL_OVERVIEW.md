# 01. General Overview

## Project Name: SGP (Sistema de Gestión y Trazabilidad de Solicitudes de Pedido)

## Objective
Design and develop a centralized system for the creation, validation, and tracking of purchase requests, eliminating operational opacity ("black holes") and ensuring that every expense aligns with the budget and organizational hierarchy.

## The Problem (Pain Points)

1.  **Lack of Traceability**: Requesters are unaware of their order status ("black hole"), while administrators lack visibility into the backlog of pending approvals.
2.  **Discretionary Flow**: Requests are often routed based on personal affinity rather than organizational structure, leading to skipped steps in the chain of command.
3.  **Budget Disconnect**: Requests are processed for Cost Centers (CC) with insufficient funds, generating fruitless administrative work.
4.  **Reception Uncertainty**: There is no audit trail to confirm if what was requested was received satisfactorily.

## Core Solution Principles

-   **Determinism**: The system decides who approves, not the user.
-   **Transparency**: Everyone knows where a request is at any given time.
-   **Financial Integrity**: No approval without available budget.
-   **Accountability**: Every action is logged and immutable.
