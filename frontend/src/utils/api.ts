export async function readApiResponse<T extends { error?: string }>(res: Response): Promise<T> {
    let data: T;

    try {
        data = await res.json();
    } catch {
        throw new Error(res.ok ? "Invalid server response" : `Request failed with status ${res.status}`);
    }

    if (!res.ok || data.error) {
        throw new Error(data.error || `Request failed with status ${res.status}`);
    }

    return data;
}
