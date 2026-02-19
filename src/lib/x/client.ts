import { Client } from '@xdevplatform/xdk';
import { XAuthenticationError } from './errors';
import { XProvider } from '@/types/x.types';

let instance: Client | null = null;

export function getXClient(bearerToken?: string): Client {
  if (instance) return instance;

  const token = bearerToken || process.env.X_API_BEARER_TOKEN;
  if (!token) {
    throw new XAuthenticationError(XProvider.XDK);
  }

  instance = new Client({ bearerToken: token });
  return instance;
}
