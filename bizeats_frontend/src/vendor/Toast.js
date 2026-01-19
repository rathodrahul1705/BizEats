import React, { useEffect, useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Info, 
  X 
} from 'lucide-react';
import "../assets/css/vendor/Toast.css";

const Toast = ({ 
  message, 
  type = 'success', 
  duration = 3000, 
  onClose,
  position = 'top-right'
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!duration || duration === 0) return;

    const intervalTime = 50; // Update every 50ms for smooth animation
    const totalSteps = duration / intervalTime;
    const decrement = 100 / totalSteps;

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev <= 0) {
          clearInterval(progressInterval);
          return 0;
        }
        return prev - decrement;
      });
    }, intervalTime);

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        if (onClose) onClose();
      }, 300); // Wait for fade out animation
    }, duration);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      if (onClose) onClose();
    }, 300);
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} />;
      case 'error':
        return <XCircle size={20} />;
      case 'warning':
        return <AlertCircle size={20} />;
      case 'info':
        return <Info size={20} />;
      default:
        return <CheckCircle size={20} />;
    }
  };

  const getTypeClasses = () => {
    switch (type) {
      case 'success':
        return 'toast-success';
      case 'error':
        return 'toast-error';
      case 'warning':
        return 'toast-warning';
      case 'info':
        return 'toast-info';
      default:
        return 'toast-success';
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'toast-top-left';
      case 'top-center':
        return 'toast-top-center';
      case 'top-right':
        return 'toast-top-right';
      case 'bottom-left':
        return 'toast-bottom-left';
      case 'bottom-center':
        return 'toast-bottom-center';
      case 'bottom-right':
        return 'toast-bottom-right';
      default:
        return 'toast-top-right';
    }
  };

  if (!isVisible) return null;

  return (
    <div className={`toast-container ${getPositionClasses()}`}>
      <div className={`toast ${getTypeClasses()} ${isVisible ? 'toast-show' : 'toast-hide'}`}>
        <div className="toast-content">
          <div className="toast-icon">
            {getIcon()}
          </div>
          <div className="toast-message">
            <p className="toast-title">
              {type === 'success' && 'Success!'}
              {type === 'error' && 'Error!'}
              {type === 'warning' && 'Warning!'}
              {type === 'info' && 'Information'}
            </p>
            <p className="toast-text">{message}</p>
          </div>
          <button 
            className="toast-close" 
            onClick={handleClose}
            aria-label="Close notification"
          >
            <X size={18} />
          </button>
        </div>
        {duration > 0 && (
          <div className="toast-progress">
            <div 
              className="toast-progress-bar" 
              style={{ 
                width: `${progress}%`,
                transition: 'width 50ms linear'
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Toast Container Component for managing multiple toasts
export const ToastContainer = ({ toasts, removeToast, position = 'top-right' }) => {
  return (
    <div className={`toast-container ${position}`}>
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          position={toast.position || position}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

// Toast Hook for easy usage
export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success', duration = 3000, position = 'top-right') => {
    const id = Date.now() + Math.random();
    const newToast = { id, message, type, duration, position };
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto remove if duration is set
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration + 300); // Add animation time
    }
    
    return id;
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const success = (message, duration = 3000, position = 'top-right') => {
    return showToast(message, 'success', duration, position);
  };

  const error = (message, duration = 4000, position = 'top-right') => {
    return showToast(message, 'error', duration, position);
  };

  const warning = (message, duration = 3500, position = 'top-right') => {
    return showToast(message, 'warning', duration, position);
  };

  const info = (message, duration = 3000, position = 'top-right') => {
    return showToast(message, 'info', duration, position);
  };

  const clearAll = () => {
    setToasts([]);
  };

  return {
    toasts,
    success,
    error,
    warning,
    info,
    removeToast,
    clearAll,
    ToastContainer: () => <ToastContainer toasts={toasts} removeToast={removeToast} />
  };
};

export default Toast;