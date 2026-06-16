import React from 'react'

export default function AssistPanel({
  isOpen,
  onClose,
  suggestions = [],
  setSuggestions,
  onApplySuggestion,
  isLoading = false
}) {
  const getSeverityBadgeClass = (severity) => {
    switch (severity) {
      case 'critical': return 'badge-critical'
      case 'warning': return 'badge-warning'
      case 'info':
      default: return 'badge-info'
    }
  }

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return '🛑'
      case 'warning': return '⚠️'
      case 'info':
      default: return '💡'
    }
  }

  const handleDismiss = (index) => {
    if (setSuggestions) {
      setSuggestions(prev => prev.filter((_, i) => i !== index))
    }
  }

  const handleApply = (suggestion, index) => {
    if (onApplySuggestion && suggestion.suggestedComponent) {
      onApplySuggestion(suggestion.suggestedComponent)
      handleDismiss(index)
    }
  }

  if (!isOpen) return null

  return (
    <div className={`assist-panel-drawer ${isOpen ? 'open' : ''}`}>
      <div className="assist-panel-header">
        <div className="header-info">
          <h3>Architecture Assistant</h3>
          <span className="element-badge">Design Check</span>
        </div>
        <button className="btn-close" onClick={onClose} title="Close Assistant Panel">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="assist-panel-body">
        {isLoading ? (
          <div className="assist-loading-state">
            <div className="loader-ai"></div>
            <span>Analyzing architecture diagram...</span>
            <div className="skeleton-cards-container">
              <div className="skeleton-card"></div>
              <div className="skeleton-card"></div>
            </div>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="assist-empty-state">
            <div className="success-icon-container">🎉</div>
            <h4>All Clear!</h4>
            <p>No architectural design issues or missing service components were identified. Excellent diagram layout!</p>
          </div>
        ) : (
          <div className="suggestions-list">
            <p className="assist-summary">
              Found <strong>{suggestions.length}</strong> recommendations to improve your system architecture:
            </p>
            {suggestions.map((suggestion, index) => (
              <div key={index} className={`suggestion-card ${suggestion.severity}`}>
                <div className="card-header">
                  <span className={`severity-badge ${getSeverityBadgeClass(suggestion.severity)}`}>
                    <span className="badge-icon">{getSeverityIcon(suggestion.severity)}</span>
                    <span className="badge-text">{suggestion.severity.toUpperCase()}</span>
                  </span>
                  <span className="suggestion-type">{suggestion.type.replace('_', ' ')}</span>
                </div>
                <div className="card-message">
                  {suggestion.message}
                </div>
                {suggestion.suggestedComponent && (
                  <div className="card-suggestion-action">
                    <span className="suggestion-preview">
                      Recommendation: Add <strong>{suggestion.suggestedComponent.label}</strong> ({suggestion.suggestedComponent.type})
                    </span>
                    <div className="action-buttons">
                      <button 
                        className="btn btn-secondary btn-xs btn-dismiss" 
                        onClick={() => handleDismiss(index)}
                      >
                        Dismiss
                      </button>
                      <button 
                        className="btn btn-primary btn-xs btn-apply" 
                        onClick={() => handleApply(suggestion, index)}
                      >
                        Apply Suggestion
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="assist-panel-footer">
        <p className="footer-hint">Rules check updates dynamically as components are added and labeled.</p>
      </div>
    </div>
  )
}
