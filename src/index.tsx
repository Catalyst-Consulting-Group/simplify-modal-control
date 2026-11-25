import {
  ComponentType,
  Dispatch,
  SetStateAction,
  useState,
  useCallback,
  useMemo,
  memo,
  createContext,
  useContext,
  Fragment,
  ReactNode,
  FC,
  JSX,
  Suspense,
  lazy,
  useRef,
  Component,
} from 'react';

/**
 * Make modal control simpler!
 * @param options.ModalWrapper the modal wrapper component function
 * @param options.mapModalProps function that return modal wrapper props
 * @param options.onOpen function trigger when open modal
 * @param options.onClose function trigger when close modal
 * @param options.useHookValue custom hooks to return any hook value to be consumed by mapModalProps. Similar purpose as customValues
 * @param options.useContextModals return modals to be use in modal context provider
 * @param options.registry modals registered with `registerModal` / `registerLazyModal`, plus a default loading `fallback`
 *
 * @example
 * ```ts
 * // A MUI Dialog Example with Custom Way to Disable Backdrop Click Exit
 * const simplerModalControl = makeModalControlSimpler({
 *    ModalWrapper: Dialog,
 *    mapModalProps: (
 *        { open, handleClose },
 *        modalProps,
 *        customProps?: { disableBackdropClick?: boolean }
 *    ) => ({
 *        fullWidth: true,
 *        ...restProps,
 *        open,
 *        onClose: customProps?.disableBackdropClick ? undefined : handleClose,
 *    }),
 *    useContextModals: useModal => ({
 *        fooGlobalModal: useModal(FooGlobalModal,  {
 *            defaultProps:{
 *                foo: "Some value pass into modal content"
 *            },
 *            modalProps: {
 *                maxWidth: 'xs',
 *            },
 *            customValues: {
 *                disableBackdropClick: true,
 *            }
 *        }),
 *        otherGLobalModal: useModal(OtherGlobalModal)
 *     })
 * });
 *
 * const {
 *   useModal,
 *   useModalContextSelector,
 *   useModalContext,
 *   ModalContextProvider
 * } = simplerModalControl;
 * ```
 */
const makeModalControlSimpler = <
  TModalProps,
  TCustomValues,
  THookValues,
  // infer type for modals
  TContextModals extends Record<string, UseModalReturnType> = {},
  TRegistry extends readonly RegisteredModal[] = [],
