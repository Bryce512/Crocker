// Error Boundary Component for React Error Handling
import React, { Component, ReactNode } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { colors } from "../theme/colors";
import AppErrorService from "../services/errorService";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackComponent?: (error: Error, resetError: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log the error
    AppErrorService.logError(
      AppErrorService.createError("unknown/error" as any, error.message, error),
      "ErrorBoundary"
    );

    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback component if provided
      if (this.props.fallbackComponent && this.state.error) {
        return this.props.fallbackComponent(this.state.error, this.resetError);
      }

      // Default error UI
      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title}>Oops! Something went wrong</Text>
            <Text style={styles.message}>
              We're sorry, but something unexpected happened. The app has
              encountered an error.
            </Text>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={this.resetError}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>

            {__DEV__ && this.state.error && (
              <View style={styles.debugSection}>
                <Text style={styles.debugTitle}>Debug Information:</Text>
                <Text style={styles.debugText}>
                  {this.state.error.name}: {this.state.error.message}
                </Text>
                {this.state.error.stack && (
                  <Text style={styles.debugStack}>
                    {this.state.error.stack}
                  </Text>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.gray[900],
    marginBottom: 16,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    color: colors.gray[600],
    marginBottom: 32,
    textAlign: "center",
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  debugSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: colors.red[500] + "10", // Add transparency
    borderRadius: 8,
    width: "100%",
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.red[500],
    marginBottom: 8,
  },
  debugText: {
    fontSize: 14,
    color: colors.red[500],
    marginBottom: 8,
    fontFamily: "monospace",
  },
  debugStack: {
    fontSize: 12,
    color: colors.red[500],
    fontFamily: "monospace",
    opacity: 0.8,
  },
});

export default ErrorBoundary;
