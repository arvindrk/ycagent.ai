import { getDBClient } from '../client';

interface InsertResearchRunParams {
  userId: string;
  userEmail: string;
  companyId: string;
  companyName: string;
  triggerRunId: string;
  sandboxId: string;
}

export async function insertResearchRun(params: InsertResearchRunParams): Promise<string> {
  const sql = getDBClient();
  const { userId, userEmail, companyId, companyName, triggerRunId, sandboxId } = params;

  const rows = await sql`
    INSERT INTO research_runs (user_id, user_email, company_id, company_name, trigger_run_id, sandbox_id)
    VALUES (${userId}, ${userEmail}, ${companyId}, ${companyName}, ${triggerRunId}, ${sandboxId})
    RETURNING id
  `;

  return rows[0].id as string;
}

type TerminalStatus = 'completed' | 'failed' | 'cancelled';

interface UpdateResearchRunParams {
  triggerRunId: string;
  status: TerminalStatus;
  errorMessage?: string;
}

export async function updateResearchRunStatus(params: UpdateResearchRunParams): Promise<void> {
  const sql = getDBClient();
  const { triggerRunId, status, errorMessage } = params;

  await sql`
    UPDATE research_runs
    SET
      status        = ${status},
      error_message = ${errorMessage ?? null},
      completed_at  = NOW()
    WHERE trigger_run_id = ${triggerRunId}
  `;
}
