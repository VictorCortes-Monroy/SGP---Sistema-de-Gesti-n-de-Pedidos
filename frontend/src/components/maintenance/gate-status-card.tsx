import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { GateStatusResponse } from '@/api/types'

interface GateStatusCardProps {
    gate: GateStatusResponse
    isLoading?: boolean
}

interface GatePillProps {
    label: string
    satisfied: boolean
}

function GatePill({ label, satisfied }: GatePillProps) {
    return (
        <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${
            satisfied
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        }`}>
            {satisfied
                ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                : <XCircle className="h-4 w-4 shrink-0" />
            }
            <span>{label}</span>
        </div>
    )
}

export function GateStatusCard({ gate, isLoading }: GateStatusCardProps) {
    if (isLoading) {
        return (
            <Card>
                <CardContent className="flex justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        )
    }

    const allSatisfied = gate.purchase_order_linked && gate.provider_confirmed && gate.transport_scheduled

    return (
        <Card className={allSatisfied ? 'border-green-200 dark:border-green-800' : 'border-orange-200 dark:border-orange-800'}>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                    {allSatisfied ? '✅ Gate de Control: Listo' : '⏳ Gate de Control: Pendiente'}
                </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
                <GatePill label="OC Vinculada" satisfied={gate.purchase_order_linked} />
                <GatePill label="Proveedor Confirmado" satisfied={gate.provider_confirmed} />
                <GatePill label="Transporte Programado" satisfied={gate.transport_scheduled} />
                {!allSatisfied && gate.missing.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                        Faltan {gate.missing.length} condición(es) para iniciar ejecución.
                    </p>
                )}
            </CardContent>
        </Card>
    )
}
