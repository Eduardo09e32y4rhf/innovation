import * as React from "react"

interface TabsContextValue {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined)

export function Tabs({ 
  defaultValue, 
  value, 
  onValueChange, 
  children, 
  className = '' 
}: { 
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  className?: string
}) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue || '')
  
  const isControlled = value !== undefined
  const currentValue = isControlled ? value : uncontrolledValue
  
  const handleValueChange = React.useCallback((newValue: string) => {
    if (!isControlled) {
      setUncontrolledValue(newValue)
    }
    onValueChange?.(newValue)
  }, [isControlled, onValueChange])

  return (
    <TabsContext.Provider value={{ value: currentValue, onValueChange: handleValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ children, className = '' }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`tabs-list ${className}`}>{children}</div>
}

export function TabsTrigger({ value, children, className = '' }: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) {
  const context = React.useContext(TabsContext)
  if (!context) throw new Error('TabsTrigger must be used within Tabs')
  
  const isActive = context.value === value

  return (
    <button
      type="button"
      className={`tab-item ${className}`}
      data-state={isActive ? 'active' : 'inactive'}
      onClick={() => context.onValueChange(value)}
    >
      {children}
    </button>
  )
}

export function TabsContent({ value, children, className = '' }: React.HTMLAttributes<HTMLDivElement> & { value: string }) {
  const context = React.useContext(TabsContext)
  if (!context) throw new Error('TabsContent must be used within Tabs')
  
  if (context.value !== value) return null
  
  return <div className={className} data-state="active">{children}</div>
}
