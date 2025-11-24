export interface IpfsGatewayConfig {
  baseUrl: string;
  authToken?: string;
}

export function loadIpfsGatewayConfig(): IpfsGatewayConfig | null {
  try {
    const stored = localStorage.getItem("fireseed.ipfsGateway");
    if (!stored) return null;
    const parsed = JSON.parse(stored) as IpfsGatewayConfig;
    if (!parsed || typeof parsed.baseUrl !== "string") return null;
    return parsed;
  } catch (error) {
    console.error("Failed to parse IPFS gateway config", error);
    return null;
  }
}

export function saveIpfsGatewayConfig(config: IpfsGatewayConfig): void {
  localStorage.setItem("fireseed.ipfsGateway", JSON.stringify(config));
}

export async function uploadCapsuleZipToIpfs(
  file: File | Blob,
  config: IpfsGatewayConfig
): Promise<{ cid: string }> {
  const trimmedBase = config.baseUrl.replace(/\/$/, "");
  const targetUrl = `${trimmedBase}/add?pin=true`;

  const formData = new FormData();
  formData.append("file", file);

  const headers: Record<string, string> = {};
  if (config.authToken) {
    headers.Authorization = `Bearer ${config.authToken}`;
  }

  let response: Response;
  try {
    response = await fetch(targetUrl, {
      method: "POST",
      body: formData,
      headers,
    });
  } catch (error) {
    throw new Error(`IPFS upload failed: ${(error as Error).message}`);
  }

  let responseText = "";
  try {
    responseText = await response.text();
  } catch (error) {
    throw new Error(
      `IPFS upload failed: unable to read gateway response (${(error as Error).message})`
    );
  }

  if (!response.ok) {
    const detail = responseText || `${response.status} ${response.statusText}`;
    throw new Error(`IPFS upload failed: ${detail}`);
  }

  const firstLine = responseText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstLine) {
    throw new Error("IPFS upload failed: empty response from gateway");
  }

  try {
    const parsed = JSON.parse(firstLine) as { Hash?: string };
    if (!parsed.Hash) {
      throw new Error("Missing CID in gateway response");
    }
    return { cid: parsed.Hash };
  } catch (error) {
    throw new Error(`IPFS upload failed: ${(error as Error).message}`);
  }
}
