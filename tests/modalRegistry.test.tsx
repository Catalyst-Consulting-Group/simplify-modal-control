import { act, render, screen } from '@testing-library/react';
import { ReactNode } from 'react';
import makeModalControlSimpler, {
  DefaultModalProps,
  RegisteredModal,
  registerLazyModal,
  registerModal,
} from '../src';

type DeclaredConfirmProps = DefaultModalProps & { label: string };

declare module '../src' {
  interface ModalRegistry {
    declaredConfirm: DeclaredConfirmProps;
    declaredLazy: { label: string };
  }
}

const ModalWrapper = (props: { open: boolean; children?: ReactNode }) =>
  props.open ? <div role="dialog">{props.children}</div> : null;

const DeclaredConfirm = ({ label }: DeclaredConfirmProps) => <p>{label}</p>;
const NeedsOther = (_: DefaultModalProps & { other: number }) => null;

// typed loosely on purpose: keys come only from the ModalRegistry declaration
const modals: RegisteredModal[] = [
  registerModal('declaredConfirm', DeclaredConfirm),
  registerLazyModal('declaredLazy', () =>
    Promise.resolve({ default: DeclaredConfirm }),
  ),
];

const { ModalContextProvider, openModal, closeModal } = makeModalControlSimpler(
  {
    ModalWrapper,
    mapModalProps: ({ open }) => ({ open }),
    registry: { modals },
  },
);

it('types declared keys through ModalRegistry augmentation', async () => {
  render(<ModalContextProvider>app</ModalContextProvider>);

  act(() => openModal('declaredConfirm', { label: 'Declared' }));
  expect(screen.getByRole('dialog').textContent).toBe('Declared');
  act(() => closeModal('declaredConfirm'));
  expect(screen.queryByRole('dialog')).toBeNull();

  act(() => openModal('declaredLazy', { label: 'Lazy declared' }));
  expect(await screen.findByText('Lazy declared')).toBeTruthy();

  // @ts-expect-error wrong prop type for a declared key
  () => openModal('declaredConfirm', { label: 1 });
  // @ts-expect-error a loosely typed array adds no undeclared keys
  () => openModal('undeclared');
  // @ts-expect-error component does not accept the declared props
  () => registerModal('declaredConfirm', NeedsOther);
});
