import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { Loader2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { useAuthStore } from '@/stores/auth-store'
import {
    useSubmitMaintRequest,
    useApproveMaintRequest,
    useRejectMaintRequest,
    useConfirmProvider,
    useScheduleTransport,
    useStartExecution,
    useConfirmWorkshopArrival,
    useCompleteExecution,
    useSubmitReception,
    useUploadCertificate,
    useConfirmFieldReturn,
    useCloseMaintRequest,
    useRegisterQuotation,
    useSignD5,
    useRegisterInvoice,
    useConfirmPayment,
} from '@/hooks/use-maintenance'
import type { MaintRequestResponse, MaintRequestStatus, ReceptionPayload } from '@/api/types'

// ── Role helpers ──
const CHIEF_ROLES = ['Admin', 'maintenance_chief']
const MAINT_ROLES = ['Admin', 'maintenance_chief', 'maintenance_planner']
const PURCHASING_ROLES = ['Admin', 'purchasing']
const FINANCE_ROLES = ['Admin', 'finance']
const ALL_MAINT_ROLES = ['Admin', 'maintenance_chief', 'maintenance_planner', 'purchasing', 'finance']

function hasRole(roleName: string | null | undefined, allowed: string[]) {
    return allowed.includes(roleName ?? '')
}

// ── Checklist items definition ──
const CHECKLIST_ITEMS = {
    scope_verification: [
        { key: 'completed_work_matches_order', label: 'Trabajo completado coincide con OT' },
        { key: 'all_required_work_done', label: 'Todo el trabajo requerido fue ejecutado' },
        { key: 'no_unauthorized_work', label: 'Sin trabajos no autorizados' },
    ],
    equipment_condition: [
        { key: 'no_external_damage', label: 'Sin daños externos visibles' },
        { key: 'all_fluids_checked', label: 'Fluidos inspeccionados' },
        { key: 'cleanliness_acceptable', label: 'Limpieza aceptable' },
        { key: 'operating_hours_recorded', label: 'Horómetro registrado' },
    ],
    operational_tests: [
        { key: 'engine_starts_normally', label: 'Motor arranca normalmente' },
        { key: 'no_oil_leaks', label: 'Sin fugas de aceite' },
        { key: 'no_fluid_leaks', label: 'Sin fugas de fluidos' },
        { key: 'systems_functional', label: 'Sistemas operativos correctos' },
    ],
    provider_documentation: [
        { key: 'service_report_provided', label: 'Informe de servicio entregado' },
        { key: 'parts_list_provided', label: 'Lista de repuestos entregada' },
        { key: 'warranty_documentation', label: 'Documentación de garantía' },
    ],
}

type ChecklistState = {
    scope_verification: Record<string, boolean>
    equipment_condition: Record<string, boolean>
    operational_tests: Record<string, boolean>
    provider_documentation: Record<string, boolean>
}

function buildInitialChecklist(): ChecklistState {
    return {
        scope_verification: Object.fromEntries(CHECKLIST_ITEMS.scope_verification.map(i => [i.key, false])),
        equipment_condition: Object.fromEntries(CHECKLIST_ITEMS.equipment_condition.map(i => [i.key, false])),
        operational_tests: Object.fromEntries(CHECKLIST_ITEMS.operational_tests.map(i => [i.key, false])),
        provider_documentation: Object.fromEntries(CHECKLIST_ITEMS.provider_documentation.map(i => [i.key, false])),
    }
}

// ── Simple confirm dialog ──
interface ConfirmDialogProps {
    open: boolean
    onOpenChange: (v: boolean) => void
    title: string
    description?: string
    onConfirm: () => void
    isPending?: boolean
    confirmLabel?: string
    variant?: 'default' | 'destructive'
}

function ConfirmDialog({ open, onOpenChange, title, description, onConfirm, isPending, confirmLabel = 'Confirmar', variant = 'default' }: ConfirmDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description && <DialogDescription>{description}</DialogDescription>}
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancelar</Button>
                    <Button variant={variant} onClick={onConfirm} disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ── Main component ──
interface SmActionsProps {
    request: MaintRequestResponse
}

export function SmActions({ request }: SmActionsProps) {
    const user = useAuthStore((s) => s.user)
    const roleName = user?.role_name ?? ''
    const status: MaintRequestStatus = request.status

    // Dialog open states
    const [openSubmit, setOpenSubmit] = useState(false)
    const [openApprove, setOpenApprove] = useState(false)
    const [openReject, setOpenReject] = useState(false)
    const [openConfirmProvider, setOpenConfirmProvider] = useState(false)
    const [openSchedule, setOpenSchedule] = useState(false)
    const [openLinkPO, setOpenLinkPO] = useState(false)
    const [openStart, setOpenStart] = useState(false)
    const [openArrive, setOpenArrive] = useState(false)
    const [openComplete, setOpenComplete] = useState(false)
    const [openReception, setOpenReception] = useState(false)
    const [openFieldReturn, setOpenFieldReturn] = useState(false)
    const [openClose, setOpenClose] = useState(false)
    const [openQuotation, setOpenQuotation] = useState(false)
    const [openSignD5, setOpenSignD5] = useState(false)
    const [openInvoice, setOpenInvoice] = useState(false)
    const [openPayment, setOpenPayment] = useState(false)

    // Form state
    const [rejectReason, setRejectReason] = useState('')
    const [poCode, setPoCode] = useState('')
    const [scheduleDate, setScheduleDate] = useState('')
    const [scheduleOrigin, setScheduleOrigin] = useState('')
    const [scheduleDest, setScheduleDest] = useState('')
    const [invoiceNumber, setInvoiceNumber] = useState('')
    const [invoiceAmount, setInvoiceAmount] = useState('')
    const [quotationAmount, setQuotationAmount] = useState('')
    const [quotationNotes, setQuotationNotes] = useState('')
    const [d5Notes, setD5Notes] = useState('')
    const [paymentNotes, setPaymentNotes] = useState('')
    const [receptionStatus, setReceptionStatus] = useState<'APPROVED' | 'REJECTED'>('APPROVED')
    const [receptionNotes, setReceptionNotes] = useState('')
    const [checklist, setChecklist] = useState<ChecklistState>(buildInitialChecklist())
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Mutations
    const submit = useSubmitMaintRequest()
    const approve = useApproveMaintRequest()
    const reject = useRejectMaintRequest()
    const confirmProvider = useConfirmProvider()
    const scheduleTransport = useScheduleTransport()
    const startExec = useStartExecution()
    const confirmArrive = useConfirmWorkshopArrival()
    const completeExec = useCompleteExecution()
    const submitReception = useSubmitReception()
    const uploadCert = useUploadCertificate()
    const confirmReturn = useConfirmFieldReturn()
    const closeReq = useCloseMaintRequest()
    const registerQuotation = useRegisterQuotation()
    const signD5 = useSignD5()
    const registerInvoice = useRegisterInvoice()
    const confirmPayment = useConfirmPayment()

    // ── Action handlers ──
    const handleSubmit = () => {
        submit.mutate(request.id, {
            onSuccess: () => { toast.success('SM enviada a aprobación'); setOpenSubmit(false) },
            onError: () => toast.error('Error al enviar'),
        })
    }

    const handleApprove = () => {
        approve.mutate({ id: request.id }, {
            onSuccess: () => { toast.success('SM aprobada'); setOpenApprove(false) },
            onError: () => toast.error('Error al aprobar'),
        })
    }

    const handleReject = () => {
        reject.mutate({ id: request.id, reason: rejectReason }, {
            onSuccess: () => { toast.success('SM rechazada'); setOpenReject(false); setRejectReason('') },
            onError: () => toast.error('Error al rechazar'),
        })
    }

    const handleConfirmProvider = () => {
        confirmProvider.mutate(request.id, {
            onSuccess: () => { toast.success('Proveedor confirmado'); setOpenConfirmProvider(false) },
            onError: () => toast.error('Error al confirmar proveedor'),
        })
    }

    const handleScheduleTransport = () => {
        scheduleTransport.mutate({
            id: request.id,
            payload: {
                scheduled_date: scheduleDate,
                origin: scheduleOrigin,
                destination: scheduleDest,
                trip_type: 'OUTBOUND',
            },
        }, {
            onSuccess: () => { toast.success('Transporte programado'); setOpenSchedule(false) },
            onError: () => toast.error('Error al programar transporte'),
        })
    }

    const handleLinkPO = () => {
        import('@/api/maintenance').then(({ linkPurchaseOrder }) => {
            linkPurchaseOrder(request.id, poCode).then(() => {
                toast.success('OC vinculada')
                setOpenLinkPO(false)
                setPoCode('')
            }).catch(() => toast.error('Error al vincular OC'))
        })
    }

    const handleStartExecution = () => {
        startExec.mutate(request.id, {
            onSuccess: () => { toast.success('Ejecución iniciada'); setOpenStart(false) },
            onError: () => toast.error('Error al iniciar ejecución'),
        })
    }

    const handleConfirmArrival = () => {
        confirmArrive.mutate(request.id, {
            onSuccess: () => { toast.success('Llegada al taller confirmada'); setOpenArrive(false) },
            onError: () => toast.error('Error'),
        })
    }

    const handleCompleteExecution = () => {
        completeExec.mutate(request.id, {
            onSuccess: () => { toast.success('Ejecución completada'); setOpenComplete(false) },
            onError: () => toast.error('Error'),
        })
    }

    const handleReception = () => {
        const payload: ReceptionPayload = {
            status: receptionStatus,
            checklist,
            notes: receptionNotes || undefined,
        }
        submitReception.mutate({ id: request.id, payload }, {
            onSuccess: () => {
                toast.success(receptionStatus === 'APPROVED' ? 'Recepción conforme' : 'Recepción rechazada')
                setOpenReception(false)
                setChecklist(buildInitialChecklist())
                setReceptionNotes('')
            },
            onError: () => toast.error('Error al registrar recepción'),
        })
    }

    const handleUploadCertificate = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        uploadCert.mutate({ id: request.id, file }, {
            onSuccess: () => toast.success('Certificado subido'),
            onError: () => toast.error('Error al subir certificado'),
        })
    }

    const handleConfirmReturn = () => {
        confirmReturn.mutate(request.id, {
            onSuccess: () => { toast.success('Retorno al campo confirmado'); setOpenFieldReturn(false) },
            onError: () => toast.error('Error'),
        })
    }

    const handleClose = () => {
        closeReq.mutate({
            id: request.id,
            payload: { invoice_number: invoiceNumber, invoice_amount: Number(invoiceAmount) },
        }, {
            onSuccess: () => { toast.success('SM cerrada'); setOpenClose(false) },
            onError: () => toast.error('Error al cerrar'),
        })
    }

    const handleRegisterQuotation = () => {
        registerQuotation.mutate({
            id: request.id,
            payload: { quotation_amount: Number(quotationAmount), notes: quotationNotes || undefined },
        }, {
            onSuccess: () => { toast.success('Cotización D2 registrada'); setOpenQuotation(false); setQuotationAmount(''); setQuotationNotes('') },
            onError: (e: unknown) => {
                const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
                toast.error(msg ?? 'Error al registrar cotización')
            },
        })
    }

    const handleSignD5 = () => {
        signD5.mutate({ id: request.id, payload: { notes: d5Notes || undefined } }, {
            onSuccess: () => { toast.success('D5 firmado — SM habilitada para facturación'); setOpenSignD5(false); setD5Notes('') },
            onError: () => toast.error('Error al firmar D5'),
        })
    }

    const handleRegisterInvoice = () => {
        registerInvoice.mutate({
            id: request.id,
            payload: { invoice_number: invoiceNumber, invoice_amount: Number(invoiceAmount) },
        }, {
            onSuccess: () => { toast.success('Factura registrada'); setOpenInvoice(false); setInvoiceNumber(''); setInvoiceAmount('') },
            onError: (e: unknown) => {
                const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
                toast.error(msg ?? 'Error al registrar factura')
            },
        })
    }

    const handleConfirmPayment = () => {
        confirmPayment.mutate({ id: request.id, payload: { notes: paymentNotes || undefined } }, {
            onSuccess: () => { toast.success('Pago confirmado — SM cerrada'); setOpenPayment(false); setPaymentNotes('') },
            onError: () => toast.error('Error al confirmar pago'),
        })
    }

    const toggleCheckItem = (group: keyof ChecklistState, key: string) => {
        setChecklist(prev => ({
            ...prev,
            [group]: { ...prev[group], [key]: !prev[group][key] },
        }))
    }

    // ── Determine which actions to show ──
    const isMaint = hasRole(roleName, MAINT_ROLES)
    const isChief = hasRole(roleName, CHIEF_ROLES)
    const isPurchasing = hasRole(roleName, PURCHASING_ROLES)
    const isFinance = hasRole(roleName, FINANCE_ROLES)

    if (!hasRole(roleName, ALL_MAINT_ROLES)) return null

    return (
        <div className="space-y-2">
            {/* DRAFT → Submit */}
            {status === 'DRAFT' && isMaint && (
                <Button className="w-full" onClick={() => setOpenSubmit(true)}>
                    Enviar a Aprobación
                </Button>
            )}

            {/* PENDING_APPROVAL → Approve / Reject */}
            {status === 'PENDING_APPROVAL' && isChief && (
                <>
                    <Button className="w-full" onClick={() => setOpenApprove(true)}>Aprobar SM</Button>
                    <Button className="w-full" variant="destructive" onClick={() => setOpenReject(true)}>Rechazar SM</Button>
                </>
            )}

            {/* AWAITING_PREREQUISITES → Gate actions */}
            {status === 'AWAITING_PREREQUISITES' && isMaint && (
                <>
                    {!request.provider_confirmed && (
                        <Button variant="outline" className="w-full" onClick={() => setOpenConfirmProvider(true)}>
                            Confirmar Proveedor
                        </Button>
                    )}
                    {!request.transport_scheduled && (
                        <Button variant="outline" className="w-full" onClick={() => setOpenSchedule(true)}>
                            Programar Transporte
                        </Button>
                    )}
                    {!request.purchase_order_code && (
                        <Button variant="outline" className="w-full" onClick={() => setOpenLinkPO(true)}>
                            Vincular OC
                        </Button>
                    )}
                </>
            )}

            {/* READY_FOR_EXECUTION → Start */}
            {status === 'READY_FOR_EXECUTION' && isChief && (
                <Button className="w-full" onClick={() => setOpenStart(true)}>Iniciar Ejecución</Button>
            )}

            {/* IN_TRANSIT_TO_WORKSHOP → Confirm arrival */}
            {status === 'IN_TRANSIT_TO_WORKSHOP' && isChief && (
                <Button className="w-full" onClick={() => setOpenArrive(true)}>Confirmar Llegada al Taller</Button>
            )}

            {/* IN_MAINTENANCE → Complete */}
            {status === 'IN_MAINTENANCE' && isChief && (
                <Button className="w-full" onClick={() => setOpenComplete(true)}>Completar Ejecución</Button>
            )}

            {/* PENDING_RECEPTION → Reception checklist */}
            {status === 'PENDING_RECEPTION' && isChief && (
                <Button className="w-full" onClick={() => setOpenReception(true)}>Registrar Recepción</Button>
            )}

            {/* PENDING_CERTIFICATE → Upload */}
            {status === 'PENDING_CERTIFICATE' && isMaint && (
                <>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={handleUploadCertificate}
                    />
                    <Button className="w-full" onClick={() => fileInputRef.current?.click()} disabled={uploadCert.isPending}>
                        {uploadCert.isPending
                            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Subiendo...</>
                            : <><Upload className="mr-2 h-4 w-4" />Subir Certificado PDF</>
                        }
                    </Button>
                </>
            )}

            {/* IN_TRANSIT_TO_FIELD → Confirm return */}
            {status === 'IN_TRANSIT_TO_FIELD' && isChief && (
                <Button className="w-full" onClick={() => setOpenFieldReturn(true)}>Confirmar Retorno al Campo</Button>
            )}

            {/* QUOTED_PENDING → Register quotation D2 */}
            {status === 'QUOTED_PENDING' && isPurchasing && (
                <Button className="w-full" onClick={() => setOpenQuotation(true)}>Registrar Cotización D2</Button>
            )}

            {/* PENDING_D5 → Sign D5 */}
            {status === 'PENDING_D5' && isChief && (
                <Button className="w-full" onClick={() => setOpenSignD5(true)}>Firmar D5 (Cierre Operativo)</Button>
            )}

            {/* INVOICING_READY → Register invoice */}
            {status === 'INVOICING_READY' && isPurchasing && (
                <Button className="w-full" onClick={() => setOpenInvoice(true)}>Registrar Factura</Button>
            )}

            {/* PENDING_PAYMENT → Confirm payment */}
            {status === 'PENDING_PAYMENT' && isFinance && (
                <Button className="w-full" onClick={() => setOpenPayment(true)}>Confirmar Pago</Button>
            )}

            {/* COMPLETED → Close with invoice (legacy path) */}
            {status === 'COMPLETED' && isMaint && !request.invoice_number && (
                <Button variant="outline" className="w-full" onClick={() => setOpenClose(true)}>Cerrar con Factura</Button>
            )}

            {/* ──────────── Dialogs ──────────── */}

            <ConfirmDialog
                open={openSubmit} onOpenChange={setOpenSubmit}
                title="¿Enviar SM a aprobación?"
                description="La SM pasará a estado Pendiente de Aprobación."
                onConfirm={handleSubmit} isPending={submit.isPending}
                confirmLabel="Enviar"
            />

            <ConfirmDialog
                open={openApprove} onOpenChange={setOpenApprove}
                title="¿Aprobar esta SM?"
                description="Se creará automáticamente una Solicitud de Compra en SGP."
                onConfirm={handleApprove} isPending={approve.isPending}
                confirmLabel="Aprobar"
            />

            {/* Reject dialog with reason */}
            <Dialog open={openReject} onOpenChange={setOpenReject}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Rechazar SM</DialogTitle>
                        <DialogDescription>Indica el motivo del rechazo.</DialogDescription>
                    </DialogHeader>
                    <Textarea
                        placeholder="Motivo del rechazo..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={3}
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenReject(false)}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleReject} disabled={reject.isPending || !rejectReason.trim()}>
                            {reject.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Rechazar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={openConfirmProvider} onOpenChange={setOpenConfirmProvider}
                title="¿Confirmar proveedor?"
                description="El proveedor asignado ha confirmado la ejecución."
                onConfirm={handleConfirmProvider} isPending={confirmProvider.isPending}
            />

            {/* Schedule transport dialog */}
            <Dialog open={openSchedule} onOpenChange={setOpenSchedule}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Programar Transporte (Cama Baja)</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div>
                            <Label>Fecha programada</Label>
                            <Input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} />
                        </div>
                        <div>
                            <Label>Origen</Label>
                            <Input placeholder="Faena / Sitio..." value={scheduleOrigin} onChange={e => setScheduleOrigin(e.target.value)} />
                        </div>
                        <div>
                            <Label>Destino (Taller)</Label>
                            <Input placeholder="Taller proveedor..." value={scheduleDest} onChange={e => setScheduleDest(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenSchedule(false)}>Cancelar</Button>
                        <Button onClick={handleScheduleTransport} disabled={scheduleTransport.isPending || !scheduleDate || !scheduleOrigin || !scheduleDest}>
                            {scheduleTransport.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Programar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Link PO dialog */}
            <Dialog open={openLinkPO} onOpenChange={setOpenLinkPO}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Vincular Orden de Compra</DialogTitle>
                    </DialogHeader>
                    <Input placeholder="Código OC (ej: OC-2026-001)" value={poCode} onChange={e => setPoCode(e.target.value)} />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenLinkPO(false)}>Cancelar</Button>
                        <Button onClick={handleLinkPO} disabled={!poCode.trim()}>Vincular</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={openStart} onOpenChange={setOpenStart}
                title="¿Iniciar ejecución?"
                description="El equipo pasará a estado En Tránsito al Taller."
                onConfirm={handleStartExecution} isPending={startExec.isPending}
                confirmLabel="Iniciar"
            />

            <ConfirmDialog
                open={openArrive} onOpenChange={setOpenArrive}
                title="¿Confirmar llegada al taller?"
                description="El equipo se marcará como En Mantención."
                onConfirm={handleConfirmArrival} isPending={confirmArrive.isPending}
            />

            <ConfirmDialog
                open={openComplete} onOpenChange={setOpenComplete}
                title="¿Completar ejecución?"
                description="Se iniciará el proceso de recepción conforme."
                onConfirm={handleCompleteExecution} isPending={completeExec.isPending}
                confirmLabel="Completar"
            />

            {/* Reception checklist dialog */}
            <Dialog open={openReception} onOpenChange={setOpenReception}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Recepción Conforme</DialogTitle>
                        <DialogDescription>Revisa cada grupo de verificación antes de confirmar.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {(Object.entries(CHECKLIST_ITEMS) as [keyof ChecklistState, typeof CHECKLIST_ITEMS.scope_verification][]).map(([group, items]) => (
                            <div key={group} className="space-y-1">
                                <h4 className="text-sm font-semibold capitalize">{group.replace(/_/g, ' ')}</h4>
                                {items.map(item => (
                                    <label key={item.key} className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={checklist[group][item.key] ?? false}
                                            onChange={() => toggleCheckItem(group, item.key)}
                                            className="h-4 w-4"
                                        />
                                        {item.label}
                                    </label>
                                ))}
                            </div>
                        ))}

                        <div>
                            <Label>Resultado</Label>
                            <div className="flex gap-3 mt-1">
                                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                                    <input type="radio" value="APPROVED" checked={receptionStatus === 'APPROVED'} onChange={() => setReceptionStatus('APPROVED')} />
                                    Conforme
                                </label>
                                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                                    <input type="radio" value="REJECTED" checked={receptionStatus === 'REJECTED'} onChange={() => setReceptionStatus('REJECTED')} />
                                    No Conforme
                                </label>
                            </div>
                        </div>

                        <div>
                            <Label>Observaciones</Label>
                            <Textarea
                                placeholder="Observaciones adicionales..."
                                value={receptionNotes}
                                onChange={e => setReceptionNotes(e.target.value)}
                                rows={2}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenReception(false)}>Cancelar</Button>
                        <Button
                            variant={receptionStatus === 'REJECTED' ? 'destructive' : 'default'}
                            onClick={handleReception}
                            disabled={submitReception.isPending}
                        >
                            {submitReception.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {receptionStatus === 'APPROVED' ? 'Confirmar Recepción Conforme' : 'Registrar No Conformidad'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={openFieldReturn} onOpenChange={setOpenFieldReturn}
                title="¿Confirmar retorno al campo?"
                description="El equipo volverá a estado Operativo y se registrará la fecha de mantención."
                onConfirm={handleConfirmReturn} isPending={confirmReturn.isPending}
            />

            {/* Register quotation D2 dialog */}
            <Dialog open={openQuotation} onOpenChange={setOpenQuotation}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Registrar Cotización D2</DialogTitle>
                        <DialogDescription>Ingresa el monto cotizado por el proveedor.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div>
                            <Label>Monto Cotizado *</Label>
                            <Input type="number" placeholder="0" value={quotationAmount} onChange={e => setQuotationAmount(e.target.value)} />
                        </div>
                        <div>
                            <Label>Notas</Label>
                            <Textarea placeholder="Observaciones de la cotización..." value={quotationNotes} onChange={e => setQuotationNotes(e.target.value)} rows={2} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenQuotation(false)}>Cancelar</Button>
                        <Button onClick={handleRegisterQuotation} disabled={registerQuotation.isPending || !quotationAmount}>
                            {registerQuotation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Registrar D2
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Sign D5 dialog */}
            <Dialog open={openSignD5} onOpenChange={setOpenSignD5}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Firmar D5 — Cierre Operativo</DialogTitle>
                        <DialogDescription>Al firmar el D5 se habilita la facturación por parte del proveedor.</DialogDescription>
                    </DialogHeader>
                    <div>
                        <Label>Notas (opcional)</Label>
                        <Textarea placeholder="Observaciones del cierre operativo..." value={d5Notes} onChange={e => setD5Notes(e.target.value)} rows={2} />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenSignD5(false)}>Cancelar</Button>
                        <Button onClick={handleSignD5} disabled={signD5.isPending}>
                            {signD5.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Firmar D5
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Register invoice dialog */}
            <Dialog open={openInvoice} onOpenChange={setOpenInvoice}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Registrar Factura</DialogTitle>
                        <DialogDescription>Se validará que todos los documentos requeridos (D1–D5) estén presentes.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div>
                            <Label>N° Factura *</Label>
                            <Input placeholder="FAC-2026-001" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
                        </div>
                        <div>
                            <Label>Monto Factura *</Label>
                            <Input type="number" placeholder="0" value={invoiceAmount} onChange={e => setInvoiceAmount(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenInvoice(false)}>Cancelar</Button>
                        <Button onClick={handleRegisterInvoice} disabled={registerInvoice.isPending || !invoiceNumber || !invoiceAmount}>
                            {registerInvoice.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Registrar Factura
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirm payment dialog */}
            <Dialog open={openPayment} onOpenChange={setOpenPayment}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Confirmar Pago</DialogTitle>
                        <DialogDescription>Al confirmar el pago la SM quedará en estado Cerrada.</DialogDescription>
                    </DialogHeader>
                    <div>
                        <Label>Notas (opcional)</Label>
                        <Textarea placeholder="Referencia de transferencia, observaciones..." value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} rows={2} />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenPayment(false)}>Cancelar</Button>
                        <Button onClick={handleConfirmPayment} disabled={confirmPayment.isPending}>
                            {confirmPayment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirmar Pago
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Close with invoice dialog */}
            <Dialog open={openClose} onOpenChange={setOpenClose}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Cierre Formal con Factura</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div>
                            <Label>N° Factura</Label>
                            <Input placeholder="FAC-2026-001" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
                        </div>
                        <div>
                            <Label>Monto Factura</Label>
                            <Input type="number" placeholder="0" value={invoiceAmount} onChange={e => setInvoiceAmount(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenClose(false)}>Cancelar</Button>
                        <Button onClick={handleClose} disabled={closeReq.isPending || !invoiceNumber || !invoiceAmount}>
                            {closeReq.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Cerrar SM
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
