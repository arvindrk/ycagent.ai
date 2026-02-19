import { XProvider, type BaseXProvider, type XConfig } from '@/types/x.types';
import { XDKXProvider } from './providers/xdk';

export function getXProvider(config?: XConfig): BaseXProvider {
  const provider = config?.provider ?? XProvider.XDK;

  switch (provider) {
    case XProvider.XDK:
      return new XDKXProvider(config);
    default:
      throw new Error(`Unknown X provider: ${provider}`);
  }
}
