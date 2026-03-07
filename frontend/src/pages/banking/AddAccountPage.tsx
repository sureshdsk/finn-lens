import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createAccountApi } from '@/api/banking'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

const BANKS = [
  { id: 'ICICI', label: 'ICICI Bank', desc: 'XLS statement support' },
  { id: 'IDFC', label: 'IDFC First Bank', desc: 'XLSX statement support' },
  { id: 'OTHER', label: 'Other Bank', desc: 'Manual entry only' },
]

export default function AddAccountPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [selectedBank, setSelectedBank] = useState<string | null>(null)
  const [holderName, setHolderName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')

  const mutation = useMutation({
    mutationFn: createAccountApi,
    onSuccess: (acc) => {
      qc.invalidateQueries({ queryKey: ['banking-accounts'] })
      navigate(`/banking/accounts/${acc.id}`)
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedBank) return
    mutation.mutate({ bank_name: selectedBank, account_holder_name: holderName, account_number: accountNumber })
  }

  return (
    <div className="flex flex-col gap-6 max-w-md">
      <div>
        <button
          onClick={() => navigate('/banking')}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-3"
        >
          ← Banking
        </button>
        <h1 className="text-2xl font-bold tracking-tight">Add Bank Account</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Select your bank and enter account details</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Label>Bank</Label>
          <div className="flex flex-col gap-2">
            {BANKS.map((b) => (
              <Card
                key={b.id}
                className={`cursor-pointer transition-colors ${
                  selectedBank === b.id
                    ? 'border-primary ring-1 ring-primary bg-accent/20'
                    : 'hover:bg-accent/10'
                }`}
                onClick={() => setSelectedBank(b.id)}
              >
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selectedBank === b.id ? 'border-primary' : 'border-muted-foreground'
                    }`}>
                      {selectedBank === b.id && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <div>
                      <CardTitle className="text-sm">{b.label}</CardTitle>
                      <CardDescription className="text-xs mt-0.5">{b.desc}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        <Separator />

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="holder">Account Holder Name</Label>
            <Input
              id="holder"
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="accno">Account Number</Label>
            <Input
              id="accno"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="e.g. 123456789012"
            />
          </div>
        </div>

        {mutation.error && (
          <p className="text-sm text-destructive">{(mutation.error as Error).message}</p>
        )}

        <Button type="submit" disabled={!selectedBank || mutation.isPending} className="w-full">
          {mutation.isPending ? 'Creating…' : 'Create Account'}
        </Button>
      </form>
    </div>
  )
}
