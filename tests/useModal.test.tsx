import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { useModal } from './setup';
import { DefaultModalProps } from '../src';

it('Should open and close without any custom props', () => {
  const Test = () => (
    <div>
      <p>Hello World</p>
    </div>
  );
  const { result } = renderHook(() => useModal(Test));

  // default modal always closed
  expect(result.current[0].props).toEqual(
    expect.objectContaining({
      fullWidth: true,
      open: false,
      onClose: expect.any(Function),
      children: expect.objectContaining({
        props: {
          open: false,
          onClose: expect.any(Function),
          setModalProps: expect.any(Function),
        },
      }),
    }),
  );

  act(() => {
    // open modal
    result.current[1]();
  });

  expect(result.current[0].props).toEqual(
    expect.objectContaining({
      fullWidth: true,
      open: true,
      onClose: expect.any(Function),
      children: expect.objectContaining({
        props: {
          open: true,
          onClose: expect.any(Function),
          setModalProps: expect.any(Function),
        },
      }),
    }),
  );

  act(() => {
    // close modal
    result.current[2]();
  });

  expect(result.current[0].props).toEqual(
    expect.objectContaining({
      fullWidth: true,
      open: false,
      onClose: expect.any(Function),
      children: expect.objectContaining({
        props: {
          open: false,
          onClose: expect.any(Function),
          setModalProps: expect.any(Function),
        },
      }),
    }),
  );
});

it('Should open by default using defaultProps', () => {
  const Test = () => (
    <div>
      <p>Hello World</p>
    </div>
  );
  const { result } = renderHook(() =>
    useModal(Test, { defaultProps: { open: true } }),
  );

  // defaultProps ==> {open: true} always opens the modal
  expect(result.current[0].props).toEqual(
    expect.objectContaining({
      fullWidth: true,
      open: true,
      onClose: expect.any(Function),
      children: expect.objectContaining({
        props: {
          open: true,
          onClose: expect.any(Function),
          setModalProps: expect.any(Function),
        },
      }),
    }),
  );

  act(() => {
    // close modal
    result.current[2]();
  });

  expect(result.current[0].props).toEqual(
    expect.objectContaining({
      fullWidth: true,
      open: false,
      onClose: expect.any(Function),
      children: expect.objectContaining({
        props: {
          open: false,
          onClose: expect.any(Function),
          setModalProps: expect.any(Function),
        },
      }),
    }),
  );
});

it('Should open with custom props passed in openModel function', () => {
  const Test = (props: { test: string } & DefaultModalProps) => (
    <div>
      <p>Hello World</p>
    </div>
  );
  const { result } = renderHook(() => useModal(Test));

  // defaultProps modal always closed
  expect(result.current[0].props).toEqual(
    expect.objectContaining({
      fullWidth: true,
      open: false,
      onClose: expect.any(Function),
      children: expect.objectContaining({
        props: {
          open: false,
          onClose: expect.any(Function),
          setModalProps: expect.any(Function),
        },
      }),
    }),
  );

  act(() => {
    // open modal with custom prop
    result.current[1]({ test: 'newProp' });
  });

  expect(result.current[0].props).toEqual(
    expect.objectContaining({
      fullWidth: true,
      open: true,
      onClose: expect.any(Function),
      children: expect.objectContaining({
        props: {
          open: true,
          onClose: expect.any(Function),
          test: 'newProp',
          setModalProps: expect.any(Function),
        },
      }),
    }),
  );

  act(() => {
    // close modal should remove custom props on clos
    result.current[2]();
  });

  // should remove custom props on close
  expect(result.current[0].props).toEqual(
    expect.objectContaining({
      fullWidth: true,
      open: false,
      onClose: expect.any(Function),
      children: expect.objectContaining({
        props: {
          open: false,
          onClose: expect.any(Function),
          setModalProps: expect.any(Function),
        },
      }),
    }),
  );
});

it('Should disableBackdropClick dialogs props passed in usedModel', () => {
  const Test = () => (
    <div>
      <p>Hello World</p>
    </div>
  );
  const { result } = renderHook(() =>
    useModal(Test, {
      customValues: {
        disableBackdropClick: true,
      },
    }),
  );

  // BackdropClick should be disable: undefined
  expect(result.current[0].props).toEqual(
    expect.objectContaining({
      fullWidth: true,
      open: false,
      onClose: undefined,
      children: expect.objectContaining({
        props: {
          open: false,
          onClose: expect.any(Function),
          setModalProps: expect.any(Function),
        },
      }),
    }),
  );
});
