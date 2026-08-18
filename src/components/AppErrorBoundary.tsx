import React from "react";

type AppErrorBoundaryProps = {
  children: React.ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
  errorMessage: string;
};

export default class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
    errorMessage: "",
  };

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Keep the UI alive while preserving a diagnostic trail for local support.
    console.error("[AXIS UI ERROR]", error, errorInfo.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, errorMessage: "" });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main
        dir="rtl"
        lang="ar"
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "2rem",
          background: "#09090b",
          color: "#fafafa",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <section
          role="alert"
          style={{
            width: "min(100%, 560px)",
            border: "1px solid #3f3f46",
            borderRadius: "16px",
            padding: "2rem",
            background: "#18181b",
            textAlign: "center",
            boxShadow: "0 20px 60px rgba(0,0,0,.35)",
          }}
        >
          <h1 style={{ margin: "0 0 .75rem", color: "#fbbf24", fontSize: "1.35rem" }}>
            حدث خطأ في هذه الشاشة
          </h1>
          <p style={{ margin: "0 0 1.25rem", color: "#d4d4d8", lineHeight: 1.8 }}>
            لم يتم حذف بياناتك. أعد تحميل الشاشة، وإذا تكرر الخطأ احتفظ بنسخة من سجل الأخطاء قبل التواصل مع الدعم.
          </p>
          {this.state.errorMessage ? (
            <pre
              style={{
                overflowX: "auto",
                margin: "0 0 1.25rem",
                padding: ".75rem",
                borderRadius: "8px",
                background: "#09090b",
                color: "#fca5a5",
                direction: "ltr",
                textAlign: "left",
                fontSize: ".75rem",
              }}
            >
              {this.state.errorMessage}
            </pre>
          ) : null}
          <button
            type="button"
            onClick={this.handleReload}
            style={{
              border: 0,
              borderRadius: "10px",
              padding: ".7rem 1.25rem",
              background: "#d97706",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            إعادة تحميل البرنامج
          </button>
        </section>
      </main>
    );
  }
}
