import { act, render, screen, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import makeModalControlSimpler, {
  DefaultModalProps,
  registerLazyModal,
  registerModal,
} from '../src';

const ModalWrapper = (props: {
  open: boolean;
  size?: 'sm' | 'lg';
  children?: ReactNode;
}) =>
  props.open ? (
    <div role="dialog" data-size={props.size}>
      {props.children}
    </div>
  ) : null;

const mapModalProps = (
  { open }: { open: boolean },
  modalProps?: { size?: 'sm' | 'lg' },
) => ({ ...modalProps, open });

const Confirm = ({ message }: DefaultModalProps & { message: string }) => (
  <p>{message}</p>
);
const Training = ({ course }: DefaultModalProps & { course: string }) => (
  <p>Course {course}</p>
);
const Legacy = () => <p>Legacy</p>;

// what a `*.register.ts` file would export
const confirm = registerModal('confirm', Confirm, {
  defaultProps: { message: 'Sure?' },
  modalProps: { size: 'sm' },
});

it('opens registered modals alongside context modals', () => {
  const { ModalContextProvider, openModal, closeModal } =
    makeModalControlSimpler({
      ModalWrapper,
      mapModalProps,
      useContextModals: useModal => ({ legacy: useModal(Legacy) }),
      registry: { modals: [confirm] },
    });
  render(<ModalContextProvider>app</ModalContextProvider>);

  act(() => openModal('confirm'));
  expect(screen.getByRole('dialog').textContent).toBe('Sure?');
  expect(screen.getByRole('dialog').dataset.size).toBe('sm');

  act(() => openModal('confirm', { message: 'Delete?' }, { size: 'lg' }));
  expect(screen.getByRole('dialog').textContent).toBe('Delete?');
  expect(screen.getByRole('dialog').dataset.size).toBe('lg');

  act(() => closeModal('confirm'));
  expect(screen.queryByRole('dialog')).toBeNull();

  act(() => openModal('legacy'));
  expect(screen.getByRole('dialog').textContent).toBe('Legacy');

  // @ts-expect-error unknown key
  () => openModal('missing');
  // @ts-expect-error wrong prop type for a registered modal
  () => openModal('confirm', { message: 1 });
});

it('loads lazy modals on first open and shows fallbacks', async () => {
  const loadTraining = jest.fn(() => Promise.resolve({ default: Training }));
  const loadConfirm = jest.fn(() => Promise.resolve({ default: Confirm }));
  const { ModalContextProvider, openModal } = makeModalControlSimpler({
    ModalWrapper,
    mapModalProps,
    registry: {
      modals: [
        registerLazyModal('training', loadTraining),
        registerLazyModal('lazyConfirm', loadConfirm, {
          fallback: <p>Custom loading</p>,
        }),
      ],
      fallback: <p>Loading</p>,
    },
  });
  render(<ModalContextProvider>app</ModalContextProvider>);
  expect(loadTraining).not.toHaveBeenCalled();

  act(() => openModal('training', { course: 'TS' }));
  expect(screen.getByRole('dialog').textContent).toBe('Loading');
  expect(await screen.findByText('Course TS')).toBeTruthy();
  expect(loadTraining).toHaveBeenCalledTimes(1);
  expect(loadConfirm).not.toHaveBeenCalled();

  act(() => openModal('lazyConfirm', { message: 'Lazy?' }));
  expect(screen.getByText('Custom loading')).toBeTruthy();
  expect(await screen.findByText('Lazy?')).toBeTruthy();

  // @ts-expect-error wrong prop type for a lazy modal
  () => openModal('training', { course: 1 });
});

it('closes a modal whose load failed, keeps the app, and retries on next open', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  const loadTraining = jest
    .fn()
    .mockRejectedValueOnce(new Error('chunk failed'))
    .mockResolvedValue({ default: Training });
  const { ModalContextProvider, openModal } = makeModalControlSimpler({
    ModalWrapper,
    mapModalProps,
    registry: { modals: [registerLazyModal('training', loadTraining)] },
  });
  render(
    <ModalContextProvider>
      <p>app content</p>
    </ModalContextProvider>,
  );

  act(() => openModal('training', { course: 'TS' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(screen.getByText('app content')).toBeTruthy();
  // no automatic retry loop: only reopening loads again
  await new Promise(resolve => setTimeout(resolve, 50));
  expect(loadTraining).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('Course TS')).toBeNull();

  act(() => openModal('training', { course: 'TS' }));
  expect(await screen.findByText('Course TS')).toBeTruthy();
  expect(loadTraining).toHaveBeenCalledTimes(2);
});

it('reports a lazy registration placed in the file it lazy-loads', async () => {
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  errorSpy.mockClear(); // an earlier test's spy keeps its calls
  // simulates FindTraining.tsx exporting both the component and its own registration
  const sameFileModule: Record<string, unknown> = { default: Training };
  const sameFile = registerLazyModal('sameFile', () =>
    Promise.resolve(sameFileModule as { default: typeof Training }),
  );
  sameFileModule.sameFile = sameFile;
  const separate = registerLazyModal('separate', () =>
    Promise.resolve({ default: Training }),
  );
  const { ModalContextProvider, openModal } = makeModalControlSimpler({
    ModalWrapper,
    mapModalProps,
    registry: { modals: [sameFile, separate] },
  });
  render(<ModalContextProvider>app</ModalContextProvider>);
  const sameFileMessage = expect.stringContaining(
    'registerLazyModal("sameFile") is in the same file it lazy-loads',
  );

  act(() => openModal('separate', { course: 'separate' }));
  expect(await screen.findByText('Course separate')).toBeTruthy();
  expect(errorSpy).not.toHaveBeenCalled();

  act(() => openModal('sameFile', { course: 'same' }));
  expect(await screen.findByText('Course same')).toBeTruthy(); // still works, just not split
  expect(errorSpy).toHaveBeenCalledWith(sameFileMessage);
});

it('rejects duplicate keys', () => {
  expect(() =>
    makeModalControlSimpler({
      ModalWrapper,
      mapModalProps,
      registry: { modals: [confirm, registerModal('confirm', Legacy)] },
    }),
  ).toThrow('duplicate modal key "confirm"');

  const { ModalContextProvider } = makeModalControlSimpler({
    ModalWrapper,
    mapModalProps,
    useContextModals: useModal => ({ confirm: useModal(Legacy) }),
    registry: { modals: [confirm] },
  });
  jest.spyOn(console, 'error').mockImplementation(() => {});
  expect(() => render(<ModalContextProvider>app</ModalContextProvider>)).toThrow(
    'duplicate modal key "confirm"',
  );
});
