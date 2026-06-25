-- Portion-inventory invariants. Prisma can't express CHECK constraints,
-- so they are hand-added here. The atomic conditional decrement in code guarantees no
-- oversell; these constraints are the database-level backstop for the same invariant.

-- Portions never go negative.
ALTER TABLE "drops" ADD CONSTRAINT "drops_available_nonneg" CHECK ("available" >= 0);
ALTER TABLE "drops" ADD CONSTRAINT "drops_reserved_nonneg" CHECK ("reserved" >= 0);

-- reserved + available always equals the batch size (a portion is never lost or duplicated).
ALTER TABLE "drops" ADD CONSTRAINT "drops_portions_balance" CHECK ("available" + "reserved" = "total_portions");
