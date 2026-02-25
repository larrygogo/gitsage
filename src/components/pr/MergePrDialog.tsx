import { type Component, createSignal, Show } from "solid-js";
import { Button } from "@/components/ui";
import { useGitHub } from "@/stores/github";
import * as githubService from "@/services/github";

export interface MergePrDialogProps {
  prNumber: number;
  onClose: () => void;
}

export const MergePrDialog: Component<MergePrDialogProps> = (props) => {
  const [ghState, ghActions] = useGitHub();
  const [method, setMethod] = createSignal<"merge" | "squash" | "rebase">("merge");
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const handleMerge = async () => {
    const ghRepo = ghState.ghRepo;
    if (!ghRepo) return;

    setSubmitting(true);
    setError(null);
    try {
      await githubService.mergePull(ghRepo.owner, ghRepo.repo, props.prNumber, {
        merge_method: method(),
      });
      await ghActions.loadPulls();
      ghActions.clearCurrentPull();
      props.onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
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
        padding: "20px",
        "background-color": "var(--gs-bg-primary, #fff)",
        "border-radius": "8px",
        "box-shadow": "0 4px 12px rgba(0,0,0,0.2)",
        "min-width": "360px",
      }}>
        <h3 style={{ margin: "0 0 12px", "font-size": "14px" }}>合并 Pull Request #{props.prNumber}</h3>

        <div style={{ display: "flex", "flex-direction": "column", gap: "8px", "margin-bottom": "16px" }}>
          <label style={{ display: "flex", "align-items": "center", gap: "8px", "font-size": "13px", cursor: "pointer" }}>
            <input
              type="radio"
              name="mergeMethod"
              checked={method() === "merge"}
              onChange={() => setMethod("merge")}
            />
            <div>
              <div style={{ "font-weight": "500" }}>Create a merge commit</div>
              <div style={{ "font-size": "11px", color: "var(--gs-text-muted)" }}>
                所有提交将保留并添加一个合并提交
              </div>
            </div>
          </label>
          <label style={{ display: "flex", "align-items": "center", gap: "8px", "font-size": "13px", cursor: "pointer" }}>
            <input
              type="radio"
              name="mergeMethod"
              checked={method() === "squash"}
              onChange={() => setMethod("squash")}
            />
            <div>
              <div style={{ "font-weight": "500" }}>Squash and merge</div>
              <div style={{ "font-size": "11px", color: "var(--gs-text-muted)" }}>
                所有提交将被压缩为一个提交
              </div>
            </div>
          </label>
          <label style={{ display: "flex", "align-items": "center", gap: "8px", "font-size": "13px", cursor: "pointer" }}>
            <input
              type="radio"
              name="mergeMethod"
              checked={method() === "rebase"}
              onChange={() => setMethod("rebase")}
            />
            <div>
              <div style={{ "font-weight": "500" }}>Rebase and merge</div>
              <div style={{ "font-size": "11px", color: "var(--gs-text-muted)" }}>
                所有提交将被变基到目标分支
              </div>
            </div>
          </label>
        </div>

        <Show when={error()}>
          <div style={{ "font-size": "12px", color: "var(--gs-error-text, #cf222e)", "margin-bottom": "8px" }}>
            {error()}
          </div>
        </Show>

        <div style={{ display: "flex", gap: "8px", "justify-content": "flex-end" }}>
          <Button variant="ghost" size="sm" onClick={props.onClose}>取消</Button>
          <Button variant="primary" size="sm" onClick={handleMerge} disabled={submitting()}>
            {submitting() ? "合并中..." : "确认合并"}
          </Button>
        </div>
      </div>
    </div>
  );
};
