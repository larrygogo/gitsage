import { type Component, createSignal, Show, For, onMount } from "solid-js";
import { Button } from "@/components/ui";
import { useGitHub } from "@/stores/github";
import * as githubService from "@/services/github";
import { logger } from "@/utils/logger";
import type { PrComment, PrReview } from "@/types";

export interface PrConversationProps {
  prNumber: number;
}

type TimelineItem = { type: "comment"; data: PrComment } | { type: "review"; data: PrReview };

export const PrConversation: Component<PrConversationProps> = (props) => {
  const [ghState] = useGitHub();
  const [items, setItems] = createSignal<TimelineItem[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [commentText, setCommentText] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);

  const loadTimeline = async () => {
    const ghRepo = ghState.ghRepo;
    if (!ghRepo) return;

    setLoading(true);
    try {
      const [comments, reviews] = await Promise.all([
        githubService.listComments(ghRepo.owner, ghRepo.repo, props.prNumber),
        githubService.listReviews(ghRepo.owner, ghRepo.repo, props.prNumber),
      ]);

      const timeline: TimelineItem[] = [
        ...comments.map((c) => ({ type: "comment" as const, data: c })),
        ...reviews
          .filter((r) => r.state !== "PENDING")
          .map((r) => ({ type: "review" as const, data: r })),
      ];

      // Sort by date
      timeline.sort((a, b) => {
        const dateA = a.type === "comment" ? a.data.created_at : (a.data.submitted_at ?? "");
        const dateB = b.type === "comment" ? b.data.created_at : (b.data.submitted_at ?? "");
        return dateA.localeCompare(dateB);
      });

      setItems(timeline);
    } catch (err) {
      logger.error("PrConversation", "加载失败:", err);
    } finally {
      setLoading(false);
    }
  };

  onMount(loadTimeline);

  const handleSubmitComment = async () => {
    const ghRepo = ghState.ghRepo;
    if (!ghRepo || !commentText().trim()) return;

    setSubmitting(true);
    try {
      await githubService.createComment(
        ghRepo.owner,
        ghRepo.repo,
        props.prNumber,
        commentText().trim(),
      );
      setCommentText("");
      await loadTimeline();
    } catch (err) {
      logger.error("PrConversation", "发表评论失败:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const reviewStateLabel = (state: string) => {
    switch (state) {
      case "APPROVED":
        return { text: "已批准", color: "#1a7f37", bg: "#dafbe1" };
      case "CHANGES_REQUESTED":
        return { text: "请求修改", color: "#cf222e", bg: "#ffebe9" };
      case "COMMENTED":
        return { text: "已评论", color: "#656d76", bg: "#f6f8fa" };
      default:
        return { text: state, color: "#656d76", bg: "#f6f8fa" };
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("zh-CN");
  };

  return (
    <div style={{ display: "flex", "flex-direction": "column", gap: "12px" }}>
      {/* PR 描述 */}
      <Show when={ghState.currentPull?.body}>
        <div
          style={{
            padding: "12px",
            "background-color": "var(--gs-bg-secondary)",
            "border-radius": "6px",
            border: "1px solid var(--gs-border-secondary)",
          }}
        >
          <div
            style={{ "font-size": "12px", color: "var(--gs-text-muted)", "margin-bottom": "6px" }}
          >
            {ghState.currentPull!.user.login} 创建了此 PR
          </div>
          <pre
            style={{
              "font-size": "13px",
              "white-space": "pre-wrap",
              "word-break": "break-word",
              margin: "0",
              color: "var(--gs-text-primary)",
            }}
          >
            {ghState.currentPull!.body}
          </pre>
        </div>
      </Show>

      <Show when={loading()}>
        <div
          style={{
            "font-size": "13px",
            color: "var(--gs-text-muted)",
            "text-align": "center",
            padding: "16px",
          }}
        >
          加载评论中...
        </div>
      </Show>

      {/* Timeline */}
      <For each={items()}>
        {(item) => (
          <div
            style={{
              padding: "10px 12px",
              "background-color": "var(--gs-bg-primary)",
              "border-radius": "6px",
              border: "1px solid var(--gs-border-secondary)",
            }}
          >
            <Show when={item.type === "comment"}>
              {(() => {
                const comment = item.data as PrComment;
                return (
                  <>
                    <div
                      style={{
                        display: "flex",
                        "align-items": "center",
                        gap: "8px",
                        "margin-bottom": "6px",
                      }}
                    >
                      <img
                        src={comment.user.avatar_url}
                        style={{ width: "20px", height: "20px", "border-radius": "50%" }}
                        alt={comment.user.login}
                      />
                      <span
                        style={{
                          "font-size": "12px",
                          "font-weight": "500",
                          color: "var(--gs-text-primary)",
                        }}
                      >
                        {comment.user.login}
                      </span>
                      <span style={{ "font-size": "11px", color: "var(--gs-text-muted)" }}>
                        {formatDate(comment.created_at)}
                      </span>
                    </div>
                    <div
                      style={{
                        "font-size": "13px",
                        "white-space": "pre-wrap",
                        "word-break": "break-word",
                        color: "var(--gs-text-primary)",
                      }}
                    >
                      {comment.body}
                    </div>
                  </>
                );
              })()}
            </Show>
            <Show when={item.type === "review"}>
              {(() => {
                const review = item.data as PrReview;
                const label = reviewStateLabel(review.state);
                return (
                  <>
                    <div
                      style={{
                        display: "flex",
                        "align-items": "center",
                        gap: "8px",
                        "margin-bottom": "4px",
                      }}
                    >
                      <img
                        src={review.user.avatar_url}
                        style={{ width: "20px", height: "20px", "border-radius": "50%" }}
                        alt={review.user.login}
                      />
                      <span
                        style={{
                          "font-size": "12px",
                          "font-weight": "500",
                          color: "var(--gs-text-primary)",
                        }}
                      >
                        {review.user.login}
                      </span>
                      <span
                        style={{
                          "font-size": "11px",
                          padding: "1px 8px",
                          "border-radius": "10px",
                          "background-color": label.bg,
                          color: label.color,
                        }}
                      >
                        {label.text}
                      </span>
                      <Show when={review.submitted_at}>
                        <span style={{ "font-size": "11px", color: "var(--gs-text-muted)" }}>
                          {formatDate(review.submitted_at!)}
                        </span>
                      </Show>
                    </div>
                    <Show when={review.body}>
                      <div
                        style={{
                          "font-size": "13px",
                          "white-space": "pre-wrap",
                          color: "var(--gs-text-primary)",
                        }}
                      >
                        {review.body}
                      </div>
                    </Show>
                  </>
                );
              })()}
            </Show>
          </div>
        )}
      </For>

      {/* 评论输入 */}
      <div
        style={{
          display: "flex",
          "flex-direction": "column",
          gap: "8px",
          padding: "12px",
          "background-color": "var(--gs-bg-secondary)",
          "border-radius": "6px",
          border: "1px solid var(--gs-border-secondary)",
        }}
      >
        <textarea
          style={{
            width: "100%",
            "min-height": "80px",
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
          }}
          placeholder="留下评论..."
          value={commentText()}
          onInput={(e) => setCommentText(e.currentTarget.value)}
        />
        <div style={{ display: "flex", "justify-content": "flex-end" }}>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmitComment}
            disabled={submitting() || !commentText().trim()}
          >
            {submitting() ? "提交中..." : "发表评论"}
          </Button>
        </div>
      </div>
    </div>
  );
};
