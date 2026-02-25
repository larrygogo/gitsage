import { type Component, createSignal, Show } from "solid-js";
import { Button } from "@/components/ui";
import { useGitHub } from "@/stores/github";
import * as githubService from "@/services/github";

export interface PrReviewPanelProps {
  prNumber: number;
  onClose: () => void;
}

export const PrReviewPanel: Component<PrReviewPanelProps> = (props) => {
  const [ghState] = useGitHub();
  const [body, setBody] = createSignal("");
  const [event, setEvent] = createSignal<"APPROVE" | "REQUEST_CHANGES" | "COMMENT">("COMMENT");
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const handleSubmit = async () => {
    const ghRepo = ghState.ghRepo;
    if (!ghRepo) return;

    // Body is required for REQUEST_CHANGES
    if (event() === "REQUEST_CHANGES" && !body().trim()) {
      setError("请求修改时必须填写说明");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await githubService.createReview(ghRepo.owner, ghRepo.repo, props.prNumber, {
        body: body().trim() || undefined,
        event: event(),
      });
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
        "min-width": "400px",
        "max-width": "500px",
      }}>
        <h3 style={{ margin: "0 0 12px", "font-size": "14px" }}>提交 Review</h3>

        <textarea
          style={{
            width: "100%",
            "min-height": "100px",
            padding: "8px",
            "background-color": "var(--gs-bg-primary)",
            border: "1px solid var(--gs-border-primary)",
            "border-radius": "4px",
            color: "var(--gs-text-primary)",
            "font-size": "13px",
            resize: "vertical",
            outline: "none",
            "font-family": "inherit",
            "box-sizing": "border-box",
            "margin-bottom": "12px",
          }}
          placeholder="留下 Review 评论（可选）..."
          value={body()}
          onInput={(e) => setBody(e.currentTarget.value)}
        />

        <div style={{ display: "flex", "flex-direction": "column", gap: "8px", "margin-bottom": "16px" }}>
          <label style={{ display: "flex", "align-items": "center", gap: "8px", "font-size": "13px", cursor: "pointer" }}>
            <input
              type="radio"
              name="reviewEvent"
              checked={event() === "COMMENT"}
              onChange={() => setEvent("COMMENT")}
            />
            <span>Comment</span>
            <span style={{ "font-size": "11px", color: "var(--gs-text-muted)" }}>— 仅评论，不做批准或请求修改</span>
          </label>
          <label style={{ display: "flex", "align-items": "center", gap: "8px", "font-size": "13px", cursor: "pointer" }}>
            <input
              type="radio"
              name="reviewEvent"
              checked={event() === "APPROVE"}
              onChange={() => setEvent("APPROVE")}
            />
            <span style={{ color: "#1a7f37" }}>Approve</span>
            <span style={{ "font-size": "11px", color: "var(--gs-text-muted)" }}>— 批准此 PR</span>
          </label>
          <label style={{ display: "flex", "align-items": "center", gap: "8px", "font-size": "13px", cursor: "pointer" }}>
            <input
              type="radio"
              name="reviewEvent"
              checked={event() === "REQUEST_CHANGES"}
              onChange={() => setEvent("REQUEST_CHANGES")}
            />
            <span style={{ color: "#cf222e" }}>Request Changes</span>
            <span style={{ "font-size": "11px", color: "var(--gs-text-muted)" }}>— 请求修改后合并</span>
          </label>
        </div>

        <Show when={error()}>
          <div style={{ "font-size": "12px", color: "var(--gs-error-text, #cf222e)", "margin-bottom": "8px" }}>
            {error()}
          </div>
        </Show>

        <div style={{ display: "flex", gap: "8px", "justify-content": "flex-end" }}>
          <Button variant="ghost" size="sm" onClick={props.onClose}>取消</Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} disabled={submitting()}>
            {submitting() ? "提交中..." : "提交 Review"}
          </Button>
        </div>
      </div>
    </div>
  );
};
