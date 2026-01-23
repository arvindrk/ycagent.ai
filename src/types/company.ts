import { z } from 'zod';
import {
  companySchema,
  companyListItemSchema,
  getCompaniesInputSchema,
  paginatedResponseSchema,
} from '@/lib/validations/company.schema';

export type Company = z.infer<typeof companySchema>;

export type CompanyListItem = z.infer<typeof companyListItemSchema>;

export type GetCompaniesInput = z.input<typeof getCompaniesInputSchema>;

export type PaginatedResponse<T = CompanyListItem> = z.infer<typeof paginatedResponseSchema> & {
  data: T[];
};
