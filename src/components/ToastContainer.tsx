"use client"

import { useState, useEffect } from "react"
import Toast, { type ToastProps } from "./toast-notification"

export interface ToastItem extends ToastProps {
  id: string
}

const ToastContainer = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  // Listen for custom events to add toasts
  useEffect(() => {
    const handleAddToast = (event: CustomEvent<ToastProps>) => {
      const { message, type, duration } = event.detail

      const newToast: ToastItem = {
        id: Date.now().toString(),
        message,
        type,
        duration,
      }

      setToasts((prevToasts) => [...prevToasts, newToast])
    }

    // Add event listener
    window.addEventListener("addToast" as any, handleAddToast as EventListener)

    // Clean up
    return () => {
      window.removeEventListener("addToast" as any, handleAddToast as EventListener)
    }
  }, [])

  const removeToast = (id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id))
  }

  return (
    <div className="fixed top-0 right-0 p-4 z-50 flex flex-col space-y-4 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </div>
  )
}

export default ToastContainer
