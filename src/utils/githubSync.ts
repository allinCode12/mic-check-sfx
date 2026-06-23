const OWNER = 'allinCode12';
const REPO = 'mic-check-sfx';

/**
 * Checks if the GitHub token has access to the target repository.
 */
export async function testGitHubToken(token: string): Promise<boolean> {
  if (!token) return false;
  try {
    const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    return res.ok;
  } catch (e) {
    console.error('Error testing GitHub token:', e);
    return false;
  }
}

/**
 * Gets the SHA of a file in the repository (required for updates).
 */
export async function getFileSha(token: string, path: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    if (res.ok) {
      const data = await res.json();
      return data.sha || null;
    }
    return null;
  } catch (e) {
    console.error(`Error getting SHA for ${path}:`, e);
    return null;
  }
}

/**
 * Pushes a file directly to the GitHub repository.
 * Returns the file's static raw URL or null.
 */
export async function pushFileToGitHub(
  token: string,
  path: string,
  contentBase64: string,
  message: string
): Promise<{ success: boolean; url: string; error?: string }> {
  try {
    const sha = await getFileSha(token, path);

    const body: any = {
      message,
      content: contentBase64,
    };
    if (sha) {
      body.sha = sha;
    }

    const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      // Returns relative path for app routing consistency
      return {
        success: true,
        url: data.content?.path || path,
      };
    } else {
      const errData = await res.json();
      return {
        success: false,
        url: '',
        error: errData.message || 'GitHub API error',
      };
    }
  } catch (e: any) {
    console.error(`Error pushing file ${path} to GitHub:`, e);
    return {
      success: false,
      url: '',
      error: e.message || 'Unknown network error',
    };
  }
}

/**
 * Helper to fetch a file's raw content directly from GitHub repository.
 */
export async function fetchFileFromGitHub(token: string, path: string): Promise<any | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}?t=${Date.now()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3.raw', // Request raw file content directly
      },
    });
    if (res.ok) {
      return await res.json();
    }
    return null;
  } catch (e) {
    console.error(`Error fetching file ${path} from GitHub:`, e);
    return null;
  }
}
