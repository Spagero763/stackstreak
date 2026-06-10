import { Component } from "react";

// Catches a render crash in any game view and shows a friendly retry card
// instead of white-screening the whole arcade. `resetKey` (the active tab id)
// auto-clears the error when the player switches games.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="crash-card">
        <h2>This game hit a snag</h2>
        <p className="muted">
          Nothing is lost — your stats and streaks live on-chain, not in this
          page.
        </p>
        <button className="btn" onClick={() => this.setState({ error: null })}>
          Try again
        </button>
      </div>
    );
  }
}
