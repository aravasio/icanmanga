export const overlayStyles = `
  :root {
    --icanmanga-overlay-bg: rgba(10, 12, 16, 0.55);
    --icanmanga-rect-border: #ffb703;
    --icanmanga-rect-hover: #ff3d81;
    --icanmanga-panel-bg: #0f1318;
    --icanmanga-panel-border: #1f2a36;
    --icanmanga-panel-text: #e6edf3;
    --icanmanga-panel-subtext: #9fb0c0;
    --icanmanga-accent: #ffb703;
    --icanmanga-success: #57cc99;
    --icanmanga-error: #ff6b6b;
  }

  .icanmanga-overlay {
    position: fixed;
    inset: 0;
    z-index: 2147483646;
    background: var(--icanmanga-overlay-bg);
    cursor: crosshair;
    user-select: none;
  }

  .icanmanga-overlay * {
    box-sizing: border-box;
  }

  .icanmanga-rect {
    position: absolute;
    border: 2px solid var(--icanmanga-rect-border);
    box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.35);
    border-radius: 6px;
    background: rgba(255, 183, 3, 0.08);
  }

  .icanmanga-rect.hover {
    border-color: var(--icanmanga-rect-hover);
    box-shadow: 0 0 0 2px rgba(255, 61, 129, 0.35);
    background: rgba(255, 61, 129, 0.12);
  }

  .icanmanga-rect-badge {
    position: absolute;
    top: -12px;
    left: -12px;
    background: var(--icanmanga-rect-border);
    color: #0b0f14;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    padding: 4px 8px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
  }

  .icanmanga-preview {
    position: absolute;
    border: 2px dashed #8ecae6;
    border-radius: 6px;
    background: rgba(142, 202, 230, 0.1);
    pointer-events: none;
  }

  .icanmanga-panel {
    position: fixed;
    top: 0;
    right: 0;
    width: 320px;
    height: 100vh;
    z-index: 2147483647;
    background: var(--icanmanga-panel-bg);
    color: var(--icanmanga-panel-text);
    font-family: "Space Grotesk", "Segoe UI", sans-serif;
    display: flex;
    flex-direction: column;
    border-left: 1px solid var(--icanmanga-panel-border);
  }

  .icanmanga-panel-header {
    padding: 16px;
    border-bottom: 1px solid var(--icanmanga-panel-border);
  }

  .icanmanga-panel-title {
    font-size: 16px;
    font-weight: 700;
    margin: 0 0 4px 0;
  }

  .icanmanga-panel-subtitle {
    font-size: 12px;
    color: var(--icanmanga-panel-subtext);
    margin: 0;
  }

  .icanmanga-panel-body {
    flex: 1;
    overflow: auto;
    padding: 12px;
  }

  .icanmanga-row {
    border: 1px solid var(--icanmanga-panel-border);
    border-radius: 10px;
    padding: 10px;
    margin-bottom: 10px;
    background: rgba(255, 255, 255, 0.02);
  }

  .icanmanga-row.hover {
    border-color: var(--icanmanga-rect-hover);
    background: rgba(255, 61, 129, 0.08);
  }

  .icanmanga-row-title {
    font-weight: 700;
    font-size: 13px;
    margin-bottom: 6px;
  }

  .icanmanga-row-status {
    font-size: 12px;
    color: var(--icanmanga-panel-subtext);
    margin-bottom: 8px;
  }

  .icanmanga-text-block {
    background: rgba(0, 0, 0, 0.25);
    border-radius: 8px;
    padding: 8px;
    margin-bottom: 6px;
  }

  .icanmanga-text-block p {
    margin: 0;
    font-size: 12px;
    line-height: 1.4;
    white-space: pre-wrap;
  }

  .icanmanga-actions {
    display: flex;
    gap: 6px;
    margin-top: 6px;
  }

  .icanmanga-button {
    border: 1px solid var(--icanmanga-panel-border);
    background: transparent;
    color: var(--icanmanga-panel-text);
    border-radius: 6px;
    padding: 4px 8px;
    font-size: 11px;
    cursor: pointer;
  }

  .icanmanga-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .icanmanga-toast {
    position: fixed;
    bottom: 24px;
    left: 24px;
    background: #111827;
    color: #f9fafb;
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 12px;
    z-index: 2147483647;
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);
    opacity: 0;
    transform: translateY(10px);
    transition: opacity 0.2s ease, transform 0.2s ease;
  }

  .icanmanga-toast.show {
    opacity: 1;
    transform: translateY(0);
  }

  .icanmanga-toast.error {
    background: #3b0d0d;
    border: 1px solid #ff6b6b;
  }
`

export const optionsStyles = `
  body {
    margin: 0;
    font-family: "Space Grotesk", "Segoe UI", sans-serif;
    background: #0f1318;
    color: #e6edf3;
  }

  .wrap {
    max-width: 520px;
    padding: 24px;
  }

  h1 {
    margin: 0 0 8px;
    font-size: 20px;
  }

  p {
    margin: 0 0 16px;
    color: #9fb0c0;
    font-size: 13px;
  }

  label {
    display: block;
    font-size: 12px;
    margin-bottom: 6px;
  }

  input {
    width: 100%;
    padding: 10px;
    border-radius: 8px;
    border: 1px solid #1f2a36;
    background: #0b0f14;
    color: #e6edf3;
  }

  button {
    margin-top: 12px;
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid #1f2a36;
    background: #ffb703;
    color: #0b0f14;
    font-weight: 700;
    cursor: pointer;
  }

  .status {
    margin-top: 10px;
    font-size: 12px;
    color: #9fb0c0;
  }

  .status.error {
    color: #ff6b6b;
  }

  .status.success {
    color: #57cc99;
  }
`