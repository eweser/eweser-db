export enum LocalStorageKey {
  loginData = 'loginData',
}
export const localStorageSet = (key: LocalStorageKey, value: any) => {
  localStorage.setItem('ewe_' + key, JSON.stringify(value));
};
export const localStorageGet = <T>(key: LocalStorageKey): T | null => {
  const value = localStorage.getItem('ewe_' + key);
  if (!value) return null;
  return JSON.parse(value) as T;
};