>({
  ModalWrapper,
  mapModalProps,
  onOpen,
  onClose,
  useHookValue = EMPTY_FUNCTION as UseHookValueFn<THookValues>,
  useContextModals = _ => EMPTY_OBJECT as TContextModals,
  registry,
}: MakeModalControlSimplerProps<
  TModalProps,
  TCustomValues,
  THookValues,
  TContextModals,
  TRegistry
>) => {
  type TModalContextValue = ModalContextValue<
    TContextModals,
    TRegistry,
    TModalProps
  >;
  type TContextModalsKey = keyof TModalContextValue;

  /**
   *
   * @param ModalContent modal content component function
   * @param options
   * @param options.defaultProps props to feed modal content
   * @param options.modalProps modal props
   * @param options.customValues custom values to be consumed by mapModalProps. Similar purpose as useHookValue
   * @returns
   *
   * @example
   * ```
   * interface MyModalProps extends DefaultModalProps {
   *    customMessage: string
   * }
   *
   * const MyModal = ({ onClose, customMessage }: MyModalProps) => {
   *    return (
   *      <div>
   *        <span>Some Modal Content: {customMessage}</span>
   *        <button onClick={onClose}>Close</button>
   *      </div>
   *    );
   * }
   *
   * const MyConsumer = () => {
   *    const [MyModalNode, handleOpen, handleClose] = useModal(MyModal, {
   *         defaultProps:{
   *             customMessage: "initial message"
   *         },
   *         modalProps: {
   *             maxWidth: 'xs',
   *         },
   *         customValues: {
   *             disableBackdropClick: true,
   *         }
   *    });
   *    return (
   *      <div>
   *        {MyModalNode}
   *        <button onClick={() => handleOpen({ customMessage:"updated message" })}>Open</button>
   *      </div>
   *    );
   *  }
   * ```
   */
  const useModal: UseModalFn<TModalProps, TCustomValues> = (
    ModalContent,
    options,
  ) => {
    const defaultProps = options?.defaultProps;

    const hookValues = useHookValue();
    const [open, setOpen] = useState(Boolean(defaultProps?.open));
    const [props, setProps] = useState<any>();
    const [modalProps, setModalProps] = useState<Partial<TModalProps>>();

    const handleOpen = useCallback(
      (
        newProps?: typeof defaultProps,
        newModalProps?: Partial<TModalProps>,
      ) => {
        setOpen(true);
        if (newProps) setProps(newProps);
        if (newModalProps) setModalProps(newModalProps);
        if (onOpen) onOpen(hookValues);
      },
      [hookValues],
    );

    const handleClose = useCallback(() => {
      setOpen(false);
      setProps(undefined);
      setModalProps(undefined);
      if (onClose) onClose(hookValues);
    }, [hookValues]);

    const ModalContentMemo = useMemo(
      // prevent modal content rerender when modal is not open
      () => memo(ModalContent, (_, next) => !next.open),
      [ModalContent],
    );

    const mappedModalProps = useMemo(
      () =>
        mapModalProps(
          { open, handleClose, handleOpen, setOpen, setProps },
          options?.modalProps,
          options?.customValues,
          hookValues,
        ),
      [
        handleClose,
        handleOpen,
        hookValues,
        open,
        options?.customValues,
        options?.modalProps,
      ],
    );

    const modal = (
      <ModalWrapper {...mappedModalProps} {...modalProps}>
        <ModalContentMemo
          {...defaultProps}
          {...props}
          open={open}
          onClose={handleClose}
          setModalProps={setModalProps}
        />
      </ModalWrapper>
    );

    return [modal, handleOpen, handleClose];
  };

  const registryKeys = new Set<string>();
  const registeredModals = (registry?.modals ?? []).map(modal => {
    if (registryKeys.has(modal.key))
      throw new Error(
        `simplify-modal-control: duplicate modal key "${modal.key}"`,
      );
    registryKeys.add(modal.key);
    return {
      ...modal,
      component: modal.loader
        ? withSuspense(
            modal.loader,
            modal.options?.fallback ?? registry?.fallback ?? null,
          )
        : modal.component!,
    };
  });

  type RegistryHandlerMap = Record<string, UseModalReturnType | undefined>;

  // one component per registered modal keeps hook order stable
  const RegisteredModalHost = ({
    modal,
    handlers,
  }: {
    modal: (typeof registeredModals)[number];
    handlers: RegistryHandlerMap;
  }) => {
    const result = useModal(modal.component, modal.options as any);
    handlers[modal.key] = result;
    return result[0];
  };

  const ModalContext = createContext<TModalContextValue>(EMPTY_OBJECT);

  /**
   * Select all modal handlers from global modal context
   *
   * @example
   * ```ts
   * const {
   *  modal1: [handleOpenModal1, handleCloseModal1],
   *  modal2: [handleOpenModal2, handleCloseModal2]
   * } = useModalContext();
   *
   * // open modal and pass props
   * handleOpenModal1({ fooProp : "pass in props to the modal"});
   * handleOpenModal2({ diffModalProp : "something else"});
   *
   * // close modal
   * handleCloseModal1();
   * handleCloseModal2();
   * ```
   */
  const useModalContext = (): TModalContextValue => useContext(ModalContext);

  /**
   * Select a single modal open and close handler from global modal context
   * @param key modal key
   * @example
   * ```ts
   * const [handleOpen, handleClose] = useModalContextSelector("fooModal")
   *
   * // open modal and pass props
   * handleOpen({fooProp:"pass in props to the modal"});
   *
   * // close modal
   * handleClose();
   * ```
   */
  const useModalContextSelector = <K extends TContextModalsKey>(
    key: K,
  ): TModalContextValue[K] =>
    useContext(ModalContext)?.[key] || (EMPTY_LIST as TModalContextValue[K]);

  /**
   * This section allows open/close context modals without using hook
   */
  let modalContextHandlersRef: TModalContextValue;

  /**
   * Open modal without using hooks
   * @param key modal key
   * @param newProps modal content props
   * @param newModalProps modal props
   * @example
   * ```ts
   * openModal("fooModal", {fooProp:"pass in props to the modal"});
   * ```
   */
  const openModal = <K extends TContextModalsKey>(
    key: K,
    newProps?: Parameters<TModalContextValue[K][0]>[0],
    newModalProps?: Partial<TModalProps>,
  ) => {
    modalContextHandlersRef?.[key][0](newProps, newModalProps);
  };

  /**
   * Close modal without using hooks
   * @param key modal key
   * @example
   * ```ts
   * closeModal("fooModal");
   * ```
   */
  const closeModal = <K extends TContextModalsKey>(key: K) => {
    modalContextHandlersRef?.[key][1]();
  };

  /**
   * A global context provider to store reusable modals
   * Consumer can open, close, pass props to any modals using context value handlers.
   * Use `useModalContextSelect` to select one modal handler
   * Use `useModalContext` to select multiple modal handlers
   *
   * @example
   * ```ts
   * // put provider in root level
   * <ModalContextProvider>
   *    <App/>
   * </ModalContextProvider>
   * ```
   */
  const ModalContextProvider: FC<{
    children: ReactNode;
  }> = ({ children }) => {
    const modals = useContextModals(useModal);
    for (const key of registryKeys)
      if (key in modals)
        throw new Error(`simplify-modal-control: duplicate modal key "${key}"`);

    // latest handlers reported by each RegisteredModalHost
    const registryHandlers = useRef<RegistryHandlerMap>({}).current;

    // context value will be map of handlers. Only need to initialize once
    const contextValue = useMemo(() => {
      const value: Record<string, unknown> = {};
      for (const [key, [_, ...handlers]] of Object.entries(modals))
        value[key] = handlers;
      // stable proxies that always call the host's latest handlers
      for (const key of registryKeys)
        value[key] = [
          (...args: Parameters<UseModalReturnType[1]>) =>
            registryHandlers[key]?.[1](...args),
          () => registryHandlers[key]?.[2](),
        ];
      return (modalContextHandlersRef = value as TModalContextValue);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <ModalContext.Provider value={contextValue}>
        {Object.values(modals).map(([modalNode], i) => (
          <Fragment key={i}>{modalNode}</Fragment>
        ))}
        {registeredModals.map(modal => (
          <RegisteredModalHost
            key={modal.key}
            modal={modal}
            handlers={registryHandlers}
          />
        ))}
        {children}
      </ModalContext.Provider>
    );
  };

  return {
    useModal,
    ModalContextProvider,
    useModalContext,
    useModalContextSelector,
    openModal,
    closeModal,
  };
};

export default makeModalControlSimpler;

/**
 * Register a modal in its own file, then pass it to
 * `makeModalControlSimpler({ registry: { modals: [...] } })`.
 * Use for regular components, including `next/dynamic` components.
 *
 * @example
 * ```ts
 * export const confirm = registerModal('confirm', ConfirmModal, {
 *   defaultProps: { message: 'Are you sure?' },
 *   modalProps: { maxWidth: 'xs' },
 * });
 * ```
 */
export const registerModal = <
  K extends string,
  T extends Partial<DefaultModalProps>,
>(
  key: K,
  component: ComponentType<T> & DeclaredComponent<K>,
  options?: RegisterModalOptions<T>,
): RegisteredModal<K, T> => ({ key, component, options });

/**
 * Register a lazily loaded modal. The loader runs the first time the modal opens;
 * `fallback` (or the registry's default fallback) shows while it loads.
 *
 * @example
 * ```ts
 * export const findTraining = registerLazyModal(
 *   'findTraining',
 *   () => import('./FindTrainingModal'),
 *   { modalProps: { maxWidth: 'md' }, fallback: <Spinner /> },
 * );
 * ```
 */

export const registerLazyModal = <
  K extends string,
  T extends Partial<DefaultModalProps>,
>(
  key: K,
  loader: () => Promise<{ default: ComponentType<T> & DeclaredComponent<K> }>,
  options?: RegisterLazyModalOptions<T>,
): RegisteredModal<K, T> => {
  const registration: RegisteredModal<K, T> = {
    key,
    options,
    loader: () =>
      loader().then(module => {
        // the loaded module exports this registration: it lives in the modal's own file, so the modal was never split out
        if ((Object.values(module) as unknown[]).includes(registration))
          console.error(
            `simplify-modal-control: registerLazyModal("${key}") is in the same file it lazy-loads, so the modal is bundled eagerly. Move the registration to a separate file.`,
          );
        return module;
      }),
  };
  return registration;
};

// keeps a failed load (or render) inside its own modal instead of unmounting the whole app
class LoadErrorBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// mount the lazy component only after the first open, so its chunk is not loaded on app start
const withSuspense = (
  loader: () => Promise<{ default: ComponentType<any> }>,
  fallback: ReactNode,
): ComponentType<any> => {
  let LazyContent = lazy(loader);
  const SuspenseContent = (props: any) => {
    const [opened, setOpened] = useState(Boolean(props.open));
    // props object seen when loading failed; a new one means the modal was opened again
    const [failedProps, setFailedProps] = useState<unknown>();
    if (props.open && !opened) setOpened(true);
    if (!opened || failedProps === props) return null;
    return (
      <LoadErrorBoundary
        onError={() => {
          LazyContent = lazy(loader); // React.lazy caches the rejection; a new one retries
          setFailedProps(props);
          props.onClose();
        }}>
        <Suspense fallback={fallback}>
          <LazyContent {...props} />
        </Suspense>
      </LoadErrorBoundary>
    );
  };
  return SuspenseContent;
};

/**
 * Types
 */
export type DefaultModalProps = {
  onClose: () => void;
  open?: boolean;
  setModalProps?: (modalProps: any) => void;
};

export type UseModalReturnType<T = any, TModal = any> = [
  // modal element
  JSX.Element,
  // handle open
  (newProps?: NewPropsType<T>, newModalProps?: Partial<TModal>) => void,
  // handle close
  () => void,
];

type NewPropsType<T> = Omit<T, 'onClose'>;

export type RegisterModalOptions<T> = {
  defaultProps?: NewPropsType<T>;
  // shortcut: not checked against the wrapper props (a register file can't import the factory without a cycle); openModal's 3rd arg is checked.
  modalProps?: Record<string, any>;
  customValues?: any;
};

export type RegisterLazyModalOptions<T> = RegisterModalOptions<T> & {
  /** shown while the modal content loads; overrides `registry.fallback` */
  fallback?: ReactNode;
};

export type RegisteredModal<K extends string = string, T = any> = {
  key: K;
  component?: ComponentType<T>;
  loader?: () => Promise<{ default: ComponentType<T> }>;
  options?: RegisterLazyModalOptions<T>;
};

/**
 * Declare registered modal keys and their props once, for the whole app, with module augmentation.
 * Declared keys are typed in `openModal`, `closeModal` and the context hooks without
 * passing a typed `registry.modals` array, and `registerModal` checks the component against them.
 *
 * @example
 * ```ts
 * declare module '@catconsult/simplify-modal-control' {
 *   interface ModalRegistry {
 *     confirm: ConfirmModalProps;
 *   }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ModalRegistry {}

// a declared key's component must accept the declared props
type DeclaredComponent<K> = K extends keyof ModalRegistry
  ? ComponentType<ModalRegistry[K] & DefaultModalProps>
  : unknown;

type ModalContextValue<
  TContextModals extends Record<string, UseModalReturnType>,
  TRegistry extends readonly RegisteredModal[],
  TModalProps,
> = {
  // keep only the open and close handlers of each context modal
  [K in keyof TContextModals]: [TContextModals[K][1], TContextModals[K][2]];
} & {
  [K in keyof ModalRegistry]: [
    UseModalReturnType<ModalRegistry[K], TModalProps>[1],
    UseModalReturnType<ModalRegistry[K], TModalProps>[2],
  ];
} & {
  // a `RegisteredModal[]`-typed array has no literal keys; it adds none (use ModalRegistry instead)
  [R in TRegistry[number] as string extends R['key']
    ? never
    : R['key']]: R extends RegisteredModal<string, infer T>
    ? [
        UseModalReturnType<T, TModalProps>[1],
        UseModalReturnType<T, TModalProps>[2],
      ]
    : never;
};

type UseModalFn<TModalProps, TCustomValues> = <
  T extends Partial<DefaultModalProps>,
>(
  ModalContent: ComponentType<T>,
  options?: {
    defaultProps?: NewPropsType<T> | undefined;
    modalProps?: Partial<TModalProps> | undefined;
    customValues?: TCustomValues;
  },
) => UseModalReturnType<T, TModalProps>;

type UseContextModalsFn<TModalProps, TContextModals, TCustomValues> = (
  useModal: UseModalFn<TModalProps, TCustomValues>,
) => TContextModals;

type UseHookValueFn<THookValues> = () => THookValues;

type MakeModalControlSimplerProps<
  TModalProps,
  TCustomValues,
  THookValues,
  TContextModals,
  TRegistry,
> = {
  ModalWrapper: ComponentType<TModalProps>;
  mapModalProps: <T>(
    modalControl: {
      open: boolean;
      handleClose: () => void;
      handleOpen: () => void;
      setOpen: Dispatch<SetStateAction<boolean>>;
      setProps: Dispatch<SetStateAction<T | null | undefined>>;
    },
    modalProps?: Partial<TModalProps>,
    customValues?: TCustomValues,
    hookValues?: THookValues,
  ) => TModalProps;
  onOpen?: (hookValues?: THookValues) => void;
  onClose?: (hookValues?: THookValues) => void;
  useHookValue?: UseHookValueFn<THookValues>;
  useContextModals?: UseContextModalsFn<
    TModalProps,
    TContextModals,
    TCustomValues
  >;
  registry?: {
    modals: TRegistry;
    /** default loading fallback for lazy modals */
    fallback?: ReactNode;
  };
};

const EMPTY_LIST = [] as any;
const EMPTY_OBJECT = {} as any;
// eslint-disable-next-line @typescript-eslint/no-empty-function
export const EMPTY_FUNCTION = () => {};
