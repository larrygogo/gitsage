import { type Component, createSignal, Show } from "solid-js";
import { Button } from "@/components/ui";
import * as gitService from "@/services/git";

export interface CloneDialogProps {
  open: boolean;
  onClose: () => void;
  onCloneComplete?: (destPath: string) => void;
}

const CloneDialog: Component<CloneDialogProps> = (props) => {
  const [url, setUrl] = createSignal("");
  const [destPath, setDestPath] = createSignal("");
  const [cloning, setCloning] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const handleClone = async () => {
    const repoUrl = url().trim();
    const dest = destPath().trim();
    if (!repoUrl || !dest) return;

    setCloning(true);
    setError(null);
    try {
      await gitService.cloneRepo(repoUrl, dest);
      props.onCloneComplete?.(dest);
      props.onClose();
      setUrl("");
      setDestPath("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCloning(false);
    }
  };

  return (
    <Show when={props.open}>
      <div style={{
        position: "fixed",
        inset: "0",
        display: "flex",
        "align-items": "center",
        "justify-content": "center",
        "background-color": "rgba(0,0,0,0.5)",
        "z-index": "1000",
      }}>
        <div style={{
          width: "480px",
          padding: "24px",
          "background-color": "var(--gs-bg-primary, #fff)",
          "border-radius": "8px",
          "box-shadow": "0 4px 24px rgba(0,0,0,0.2)",
        }}>
          <h2 style={{ margin: "0 0 16px", "font-size": "16px", "font-weight": "600" }}>
            克隆仓库
          </h2>

          <div style={{ display: "flex", "flex-direction": "column", gap: "12px", "margin-bottom": "16px" }}>
            <div>
              <label style={{ display: "block", "font-size": "13px", "font-weight": "500", "margin-bottom": "4px" }}>
                仓库 URL
              </label>
              <input
                style={{
                  width: "100%",
                  height: "34px",
                  padding: "0 10px",
                  "background-color": "var(--gs-bg-primary)",
                  border: "1px solid var(--gs-border-primary)",
                  "border-radius": "4px",
                  color: "var(--gs-text-primary)",
                  "font-size": "13px",
                  outline: "none",
                  "box-sizing": "border-box",
                }}
                placeholder="https://github.com/user/repo.git"
                value={url()}
                onInput={(e) => setUrl(e.currentTarget.value)}
              />
            </div>
            <div>
              <label style={{ display: "block", "font-size": "13px", "font-weight": "500", "margin-bottom": "4px" }}>
                目标路径
              </label>
              <input
                style={{
                  width: "100%",
                  height: "34px",
                  padding: "0 10px",
                  "background-color": "var(--gs-bg-primary)",
                  border: "1px solid var(--gs-border-primary)",
                  "border-radius": "4px",
                  color: "var(--gs-text-primary)",
                  "font-size": "13px",
                  outline: "none",
                  "box-sizing": "border-box",
                }}
                placeholder="/path/to/destination"
                value={destPath()}
                onInput={(e) => setDestPath(e.currentTarget.value)}
              />
            </div>
          </div>

          <Show when={error()}>
            <div style={{
              padding: "8px 12px",
              "margin-bottom": "12px",
              "background-color": "var(--gs-error-bg, #fee)",
              color: "var(--gs-error-text, #dc3545)",
              "border-radius": "4px",
              "font-size": "12px",
            }}>
              {error()}
            </div>
          </Show>

          <div style={{ display: "flex", gap: "8px", "justify-content": "flex-end" }}>
            <Button variant="ghost" size="sm" onClick={props.onClose} disabled={cloning()}>
              取消
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleClone}
              loading={cloning()}
              disabled={!url().trim() || !destPath().trim() || cloning()}
            >
              {cloning() ? "克隆中..." : "克隆"}
            </Button>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default CloneDialog;
