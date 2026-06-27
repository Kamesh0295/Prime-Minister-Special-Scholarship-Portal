export const API_BASE_URL = import.meta.env.VITE_API_URL;

if (!API_BASE_URL) {
	console.warn('VITE_API_URL is missing. Frontend API requests may fail in production.');
}

export const BACKEND_ORIGIN = import.meta.env.VITE_SOCKET_URL || (() => {
	if (!API_BASE_URL) {
		return '';
	}
	try {
		return new URL(API_BASE_URL, window.location.origin).origin;
	} catch {
		return '';
	}
})();
