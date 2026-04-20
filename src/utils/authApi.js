export const API_BASE_URL = "http://localhost:80";

export async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch (_error) {
    return {};
  }
}
