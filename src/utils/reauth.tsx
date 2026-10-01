/* Sensitive-action step-up helpers for the modern Web UI.
 *
 * Backend is authoritative: no sensitive-command list is duplicated here.
 * Handles IPA error ReauthRequired (errno 1205) only.
 */
import React from "react";
import {
  Button,
  Form,
  FormGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextInput,
  ValidatedOptions,
} from "@patternfly/react-core";

export const REAUTH_ERROR_CODE = 1205;
export const REAUTH_ERROR_NAME = "ReauthRequired";
export const VERIFY_CREDENTIALS_URL = "/ipa/session/verify_credentials";

export function isReauthRequiredError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const e = error as { code?: number; name?: string };
  return e.code === REAUTH_ERROR_CODE || e.name === REAUTH_ERROR_NAME;
}

export async function verifySessionCredentials(
  password: string,
  otp?: string
): Promise<boolean> {
  const body = new URLSearchParams();
  body.set("password", password);
  if (otp) {
    body.set("otp", otp);
  }
  try {
    const response = await fetch(VERIFY_CREDENTIALS_URL, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    return response.ok;
  } catch {
    return false;
  }
}

type ReauthResolver = {
  resolve: () => void;
  reject: () => void;
};

let pending: ReauthResolver | null = null;
let setDialogOpen: ((open: boolean) => void) | null = null;

/** Prompt and verify credentials; resolves only after successful verify. */
export function requestReauthCredentials(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (pending) {
      reject(new Error("reauth-busy"));
      return;
    }
    pending = {
      resolve: () => {
        pending = null;
        resolve();
      },
      reject: () => {
        pending = null;
        reject(new Error("reauth-cancelled"));
      },
    };
    if (setDialogOpen) {
      setDialogOpen(true);
    } else {
      const p = pending;
      pending = null;
      p.reject();
    }
  });
}

export function ReauthDialogHost() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [failed, setFailed] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    setDialogOpen = setIsOpen;
    return () => {
      setDialogOpen = null;
    };
  }, []);

  const clearSecrets = () => {
    setPassword("");
    setOtp("");
  };

  const onCancel = () => {
    setIsOpen(false);
    clearSecrets();
    setFailed(false);
    if (pending) {
      pending.reject();
    }
  };

  const onConfirm = async () => {
    if (!pending) {
      setIsOpen(false);
      return;
    }
    setBusy(true);
    setFailed(false);
    const pw = password;
    const otpVal = otp;
    clearSecrets();
    const ok = await verifySessionCredentials(pw, otpVal || undefined);
    setBusy(false);
    if (ok) {
      const resolver = pending;
      setIsOpen(false);
      setFailed(false);
      resolver.resolve();
    } else {
      setFailed(true);
    }
  };

  return (
    <Modal
      data-cy="reauth-modal"
      variant="small"
      isOpen={isOpen}
      onClose={onCancel}
    >
      <ModalHeader
        title="Confirm your identity"
        labelId="reauth-modal-title"
      />
      <ModalBody id="reauth-modal-body">
        <p>
          Re-authentication is required to continue with this sensitive
          operation.
        </p>
        <Form>
          <FormGroup label="Current password" fieldId="reauth-password">
            <TextInput
              data-cy="reauth-password"
              id="reauth-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(_e, v) => setPassword(v)}
              validated={
                failed ? ValidatedOptions.error : ValidatedOptions.default
              }
            />
          </FormGroup>
          <FormGroup label="OTP (if required)" fieldId="reauth-otp">
            <TextInput
              data-cy="reauth-otp"
              id="reauth-otp"
              type="password"
              autoComplete="one-time-code"
              value={otp}
              onChange={(_e, v) => setOtp(v)}
            />
          </FormGroup>
          {failed ? (
            <p role="alert">Authentication failed. Please try again.</p>
          ) : null}
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          data-cy="reauth-button-confirm"
          key="confirm"
          variant="primary"
          onClick={() => void onConfirm()}
          isDisabled={busy || !password}
        >
          Confirm
        </Button>
        <Button
          data-cy="reauth-button-cancel"
          key="cancel"
          variant="link"
          onClick={onCancel}
          isDisabled={busy}
        >
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
}

/**
 * After a ReauthRequired RPC error: prompt+verify, then invoke retry once.
 */
export async function handleReauthAndRetry<T>(
  retry: () => Promise<T>,
  alreadyRetried: boolean
): Promise<T> {
  if (alreadyRetried) {
    throw new Error("reauth-retry-exhausted");
  }
  await requestReauthCredentials();
  return retry();
}
