"use client"

import { useState, useEffect } from "react"

export interface ToastProps {
  message: string
  type?: "success" | "info" | "warning" | "error"
  duration?: number
  onClose?: () => void
}

const Toast = ({ message, type = "info", duration = 5000, onClose }: ToastProps) => {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      if (onClose) {
        setTimeout(onClose, 300) // Allow animation to complete before removing
      }
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const getTypeStyles = () => {
    switch (type) {
      case "success":
        return "bg-green-800 border-green-600 text-green-200"
      case "warning":
        return "bg-yellow-800 border-yellow-600 text-yellow-200"
      case "error":
        return "bg-red-800 border-red-600 text-red-200"
      case "info":
      default:
        return "bg-purple-800 border-purple-600 text-purple-200"
    }
  }

  const getIcon = () => {
    switch (type) {
      case "success":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        )
      case "warning":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        )
      case "error":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
      case "info":
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )
    }
  }

  return (
    <div
      className={`fixed top-4 right-4 z-50 flex items-center p-4 mb-4 max-w-xs rounded-lg shadow-lg border ${getTypeStyles()} transition-all duration-300 transform ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
      role="alert"
    >
      <div className="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg">{getIcon()}</div>
      <div className="ml-3 text-sm font-normal">{message}</div>
      <button
        type="button"
        className="ml-auto -mx-1.5 -my-1.5 rounded-lg p-1.5 inline-flex items-center justify-center h-8 w-8 hover:bg-gray-700 hover:text-white"
        onClick={() => {
          setIsVisible(false)
          if (onClose) {
            setTimeout(onClose, 300)
          }
        }}
      >
        <span className="sr-only">Close</span>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

export default Toast
