import { getDBClient } from '../client';

interface InsertFeedbackParams {
  sentiment: 'love' | 'okay' | 'hate';
  message?: string | null;
  pageUrl: string;
  companyId?: string | null;
  userId?: string | null;
  userEmail?: string | null;
}

export async function insertFeedback(params: InsertFeedbackParams): Promise<void> {
  const sql = getDBClient();
  const { sentiment, message, pageUrl, companyId, userId, userEmail } = params;

  await sql`
    INSERT INTO feedback (sentiment, message, page_url, company_id, user_id, user_email)
    VALUES (${sentiment}, ${message ?? null}, ${pageUrl}, ${companyId ?? null}, ${userId ?? null}, ${userEmail ?? null})
  `;
}
