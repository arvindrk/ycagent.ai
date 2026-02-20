import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/session';
import { insertFeedback } from '@/lib/db/queries/feedback.queries';

const feedbackSchema = z.object({
  sentiment: z.enum(['love', 'okay', 'hate']),
  message: z.string().max(1000).optional().nullable(),
  page_url: z.string().url(),
});

function extractCompanyId(pageUrl: string): string | null {
  try {
    const { pathname } = new URL(pageUrl);
    const match = pathname.match(/^\/companies\/([^/]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = feedbackSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { sentiment, message, page_url } = parsed.data;

  const session = await getSession(request.headers);
  const companyId = extractCompanyId(page_url);

  try {
    await insertFeedback({
      sentiment,
      message: message ?? null,
      pageUrl: page_url,
      companyId,
      userId: session?.user?.id ?? null,
      userEmail: session?.user?.email ?? null,
    });

    return Response.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Feedback insert error:', error);
    return Response.json({ error: 'Failed to save feedback' }, { status: 500 });
  }
}
