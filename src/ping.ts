import { promise } from 'ping';

export const ping = (host: string) => {
  return promise.probe(host);
};
