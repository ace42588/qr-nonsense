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

export function InvalidQRBanner({ message }) {
  return (
    <div
      role="status"
      style={{
        marginBottom: 12,
        padding: 12,
        backgroundColor: '#fef3c7',
        border: '1px solid #f59e0b',
        borderRadius: 8,
        color: '#92400e',
      }}
    >
      <strong>Invalid QR</strong>
      <div style={{ marginTop: 4 }}>
        {message || "Current settings produce a QR code that may not scan."}
      </div>
      <div style={{ marginTop: 4, fontSize: 12 }}>
        Generation is still allowed.
      </div>
    </div>
  );
}

export function InvalidQRBadge() {
  return (
    <span
      title="Current settings produce a QR code that may not scan"
      style={{
        marginLeft: 8,
        padding: '1px 6px',
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
        borderRadius: 4,
        backgroundColor: '#f59e0b',
        color: '#1c1917',
      }}
    >
      Invalid QR
    </span>
  );
}

