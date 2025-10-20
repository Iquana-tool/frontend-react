/**
 * WebSocket Status Component
 * 
 * Displays the current WebSocket connection and session status
 * with visual indicators and tooltips.
 */

import React, { useState } from 'react';
import {
  useWebSocketConnectionState,
  useWebSocketSessionState,
  useWebSocketRunningServices,
  useWebSocketFailedServices,
  useWebSocketLastError,
} from '../../stores/selectors/annotationSelectors';
import { Wifi, WifiOff, AlertCircle, CheckCircle, Loader } from 'lucide-react';

const WebSocketStatus = () => {
  const connectionState = useWebSocketConnectionState();
  const sessionState = useWebSocketSessionState();
  const runningServices = useWebSocketRunningServices();
  const failedServices = useWebSocketFailedServices();
  const lastError = useWebSocketLastError();
  
  const [showTooltip, setShowTooltip] = useState(false);

  /**
   * Get status configuration based on connection and session state
   */
  const getStatusConfig = () => {
    // Error states
    if (connectionState === 'error' || sessionState === 'error') {
      return {
        icon: AlertCircle,
        color: 'text-red-500',
        bgColor: 'bg-red-100',
        label: 'Connection Error',
        pulse: false,
      };
    }

    // Connecting states
    if (connectionState === 'connecting' || connectionState === 'reconnecting') {
      return {
        icon: Loader,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-100',
        label: connectionState === 'reconnecting' ? 'Reconnecting...' : 'Connecting...',
        pulse: true,
        spin: true,
      };
    }

    // Initializing session
    if (sessionState === 'initializing') {
      return {
        icon: Loader,
        color: 'text-blue-500',
        bgColor: 'bg-blue-100',
        label: 'Initializing Session...',
        pulse: true,
        spin: true,
      };
    }

    // Connected and ready
    if (connectionState === 'connected' && sessionState === 'ready') {
      return {
        icon: CheckCircle,
        color: 'text-green-500',
        bgColor: 'bg-green-100',
        label: 'Connected',
        pulse: false,
      };
    }

    // Disconnected
    return {
      icon: WifiOff,
      color: 'text-gray-500',
      bgColor: 'bg-gray-100',
      label: 'Disconnected',
      pulse: false,
    };
  };

  const statusConfig = getStatusConfig();
  const Icon = statusConfig.icon;

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Status Indicator */}
      <div
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg
          ${statusConfig.bgColor} ${statusConfig.color}
          transition-all duration-200
          cursor-help
        `}
      >
        <Icon
          size={16}
          className={`
            ${statusConfig.spin ? 'animate-spin' : ''}
            ${statusConfig.pulse ? 'animate-pulse' : ''}
          `}
        />
        <span className="text-sm font-medium hidden sm:inline">
          {statusConfig.label}
        </span>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute top-full right-0 mt-2 w-72 z-50">
          <div className="bg-gray-900 text-white text-sm rounded-lg shadow-xl p-4">
            {/* Arrow */}
            <div className="absolute -top-2 right-4 w-4 h-4 bg-gray-900 transform rotate-45"></div>
            
            {/* Content */}
            <div className="relative">
              <div className="font-semibold mb-2">WebSocket Status</div>
              
              <div className="space-y-2 text-gray-300">
                <div className="flex justify-between">
                  <span>Connection:</span>
                  <span className={statusConfig.color}>{connectionState}</span>
                </div>
                <div className="flex justify-between">
                  <span>Session:</span>
                  <span className={statusConfig.color}>{sessionState}</span>
                </div>

                {runningServices.length > 0 && (
                  <>
                    <div className="border-t border-gray-700 my-2 pt-2">
                      <div className="font-medium mb-1 text-white">Running Services:</div>
                      <ul className="text-xs space-y-1">
                        {runningServices.map(service => (
                          <li key={service} className="flex items-center gap-1">
                            <CheckCircle size={12} className="text-green-400" />
                            {service}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

                {failedServices.length > 0 && (
                  <>
                    <div className="border-t border-gray-700 my-2 pt-2">
                      <div className="font-medium mb-1 text-white">Failed Services:</div>
                      <ul className="text-xs space-y-1">
                        {failedServices.map(service => (
                          <li key={service} className="flex items-center gap-1">
                            <AlertCircle size={12} className="text-red-400" />
                            {service}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

                {lastError && (
                  <>
                    <div className="border-t border-gray-700 my-2 pt-2">
                      <div className="font-medium mb-1 text-red-400">Error:</div>
                      <p className="text-xs">{lastError}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebSocketStatus;


