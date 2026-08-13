import { useRef, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface CodeInputProps {
  length?: number
  onComplete: (code: string) => void
  disabled?: boolean
}

export function CodeInput({ length = 6, onComplete, disabled = false }: CodeInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''))
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  const applyDigits = useCallback((raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, length)
    if (!digits) return

    const newValues = Array(length).fill('')
    digits.split('').forEach((char, i) => { newValues[i] = char })
    setValues(newValues)

    if (digits.length === length) {
      onComplete(digits)
    } else {
      inputs.current[digits.length]?.focus()
    }
  }, [length, onComplete])

  const handleChange = useCallback((index: number, value: string) => {
    if (!/^\d*$/.test(value)) return

    // SMS autofill and some browsers deliver the whole code through onChange
    if (value.length > 1) {
      applyDigits(value)
      return
    }

    const newValues = [...values]
    newValues[index] = value.slice(-1)
    setValues(newValues)

    if (value && index < length - 1) {
      inputs.current[index + 1]?.focus()
    }

    const code = newValues.join('')
    if (code.length === length && !newValues.includes('')) {
      onComplete(code)
    }
  }, [values, length, onComplete, applyDigits])

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !values[index] && index > 0) {
      inputs.current[index - 1]?.focus()
    }
  }, [values])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    applyDigits(e.clipboardData.getData('text/plain') || e.clipboardData.getData('text') || '')
  }, [applyDigits])

  return (
    <div className="flex gap-2 justify-center">
      {values.map((value, index) => (
        <input
          key={index}
          ref={(el) => { inputs.current[index] = el }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={length}
          value={value}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className={cn(
            'h-14 w-12 rounded-lg border-2 border-border bg-white text-center text-2xl font-semibold text-text-primary',
            'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20',
            'transition-all duration-150',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            value && 'border-primary/30'
          )}
        />
      ))}
    </div>
  )
}
