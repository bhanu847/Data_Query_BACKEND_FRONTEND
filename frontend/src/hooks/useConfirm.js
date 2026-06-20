import { useState, useCallback } from "react";

export default function useConfirm() {
  const [state, setState] = useState({ open: false, title: "", message: "", danger: true, resolve: null });

  const confirm = useCallback(({ title, message, danger = true }) => {
    return new Promise((resolve) => {
      setState({ open: true, title, message, danger, resolve });
    });
  }, []);

  const onConfirm = useCallback(() => {
    state.resolve?.(true);
    setState((s) => ({ ...s, open: false }));
  }, [state.resolve]);

  const onCancel = useCallback(() => {
    state.resolve?.(false);
    setState((s) => ({ ...s, open: false }));
  }, [state.resolve]);

  return {
    confirm,
    modalProps: {
      open: state.open,
      title: state.title,
      message: state.message,
      danger: state.danger,
      onConfirm,
      onCancel,
    },
  };
}
