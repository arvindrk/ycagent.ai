import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SearchWrapper } from '@/components/companies/semantic-search/search-wrapper';
import { FileQuestion, Home, Search } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page Not Found | YC Companies',
  description: 'The page you are looking for could not be found.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <FileQuestion className="w-16 h-16 mx-auto text-muted-foreground" />
            <h1 className="text-4xl font-semibold tracking-tight">
              Page Not Found
            </h1>
            <p className="text-lg text-muted-foreground">
              The page you are looking for doesn&apos;t exist or has been moved.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Search for YC Companies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SearchWrapper>
                <p className="text-sm text-muted-foreground mb-4">
                  Try searching for a company by name, batch, or description.
                </p>
              </SearchWrapper>
            </CardContent>
          </Card>

          <div className="flex justify-center gap-4">
            <Button asChild>
              <Link href="/">
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
