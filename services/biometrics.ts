/**
 * Biometric / WebAuthn Service
 * Note: In a production environment, WebAuthn requires a backend server to generate
 * challenges and verify signatures. For this client-side demo, we rely on the 
 * browser's local authentication success as proof of identity.
 */

// Helper to encode strings to Uint8Array
const strToBin = (str: string): Uint8Array => {
  return Uint8Array.from(str, (c) => c.charCodeAt(0));
};

export const isBiometricsSupported = async (): Promise<boolean> => {
  if (!(window as any).PublicKeyCredential) return false;
  
  // Check if platform authenticator (TouchID/FaceID/Windows Hello) is available
  try {
    const available = await (window as any).PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return available;
  } catch (e) {
    return false;
  }
};

export const registerBiometric = async (email: string, name: string): Promise<boolean> => {
  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: "EDUFLY Study App",
        id: window.location.hostname, // Must match current domain or be localhost
      },
      user: {
        id: strToBin(email),
        name: email,
        displayName: name,
      },
      pubKeyCredParams: [
        { alg: -7, type: "public-key" }, // ES256
        { alg: -257, type: "public-key" }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform", // Forces TouchID/FaceID/Hello
        userVerification: "required",
      },
      timeout: 60000,
      attestation: "none",
    };

    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    });

    return !!credential;
  } catch (error) {
    console.error("Biometric registration failed:", error);
    return false;
  }
};

export const verifyBiometric = async (): Promise<boolean> => {
  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
      challenge,
      timeout: 60000,
      userVerification: "required",
      rpId: window.location.hostname,
    };

    const assertion = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions,
    });

    return !!assertion;
  } catch (error) {
    console.error("Biometric verification failed:", error);
    return false;
  }
};