import { type Component, type JSX, ErrorBoundary as SolidErrorBoundary } from "solid-js";
import { logger } from "@/utils/logger";
import styles from "./ErrorBoundary.module.css";

export interface AppErrorBoundaryProps {
  children: JSX.Element;
}

const AppErrorBoundary: Component<AppErrorBoundaryProps> = (props) => {
  return (
    <SolidErrorBoundary
      fallback={(err, reset) => {
        logger.error("ErrorBoundary", "未捕获的渲染错误:", err);
        return (
          <div class={styles.container}>
            <div class={styles.icon}>!</div>
            <h2 class={styles.title}>出现了一个错误</h2>
            <p class={styles.message}>{err instanceof Error ? err.message : String(err)}</p>
            <button class={styles.retryBtn} onClick={reset}>
              重试
            </button>
          </div>
        );
      }}
    >
      {props.children}
    </SolidErrorBoundary>
  );
};

export default AppErrorBoundary;
