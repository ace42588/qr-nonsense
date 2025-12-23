/**
 * Shared message banner component for displaying errors, loading states, and success messages
 */

export function ErrorBanner({ message, title = "Error" }) {
  return (
    <div style={{
      marginBottom: 16,
      padding: 12,
      backgroundColor: '#fee2e2',
      border: '1px solid #ef4444',
      borderRadius: 8,
      color: '#991b1b'
    }}>
      <strong>{title}:</strong> {message}
    </div>
  );
}

export function LoadingBanner({ message, progress }) {
  return (
    <div style={{
      marginBottom: 16,
      padding: 12,
      backgroundColor: '#dbeafe',
      border: '1px solid #3b82f6',
      borderRadius: 8,
      color: '#1e40af',
      textAlign: 'center'
    }}>
      {progress ? `${message} (${progress.current}/${progress.total})` : message}
    </div>
  );
}

export function SuccessBanner({ message, title = "Success" }) {
  return (
    <div style={{
      marginBottom: 16,
      padding: 12,
      backgroundColor: '#dcfce7',
      border: '1px solid #22c55e',
      borderRadius: 8,
      color: '#166534'
    }}>
      <strong>{title}:</strong> {message}
    </div>
  );
}

export function WarningBanner({ message, title = "Warning" }) {
  return (
    <div style={{
      marginBottom: 16,
      padding: 12,
      backgroundColor: '#fef3c7',
      border: '1px solid #f59e0b',
      borderRadius: 8,
      color: '#92400e'
    }}>
      <strong>{title}:</strong> {message}
    </div>
  );
}

