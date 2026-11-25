import { PrismaClient } from "@prisma/client";
import { prisma } from "./prisma.js";

type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Executes a transaction within a verified PostgreSQL Row-Level Security tenant scope
 * using parameterized set_config('app.current_organization_id', $1, true).
 *
 * Mechanical Invariants (Phase 02.2 / Phase 03.2):
 * 1. Parameterized: $1 is passed strictly as a UUID parameter.
 * 2. Scoped: 'is_local = true' restricts the configuration variable strictly to this transaction.
 * 3. Connection Pooling Safe: PgBouncer in transaction mode resets the socket when the transaction
 *    ends, preventing cross-tenant leakage to subsequent transactions.
 */
export async function withTenantTransaction<T>(
  organizationId: string,
  callback: (tx: TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // Set transaction-scoped RLS variable via parameterized query
    await tx.$executeRaw`SELECT set_config('app.current_organization_id', ${organizationId}, true)`;

    // Execute tenant-isolated business operations
    return callback(tx as TransactionClient);
  });
}

/**
 * Executes a transaction within a verified PostgreSQL Row-Level Security distributor scope
 * using parameterized set_config('app.current_distributor_id', $1, true).
 * Prevents cross-distributor access to sub-organizations, license keys, and commission ledgers.
 */
export async function withDistributorTransaction<T>(
  distributorId: string,
  callback: (tx: TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_distributor_id', ${distributorId}, true)`;
    return callback(tx as TransactionClient);
  });
}
