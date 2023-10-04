export const logger = (data: any, level: 'info' | 'error' = 'info') => {
  // eslint-disable-next-line no-console
  level === 'info' ? console.log(data) : console.error(data);
};

export const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
