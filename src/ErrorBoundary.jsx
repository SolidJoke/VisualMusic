import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: "red", padding: "20px", background: "black", whiteSpace: "pre-wrap", zIndex: 9999, position: "relative" }}>
          <h1>Something went wrong.</h1>
          <p>{this.state.error?.toString()}</p>
          <p>{this.state.errorInfo?.componentStack}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
