import React from "react";
import makeModalControlSimpler from "../src";

const ModalWrapper = (props: any) => {
  return <div>{props.children}</div>;
};

export const {
  useModal,
  useModalContext,
  useModalContextSelector,
  ModalContextProvider,
} = makeModalControlSimpler({
  ModalWrapper,
  mapModalProps: (
    { open, handleClose },
    modalProps,
    customProps?: { disableBackdropClick?: boolean }
  ) => ({
    fullWidth: true,
    ...modalProps,
    open,
    onClose: customProps?.disableBackdropClick ? undefined : handleClose,
  }),
});
