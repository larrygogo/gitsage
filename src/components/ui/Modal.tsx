import {
  type JSX,
  type Component,
  Show,
  onMount,
  onCleanup,
  splitProps,
} from "solid-js";
import { Portal } from "solid-js/web";
import styles from "./Modal.module.css";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: JSX.Element;
  footer?: JSX.Element;
  class?: string;
}

const Modal: Component<ModalProps> = (props) => {
  const [local] = splitProps(props, [
    "open",
    "onClose",
    "title",
    "children",
    "footer",
    "class",
  ]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && local.open) {
      local.onClose();
    }
  };

  onMount(() => {
    document.addEventListener("keydown", handleKeyDown);
  });

  onCleanup(() => {
    document.removeEventListener("keydown", handleKeyDown);
  });

  const handleOverlayClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      local.onClose();
    }
  };

  return (
    <Show when={local.open}>
      <Portal>
        <div class={styles.overlay} onClick={handleOverlayClick}>
          <div
            class={`${styles.modal}${local.class ? ` ${local.class}` : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={local.title ? "gs-modal-title" : undefined}
          >
            <Show when={local.title}>
              <div class={styles.header}>
                <h2 id="gs-modal-title" class={styles.title}>
                  {local.title}
                </h2>
                <button
                  class={styles.closeBtn}
                  onClick={() => local.onClose()}
                  aria-label="Close"
                >
                  &#x2715;
                </button>
              </div>
            </Show>
            <div class={styles.body}>{local.children}</div>
            <Show when={local.footer}>
              <div class={styles.footer}>{local.footer}</div>
            </Show>
          </div>
        </div>
      </Portal>
    </Show>
  );
};

export default Modal;
