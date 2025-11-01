// Service layer for ENS redirect management
import { callEdge } from "@/lib/supaInvoke";
import { vanityProfileUrl } from "./profile";

export type SetRedirectResponse = {
  success: boolean;
  cid?: string;
  contenthash?: string;
  url?: string;
  error?: string;
};

export async function setDefaultVanityRedirect(
  parentDomain: string, 
  subname: string
): Promise<SetRedirectResponse> {
  return callEdge<SetRedirectResponse>("set-namestone-redirect", {
    parentDomain,
    subname,
    redirectType: "default",
  });
}

export async function setCustomRedirect(
  parentDomain: string, 
  subname: string, 
  customUrl: string
): Promise<SetRedirectResponse> {
  // Validate HTTPS
  try {
    const u = new URL(customUrl);
    if (u.protocol !== "https:") {
      throw new Error("URL must use HTTPS");
    }
  } catch (e) {
    throw new Error("Invalid HTTPS URL");
  }

  return callEdge<SetRedirectResponse>("set-namestone-redirect", {
    parentDomain,
    subname,
    redirectType: "custom",
    customUrl,
  });
}
