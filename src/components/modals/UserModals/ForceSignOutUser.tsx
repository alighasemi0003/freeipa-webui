import React from "react";
// PatternFly
import { Button, Content, ContentVariants } from "@patternfly/react-core";
// Modals
import ModalWithFormLayout from "src/components/layouts/ModalWithFormLayout";
// RPC
import { ErrorResult } from "src/services/rpc";
import { useForceSignOutUserMutation } from "src/services/rpcUsers";
// Hooks
import { useAppDispatch } from "src/store/hooks";
import { addAlert } from "src/store/Global/alerts-slice";

interface propsToForceSignOutUser {
  uid: string | undefined;
  isOpen: boolean;
  onClose: () => void;
}

const ForceSignOutUser = (props: propsToForceSignOutUser) => {
  const dispatch = useAppDispatch();
  const [forceSignOutUser] = useForceSignOutUserMutation();

  const fields = [
    {
      id: "question-text",
      pfComponent: (
        <Content component={ContentVariants.p}>
          Sign out all active web sessions for this user? The account will
          remain enabled and the user can sign in again.
        </Content>
      ),
    },
  ];

  const onForceSignOut = () => {
    if (props.uid === undefined) {
      return;
    }
    forceSignOutUser(props.uid).then((response) => {
      if ("data" in response) {
        if (response.data?.result) {
          const summary =
            response.data.result.summary ||
            "Force Sign Out completed for '" + props.uid + "'";
          dispatch(
            addAlert({
              name: "force-sign-out-success",
              title: String(summary),
              variant: "success",
            })
          );
          props.onClose();
        } else if (response.data?.error) {
          const errorMessage = response.data.error as ErrorResult;
          dispatch(
            addAlert({
              name: "force-sign-out-error",
              title: errorMessage.message || "Force Sign Out failed",
              variant: "danger",
            })
          );
          props.onClose();
        }
      }
    });
  };

  const actions: JSX.Element[] = [
    <Button
      data-cy="modal-button-force-sign-out"
      key="force-sign-out"
      variant="primary"
      onClick={onForceSignOut}
    >
      Force Sign Out
    </Button>,
    <Button
      data-cy="modal-button-cancel"
      key="cancel"
      variant="link"
      onClick={props.onClose}
    >
      Cancel
    </Button>,
  ];

  return (
    <ModalWithFormLayout
      dataCy="force-sign-out-modal"
      variantType="small"
      modalPosition="top"
      title="Force Sign Out"
      formId="force-sign-out-modal"
      fields={fields}
      show={props.isOpen}
      onSubmit={onForceSignOut}
      onClose={props.onClose}
      actions={actions}
    />
  );
};

export default ForceSignOutUser;
