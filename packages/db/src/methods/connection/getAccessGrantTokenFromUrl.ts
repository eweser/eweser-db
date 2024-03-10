import { setLocalAccessGrantToken } from '../../utils/localStorageService';

export const getAccessGrantTokenFromUrl =
  () =>
  /**
   * Pulls the access grant token from the url query params, clears the url query params, and saves the token to local storage
   */
  () => {
    const query = new URLSearchParams(window?.location?.search ?? '');
    const token = query.get('token');
    if (token && typeof token === 'string') {
      setLocalAccessGrantToken(token);
    }
    // remove from url
    if (window?.location?.search) {
      const url = new URL(window.location.href);
      for (const key of url.searchParams.keys()) {
        url.searchParams.delete(key);
      }
      window.history.replaceState({}, '', url.toString());
    }
    return token;
  };
