function resolveDefaultApiUrl() {
	if (typeof window === 'undefined') {
		return 'http://localhost:3001';
	}

	return window.location.origin + "/ChatRTC";
}

const defaultApiUrl = resolveDefaultApiUrl();

export const API_URL = import.meta.env.VITE_API_URL?.trim() || defaultApiUrl;
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL?.trim() || API_URL;
