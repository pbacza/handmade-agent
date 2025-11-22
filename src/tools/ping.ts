import pingFn from 'ping';

export const ping = (host: string) => {
  return pingFn.promise.probe(host);
};

export const pingu = {
  name: 'ping',
  description:
    'ping some host on the internet. Returns connectivity information including whether the host is alive, response time in milliseconds, packet loss percentage, and network statistics (min/max/avg/stddev).',
  params: {
    name: 'host',
    description: 'hostname or IP address',
  },
} as const;
