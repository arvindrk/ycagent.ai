import { Building2 } from 'lucide-react';

export function CompaniesEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="rounded-full bg-muted p-6 mb-4">
        <Building2 className="w-12 h-12 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No companies found</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        There are no companies in the database yet. Check back later!
      </p>
    </div>
  );
}
