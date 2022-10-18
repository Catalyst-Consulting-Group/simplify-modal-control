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
} from 'react'

/**
 * Make modal control simpler!
 * @param options.ModalWrapper the modal wrapper component function
 * @param options.mapModalProps function that return modal wrapper props
 * @param options.onOpen function trigger when open modal
 * @param options.onClose function trigger when close modal
 * @param options.useHookValue custom hooks to return any hook value to be consumed by mapModalProps. Similar purpose as customValues
 * @param options.useContextModals return modals to be use in modal context provider
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
  TContextModals extends Record<string, UseModalReturnType>,
  TContextModalsKey extends keyof TContextModals,
  // transform infer useContextModals return map type value type
  // remove first value ,Element, and leave only open and close handlers
  TModalContextValue extends {
    [K in TContextModalsKey]: [TContextModals[K][1], TContextModals[K][2]]
  }
>({
  ModalWrapper,
  mapModalProps,
  onOpen,
  onClose,
  useHookValue = EMPTY_FUNCTION as UseHookValueFn<THookValues>,
  useContextModals = (_) => EMPTY_OBJECT as TContextModals,
}: MakeModalControlSimplerProps<TModalProps, TCustomValues, THookValues, TContextModals>) => {
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
  const useModal: UseModalFn<TModalProps, TCustomValues> = (ModalContent, options) => {
    const defaultProps = options?.defaultProps

    const hookValues = useHookValue()
    const [open, setOpen] = useState(Boolean(defaultProps?.open))
    const [props, setProps] = useState<any>()

    const handleOpen = useCallback(
      (newProps?: typeof defaultProps) => {
        setOpen(true)
        setProps(newProps)
        if (onOpen) onOpen(hookValues)
      },
      [hookValues]
    )

    const handleClose = useCallback(() => {
      setOpen(false)
      setProps(undefined)
      if (onClose) onClose(hookValues)
    }, [hookValues])

    const ModalContentMemo = useMemo(
      // prevent modal content rerender when modal is not open
      () => memo(ModalContent, (_, next) => !next.open),
      [ModalContent]
    )

    const mappedModalProps = useMemo(
      () => mapModalProps({ open, handleClose, handleOpen, setOpen, setProps }, options?.modalProps, options?.customValues, hookValues),
      [handleClose, handleOpen, hookValues, open, options?.customValues, options?.modalProps]
    )

    const modal = (
      <ModalWrapper {...mappedModalProps}>
        <ModalContentMemo {...defaultProps} {...props} open={open} onClose={handleClose} />
      </ModalWrapper>
    )

    return [modal, handleOpen, handleClose]
  }

  const ModalContext = createContext<TModalContextValue>(EMPTY_OBJECT)

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
  const useModalContext = (): TModalContextValue => useContext(ModalContext)

  /**
   * Select a single modal open and close handler from global modal context
   *
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
  const useModalContextSelector = <K extends TContextModalsKey>(key: K): TModalContextValue[K] =>
    useContext(ModalContext)?.[key] || (EMPTY_LIST as TModalContextValue[K])

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
    children: ReactNode
  }> = ({ children }) => {
    const modals = useContextModals(useModal)

    // context value will be map of handlers. Only need to initialize once
    const contextValue = useMemo(
      () =>
        Object.entries(modals).reduce((acc, [key, [_, ...handlers]]) => {
          acc[key as TContextModalsKey] = handlers as TModalContextValue[TContextModalsKey]
          return acc
        }, {} as TModalContextValue),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      []
    )

    return (
      <ModalContext.Provider value={contextValue}>
        {Object.values(modals).map(([modalNode], i) => (
          <Fragment key={i}>{modalNode}</Fragment>
        ))}
        {children}
      </ModalContext.Provider>
    )
  }

  return {
    useModal,
    ModalContextProvider,
    useModalContext,
    useModalContextSelector,
  }
}

export default makeModalControlSimpler

/**
 * Types
 */
export type DefaultModalProps = {
  onClose: () => void
  open?: boolean
}

export type UseModalReturnType<T = any> = [
  // modal element
  JSX.Element,
  // handle open
  (newProps?: NewPropsType<T>) => void,
  // handle close
  () => void
]

type NewPropsType<T> = Omit<T, 'onClose'>

type UseModalFn<TModalProps, TCustomValues> = <T extends Partial<DefaultModalProps>>(
  ModalContent: ComponentType<T>,
  options?: {
    defaultProps?: NewPropsType<T> | undefined
    modalProps?: Partial<TModalProps> | undefined
    customValues?: TCustomValues
  }
) => UseModalReturnType<T>

type UseContextModalsFn<TModalProps, TContextModals, TCustomValues> = (useModal: UseModalFn<TModalProps, TCustomValues>) => TContextModals

type UseHookValueFn<THookValues> = () => THookValues

type MakeModalControlSimplerProps<TModalProps, TCustomValues, THookValues, TContextModals> = {
  ModalWrapper: ComponentType<TModalProps>
  mapModalProps: <T>(
    modalControl: {
      open: boolean
      handleClose: () => void
      handleOpen: () => void
      setOpen: Dispatch<SetStateAction<boolean>>
      setProps: Dispatch<SetStateAction<T | null | undefined>>
    },
    modalProps?: Partial<TModalProps>,
    customValues?: TCustomValues,
    hookValues?: THookValues
  ) => TModalProps
  onOpen?: (hookValues?: THookValues) => void
  onClose?: (hookValues?: THookValues) => void
  useHookValue?: UseHookValueFn<THookValues>
  useContextModals?: UseContextModalsFn<TModalProps, TContextModals, TCustomValues>
}

const EMPTY_LIST = [] as any
const EMPTY_OBJECT = {} as any
// eslint-disable-next-line @typescript-eslint/no-empty-function
export const EMPTY_FUNCTION = () => {}
