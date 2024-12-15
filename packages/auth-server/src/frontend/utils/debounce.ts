export function debounce(func: (...args: any[]) => void, wait: number) {
  let timeout: NodeJS.Timeout;

  const debouncedFunction = function (...args: any[]) {
    clearTimeout(timeout);

    timeout = setTimeout(() => func(...args), wait);
  };

  debouncedFunction.cancel = () => {
    clearTimeout(timeout);
  };

  return debouncedFunction;
}
