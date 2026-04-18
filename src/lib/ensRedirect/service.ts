// Service layer for ENS redirect management
// Namestone integration removed — these are stubs that return a disabled response.
import { vanityProfileUrl } from "./profile";

export type SetRedirectResponse = {
  success: boolean;
  cid?: string;
  provider?: string;
  contenthash?: string;
  url?: string;
  verificationUrls?: string[];
  ethLimoUrl?: string;
  error?: string;
};

const disabled = (): SetRedirectResponse => ({
  success: false,
  error: "Namestone redirects are no longer supported in this project.",
});

export async function setDefaultVanityRedirect(
  _parentDomain: string,
  _subname: string
): Promise<SetRedirectResponse> {
  return disabled();
}

export async function setCustomRedirect(
  _parentDomain: string,
  _subname: string,
  _customUrl: string
): Promise<SetRedirectResponse> {
  return disabled();
}

export { vanityProfileUrl };
