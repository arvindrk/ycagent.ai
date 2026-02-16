import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return unauthorizedResponse();
  }

  const expectedPassword = process.env.TEMP_API_PASSWORD;
  if (!expectedPassword) {
    console.error('TEMP_API_PASSWORD not configured');
    return unauthorizedResponse();
  }

  try {
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = atob(base64Credentials);
    const [, password] = credentials.split(':');

    if (!password || !timingSafeEqual(password, expectedPassword)) {
      return unauthorizedResponse();
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Auth parsing error:', error);
    return unauthorizedResponse();
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

function unauthorizedResponse() {
  return new NextResponse(
    JSON.stringify({ error: 'Unauthorized' }),
    {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Protected API"',
        'Content-Type': 'application/json',
      },
    }
  );
}

export const config = {
  matcher: '/api/companies/:path*/research',
};
