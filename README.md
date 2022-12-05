[![npm version](https://badge.fury.io/js/@catconsult%2Fsimplify-modal-control.svg)](https://badge.fury.io/js/@catconsult%2Fsimplify-modal-control)

# simplify-modal-control

Like the name suggested, this library is created to simplify modal control flow for React. Note, this library is for controlling modals, you still have to pick your favorite modal component as the wrapper.

# Features

- Handle open and close modal
- Pass props into modal content
- Declare reusable modals and access it anywhere
- Prevent data flickering during modal transition
- Prevent re-rendering when modal is in close state
- Super customizable, not tied to any modal components
- ZERO dependencies beside React v16.8.0 or above
- Extremely lightweight, just ~10 KB in package size
- Written in TypeScript, every pieces are well Typed!

# Problems Addressed

In React world, normally when you want to use a modal, you'll have to go through the process of declaring a openModal state, creating open and close handlers, and finally returning the modal and content component in the component block. This process is tedious and cause several issues:

- Lots of boilerplate codes
- Hard to reuse and pass around props into the modal
- Introduce extra re-rendering caused by the parent component
- Modal component continue to trigger re-rendering in close state
- Modal content flickering during close transition caused by change modal state

This library addressed all the above issues by introduce a simpler modal control flow.

# Quick Installation

```
yarn add @catconsult/simplify-modal-control
```

or

```
npm i @catconsult/simplify-modal-control
```

# Quick Usage

```tsx
// use MUI Dialog as Example, choose you favorite component wrapper
import { Dialog, DialogContent } from '@mui/material';
import makeModalControlSimpler from '@catconsult/simplify-modal-control';

// define your modal
const MyModal = ({
  onClose,
  customMessage,
}: DefaultModalProps & {
  customMessage: string;
}) => {
  return (
    <>
      <DialogContent>
        <span>Modal Content: {customMessage}</span>
        <button onClick={onClose}>Close</button>
      </DialogContent>
    </>
  );
};

// construct modal controls
const {
  useModal,
  useModalContextSelector,
  useModalContext,
  ModalContextProvider,
  openModal,
  closeModal,
} = makeModalControlSimpler({
  ModalWrapper: Dialog,
  // pass props to modal wrapper
  mapModalProps: ({ open, handleClose }, modalProps) => ({
    ...modalProps,
    open,
    onClose: handleClose,
  }),
  // define your global modals
  useContextModals: useModal => ({
    myModal0: useModal(MyModal),
    myModal1: useModal(MyModal),
    myModal2: useModal(MyModal, {
      modalProps: {
        // pass props to modal wrapper
        maxWidth: 'xs',
      },
    }),
    myModal3: useModal(MyModal, {
      // pass default props to modal content
      defaultProps: { customMessage: 'something' },
    }),
  }),
});

// three ways to consume modal
const MyConsumer = () => {
  // select single from global context
  const [handleOpenMyModal1, handleCloseMyModal1] =
    useModalContextSelector('myModal1');

  // select multiple from global context
  const {
    myModal2: [handleOpenMyModal2],
    myModal3: [handleOpenMyModal3],
  } = useModalContext();

  // use modal within component scope
  const [MyModal4Node, handleOpenMyModal4] = useModal(MyModal);

  return (
    <div>
      {MyModal4Node}
      <button
        onClick={() => {
          openModal('modal0', { customMessage: 'modal0' });
          handleOpenMyModal1({ customMessage: 'modal1' });
          handleOpenMyModal2({ customMessage: 'modal2' });
          handleOpenMyModal3({ customMessage: 'modal3' });
          handleOpenMyModal4({ customMessage: 'modal4' });
        }}>
        Open
      </button>
    </div>
  );
};

export const App = () => {
  return (
    <ModalContextProvider>
      <MyConsumer />
    </ModalContextProvider>
  );
};
```

# Demo

- [`React` + `MUI Dialog`](https://codesandbox.io/s/objective-agnesi-wercyl?file=/src/App.tsx)
- [React Native `react-native-modalize`](https://snack.expo.dev/@dhananjay.soneji/catalyst-simplify-modal-control?platform=android)

# Documentations

## makeModalControlSimpler

```ts
/**
 * Make modal control simpler!
 * @param options.ModalWrapper the modal wrapper component function
 * @param options.mapModalProps function that return modal wrapper props
 * @param options.onOpen function trigger when open modal
 * @param options.onClose function trigger when close modal
 * @param options.useHookValue custom hooks to return any hook value to be consumed by mapModalProps. Similar purpose as customValues
 * @param options.useContextModals return modals to be use in modal context provider
 *
 * @returns { { useModal, useModalContext, useModalContextSelector, ModalContextProvider } }
 */
makeModalControlSimpler(options);
```

## openModal

````ts
/**
 * Open modal without using hooks
 * @param key modal key
 * @param newProps modal props
 * @example
 * ```ts
 * openModal("fooModal", {fooProp:"pass in props to the modal"});
 * ```
 */
openModal(key, newProps);
````

## closeModal

````ts
/**
 * Open modal without using hooks
 * @param key modal key
 * @example
 * ```ts
 * openModal("fooModal", {fooProp:"pass in props to the modal"});
 * ```
 */
closeModal(key);
````

## useModal

```ts
/**
 * @param ModalContent modal content component function
 * @param options
 * @param options.defaultProps props to feed modal content
 * @param options.modalProps modal props
 * @param options.customValues custom values to be consumed by mapModalProps. Similar purpose as useHookValue
 * @returns { [ModalNode, handleOpen, handleClose] }
 */
useModal(MyModal, UseModalOptions);
```

## useModalContext

```ts
/**
 *  Select all modal handlers from global modal context
 *  @returns { { [modalKey]: [handleOpen, handleClose] } }
 */
useModalContext();
```

## useModalContextSelector

```ts
/**
 *  Select a single modal open and close handler from global modal context
 *  @param key modal key
 *  @returns { [handleOpen, handleClose] }
 */
useModalContextSelector(key);
```

# Local Development

## Prerequisites

- NodeJS and NPM
- Yarn
- Editor/IDE that support TypeScript

## Quick Start

install dependencies using yarn

```
yarn
```

run test watch

```
yarn test
```

test build

```
yarn build
```
