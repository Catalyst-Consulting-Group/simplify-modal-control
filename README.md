[![npm version](https://badge.fury.io/js/@catconsult%2Fsimplify-modal-control.svg)](https://badge.fury.io/js/@catconsult%2Fsimplify-modal-control)

# simplify-modal-control

Simplify modal control flow in React. This library controls modals: opening and closing them, passing props, and making them reusable. You still choose your own modal component (MUI `Dialog`, `react-modal`, a React Native modal, and so on) as the wrapper.

# Features

- Open and close modals, and pass props into them, with one function call
- Declare global modals once and open them from anywhere, even outside React with `openModal`
- **New in v2:** register each modal in its own file, with optional lazy loading
- Type-safe: modal keys autocomplete and modal props are checked, including keys declared once with `ModalRegistry` module augmentation
- No content flicker during close transitions, and no re-renders while a modal is closed
- Works with any modal component
- No dependencies besides React 18 or later

# Installation

```
npm i @catconsult/simplify-modal-control
```

# Getting started

## 1. Create your modal control

Create it once, for example in `modalControl.ts`, and export what you need.

```tsx
import { Dialog } from '@mui/material';
import makeModalControlSimpler from '@catconsult/simplify-modal-control';

export const {
  useModal,
  useModalContext,
  useModalContextSelector,
  ModalContextProvider,
  openModal,
  closeModal,
} = makeModalControlSimpler({
  // the component that wraps every modal's content
  ModalWrapper: Dialog,
  // map the modal state to the wrapper's props
  mapModalProps: ({ open, handleClose }, modalProps) => ({
    ...modalProps,
    open,
    onClose: handleClose,
  }),
});
```

## 2. Write a modal

A modal is a component. Along with its own props, it receives `onClose`, `open` and `setModalProps`:

```tsx
import { DialogContent } from '@mui/material';
import { DefaultModalProps } from '@catconsult/simplify-modal-control';

type MessageModalProps = DefaultModalProps & { message: string };

export const MessageModal = ({ onClose, message }: MessageModalProps) => (
  <DialogContent>
    <p>{message}</p>
    <button onClick={onClose}>Close</button>
  </DialogContent>
);
```

## 3. Use it

There are three ways to use a modal. They can be mixed freely.

| Way                  | Best for                                         | Defined in                                   |
| -------------------- | ------------------------------------------------ | -------------------------------------------- |
| `useModal`           | A modal used by a single component               | That component                               |
| Registered modals    | Global modals, one file per modal, optional lazy | `*.register.ts` files + `registry` (v2)      |
| `useContextModals`   | Global modals declared inline                    | The `makeModalControlSimpler` call           |

### Local modal with `useModal`

```tsx
const Page = () => {
  const [messageModal, openMessage, closeMessage] = useModal(MessageModal);

  return (
    <>
      {messageModal}
      <button onClick={() => openMessage({ message: 'Hi!' })}>Open</button>
    </>
  );
};
```

### Registered modals (v2)

Register each global modal next to the modal itself:

- **Lazy modals (`registerLazyModal`) need a separate register file.** The registry imports only that small file, and the modal's code stays in its own chunk. If the registration were in the modal's own file, the registry would import the whole modal and lazy loading would be lost. When this happens, the library logs a console error the first time that modal loads.
- **Eager modals (`registerModal`) can be registered in the component's own file**, because the component is loaded up front anyway. A separate `*.register.ts` file is still a good habit for consistency.

```tsx
// FindTrainingModal.register.ts
import { registerLazyModal } from '@catconsult/simplify-modal-control';

export const findTraining = registerLazyModal(
  'findTraining',
  () => import('./FindTrainingModal'), // must default-export the component
  { modalProps: { maxWidth: 'md' } },
);
```

```tsx
// ConfirmModal.register.ts
import { registerModal } from '@catconsult/simplify-modal-control';
import { ConfirmModal, ConfirmModalProps } from './ConfirmModal';

// optional: declare the key and props once for the whole app (see "Type support" below)
declare module '@catconsult/simplify-modal-control' {
  interface ModalRegistry {
    confirm: ConfirmModalProps;
  }
}

export const confirm = registerModal('confirm', ConfirmModal, {
  defaultProps: { message: 'Are you sure?' },
});
```

List the registrations in one file and pass them to `makeModalControlSimpler`:

```tsx
// modals.ts — add one line per registered modal
import { findTraining } from './training/FindTrainingModal.register';
import { confirm } from './common/ConfirmModal.register';

export const modals = [findTraining, confirm];
```

```tsx
// modalControl.ts
import { modals } from './modals';

export const { ModalContextProvider, openModal, closeModal } =
  makeModalControlSimpler({
    ModalWrapper: Dialog,
    mapModalProps: ({ open, handleClose }, modalProps) => ({
      ...modalProps,
      open,
      onClose: handleClose,
    }),
    registry: {
      modals,
      fallback: <Spinner />, // default loading UI for lazy modals
    },
  });
```

Put the provider at the root of your app, then open modals by key. Keys autocomplete, and each modal's props are type-checked:

```tsx
<ModalContextProvider>
  <App />
</ModalContextProvider>;

openModal('findTraining', { courseId: 42 });
openModal('confirm', { message: 'Delete this item?' }, { maxWidth: 'xs' });
closeModal('confirm');
```

#### Type support with `ModalRegistry`

> **Recommended for apps with many modals.** Declare each modal's key and props once, in the file that registers it, by augmenting the `ModalRegistry` interface. The `declare module` block in `ConfirmModal.register.ts` above is an example.

With this declaration:

- `openModal`, `closeModal`, `useModalContext` and `useModalContextSelector` autocomplete `'confirm'` and check its props, everywhere in the app.
- `registerModal('confirm', ...)` and `registerLazyModal('confirm', ...)` report an error if the component doesn't accept `ConfirmModalProps`.
- The `modals` list doesn't need literal types, so you can build it however you like, for example `const modals: RegisteredModal[] = [...]`. A list typed as `RegisteredModal[]` contributes no keys of its own, so the declarations are what provide the types.

Without a declaration, types are inferred from the `modals` array literal, as for `findTraining` above. Both work, and you can mix them.

> A declaration is a promise to TypeScript: if you declare a key but never register it, `openModal` with that key type-checks but does nothing at runtime. Declarations are global, so in an app with several `makeModalControlSimpler` instances, every instance gets the declared keys.

**`registerModal` or `registerLazyModal`?**

- `registerLazyModal(key, loader, options)` takes a loader such as `() => import('./X')`. The loader runs the first time the modal opens, not when the app starts. `options.fallback` shows while it loads and overrides `registry.fallback`. For a named export, use `() => import('./X').then(m => ({ default: m.X }))`. If the import fails, for example on a network error or after a deploy, the modal closes and the rest of the app keeps running. The next open tries the import again. React logs the error to the console.
- `registerModal(key, Component, options)` takes a component that is ready to render. This includes `next/dynamic` components, which handle their own loading:

  ```tsx
  export const chart = registerModal(
    'chart',
    dynamic(() => import('./ChartModal')),
  );
  ```

Every modal key must be unique. A key used twice in `registry.modals` throws when `makeModalControlSimpler` runs. A key used in both the registry and `useContextModals` throws when the provider renders.

### Context modals with `useContextModals`

The v1 way to declare global modals still works, and you can use it alongside the registry:

```tsx
makeModalControlSimpler({
  ModalWrapper: Dialog,
  mapModalProps,
  useContextModals: useModal => ({
    message: useModal(MessageModal),
    welcome: useModal(MessageModal, {
      defaultProps: { message: 'Welcome!' }, // default content props
      modalProps: { maxWidth: 'xs' }, // wrapper props
    }),
  }),
});
```

### Consuming global modals

Registered modals and context modals are consumed the same way:

```tsx
// anywhere, even outside React
openModal('message', { message: 'Saved' });

// select one modal in a component
const [openMessage, closeMessage] = useModalContextSelector('message');

// select several
const {
  message: [openMessage],
  welcome: [openWelcome],
} = useModalContext();
```

# Customizing the wrapper

`mapModalProps` receives the modal state, the `modalProps` of the modal, its `customValues`, and the result of `useHookValue`. Use these to change how the wrapper behaves for each modal:

```tsx
makeModalControlSimpler({
  ModalWrapper: Dialog,
  mapModalProps: (
    { open, handleClose },
    modalProps,
    customValues?: { disableBackdropClick?: boolean },
  ) => ({
    fullWidth: true,
    ...modalProps,
    open,
    onClose: customValues?.disableBackdropClick ? undefined : handleClose,
  }),
  onOpen: hookValues => {}, // runs on every open
  onClose: hookValues => {}, // runs on every close
  useHookValue: () => useSomeHook(), // value passed to mapModalProps, onOpen and onClose
});

useModal(MessageModal, { customValues: { disableBackdropClick: true } });
```

# API

## makeModalControlSimpler(options)

| Option             | Description                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------- |
| `ModalWrapper`     | Component that wraps each modal's content                                                |
| `mapModalProps`    | `(modalControl, modalProps, customValues, hookValues) => wrapperProps`                   |
| `onOpen`           | Called with `hookValues` whenever a modal opens                                          |
| `onClose`          | Called with `hookValues` whenever a modal closes                                         |
| `useHookValue`     | Hook whose return value goes to `mapModalProps`, `onOpen` and `onClose`                  |
| `useContextModals` | `useModal => ({ key: useModal(Component, options) })`, the v1 global modals              |
| `registry`         | `{ modals: RegisteredModal[], fallback?: ReactNode }`, the v2 registered modals          |

Returns `{ useModal, useModalContext, useModalContextSelector, ModalContextProvider, openModal, closeModal }`.

## useModal(Component, options?)

Returns `[modalNode, handleOpen, handleClose]`. Render `modalNode` yourself. Options:

- `defaultProps`: default content props. Pass `open: true` to start the modal open.
- `modalProps`: wrapper props
- `customValues`: values passed to `mapModalProps`

`handleOpen(newProps?, newModalProps?)` opens the modal. It merges `newProps` over `defaultProps`, and `newModalProps` over the mapped wrapper props. `handleClose()` closes the modal and clears both.

## registerModal(key, Component, options?) / registerLazyModal(key, loader, options?)

These take the same options as `useModal`. `registerLazyModal` also accepts `fallback`. Both return a registration to put in `registry.modals`.

`modalProps` in a registration is not type-checked against the wrapper's props, because the register file does not import your modal control. The `newModalProps` argument of `openModal` is type-checked.

## ModalRegistry

An empty interface that you augment with `declare module '@catconsult/simplify-modal-control' { interface ModalRegistry { key: Props } }`. Each declared key is typed across the API and checked in `registerModal` and `registerLazyModal`. See [Type support with `ModalRegistry`](#type-support-with-modalregistry).

## openModal(key, newProps?, newModalProps?) / closeModal(key)

Open or close a global modal without a hook. `ModalContextProvider` must be mounted.

## useModalContext() / useModalContextSelector(key)

`useModalContext()` returns `{ [key]: [handleOpen, handleClose] }` for every global modal. `useModalContextSelector(key)` returns the `[handleOpen, handleClose]` pair for one modal.

## DefaultModalProps

`{ onClose: () => void; open?: boolean; setModalProps?: (modalProps) => void }`. These props are passed to every modal component.

# Migrating from v1

Code written for v1 keeps working. You can move to registered modals one modal at a time:

1. Create `MyModal.register.ts` with `registerModal('myModal', MyModal, sameOptions)` or `registerLazyModal(...)`. Optionally declare `myModal: MyModalProps` in `ModalRegistry` in the same file.
2. Add the registration to your `modals` list.
3. Remove the `myModal` entry from `useContextModals`. Calls such as `openModal('myModal', ...)` stay the same.

Breaking changes in v2:

- The generic parameters of `makeModalControlSimpler` changed. This matters only if you passed them explicitly. Let them be inferred.
- Without `useContextModals` or `registry`, `openModal` and `closeModal` no longer accept arbitrary string keys.

# Demo

- [`React` + `MUI Dialog`](https://codesandbox.io/s/objective-agnesi-wercyl?file=/src/App.tsx)
- [React Native `react-native-modalize`](https://snack.expo.dev/@dhananjay.soneji/catalyst-simplify-modal-control?platform=android)

# Local development

Requires Node.js 20 or later and npm.

```
npm ci            # install dependencies
npm test          # run tests in watch mode
npm run test:ci   # run tests once
npm run build     # build to ./dist
```
