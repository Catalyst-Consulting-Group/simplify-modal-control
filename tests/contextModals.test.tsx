import { act, render, renderHook, screen } from '@testing-library/react';
import { ReactNode } from 'react';
import makeModalControlSimpler, { DefaultModalProps } from '../src';

const ModalWrapper = (props: { open: boolean; children?: ReactNode }) =>
  props.open ? <div role="dialog">{props.children}</div> : null;

const Greeting = ({ name }: DefaultModalProps & { name?: string }) => (
  <p>Hello {name}</p>
);

const {
  ModalContextProvider,
  useModalContext,
  useModalContextSelector,
  openModal,
  closeModal,
} = makeModalControlSimpler({
  ModalWrapper,
  mapModalProps: ({ open }) => ({ open }),
  useContextModals: useModal => ({
    greeting: useModal(Greeting, { defaultProps: { name: 'default' } }),
  }),
});

it('opens and closes context modals with openModal/closeModal', () => {
  render(<ModalContextProvider>app</ModalContextProvider>);
  expect(screen.queryByRole('dialog')).toBeNull();

  act(() => openModal('greeting', { name: 'Ada' }));
  expect(screen.getByRole('dialog').textContent).toBe('Hello Ada');

  act(() => closeModal('greeting'));
  expect(screen.queryByRole('dialog')).toBeNull();

  act(() => openModal('greeting'));
  expect(screen.getByRole('dialog').textContent).toBe('Hello default');

  // @ts-expect-error unknown key
  () => openModal('missing');
  // @ts-expect-error wrong prop type
  () => openModal('greeting', { name: 1 });
});

it('exposes handlers through useModalContextSelector and useModalContext', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ModalContextProvider>{children}</ModalContextProvider>
  );
  const { result } = renderHook(
    () => ({
      selected: useModalContextSelector('greeting'),
      all: useModalContext(),
    }),
    { wrapper },
  );

  act(() => result.current.selected[0]({ name: 'Bob' }));
  expect(screen.getByRole('dialog').textContent).toBe('Hello Bob');

  act(() => result.current.all.greeting[1]());
  expect(screen.queryByRole('dialog')).toBeNull();
});
