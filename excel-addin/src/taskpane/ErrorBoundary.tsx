import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// Without this, an uncaught render error anywhere in the tree unmounts the
// whole app and leaves the task pane blank with no way to recover short of
// closing and reopening the add-in. Catch it and offer a reset instead.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("DataQuery AI task pane crashed:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="dq-signin">
          <div className="dq-logo">DataQuery AI</div>
          <p className="dq-error">Something went wrong: {this.state.error.message}</p>
          <button className="dq-btn-primary" onClick={() => this.setState({ error: null })}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
