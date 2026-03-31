import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as maintApi from '../api/maintenance'
import { MaintRequestCreate, HorometerUpdate, ReceptionPayload, CloseInput, EquipmentCreate } from '../api/types'

// ── Equipment Hooks ──

export const useEquipmentList = (params?: any) => {
    return useQuery({
        queryKey: ['equipment', params],
        queryFn: () => maintApi.getEquipmentList(params),
    })
}

export const useEquipmentDetail = (id: string, enabled = true) => {
    return useQuery({
        queryKey: ['equipment', id],
        queryFn: () => maintApi.getEquipmentDetail(id),
        enabled: !!id && enabled,
    })
}

export const useCreateEquipment = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: maintApi.createEquipment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['equipment'] })
        },
    })
}

export const useUpdateEquipment = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: Partial<EquipmentCreate> }) =>
            maintApi.updateEquipment(id, payload),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['equipment'] })
            queryClient.invalidateQueries({ queryKey: ['equipment', variables.id] })
        },
    })
}

export const useUpdateHorometer = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: HorometerUpdate }) => maintApi.updateHorometer(id, payload),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['equipment'] })
            queryClient.invalidateQueries({ queryKey: ['equipment', variables.id] })
            queryClient.invalidateQueries({ queryKey: ['horometer-history', variables.id] })
        },
    })
}

export const useHorometerHistory = (id: string) => {
    return useQuery({
        queryKey: ['horometer-history', id],
        queryFn: () => maintApi.getHorometerHistory(id),
        enabled: !!id,
    })
}


// ── Provider Hooks ──

export const useProviderList = (params?: any) => {
    return useQuery({
        queryKey: ['providers', params],
        queryFn: () => maintApi.getProviders(params),
    })
}


// ── Request Hooks ──

export const useMaintRequests = (params?: any) => {
    return useQuery({
        queryKey: ['maint-requests', params],
        queryFn: () => maintApi.getMaintenanceRequests(params),
    })
}

export const useMaintRequestDetail = (id: string, enabled = true) => {
    return useQuery({
        queryKey: ['maint-requests', id],
        queryFn: () => maintApi.getMaintRequest(id),
        enabled: !!id && enabled,
    })
}

export const useCreateMaintRequest = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (payload: MaintRequestCreate) => maintApi.createMaintRequest(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maint-requests'] })
        },
    })
}

export const useSubmitMaintRequest = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => maintApi.submitMaintRequest(id),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: ['maint-requests'] })
            queryClient.invalidateQueries({ queryKey: ['maint-requests', id] })
            queryClient.invalidateQueries({ queryKey: ['maint-timeline', id] })
        },
    })
}

export const useApproveMaintRequest = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, costCenterId }: { id: string; costCenterId?: string }) =>
            maintApi.approveMaintRequest(id, costCenterId),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['maint-requests'] })
            queryClient.invalidateQueries({ queryKey: ['maint-requests', id] })
            queryClient.invalidateQueries({ queryKey: ['gate-status', id] })
            queryClient.invalidateQueries({ queryKey: ['maint-timeline', id] })
        },
    })
}

export const useRejectMaintRequest = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, reason }: { id: string; reason?: string }) => maintApi.rejectMaintRequest(id, reason),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['maint-requests'] })
            queryClient.invalidateQueries({ queryKey: ['maint-requests', id] })
            queryClient.invalidateQueries({ queryKey: ['maint-timeline', id] })
        },
    })
}

// Gate workflows
export const useConfirmProvider = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => maintApi.confirmProvider(id),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: ['maint-requests', id] })
            queryClient.invalidateQueries({ queryKey: ['gate-status', id] })
        },
    })
}

export const useScheduleTransport = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: any }) => maintApi.scheduleTransport(id, payload),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['maint-requests', id] })
            queryClient.invalidateQueries({ queryKey: ['gate-status', id] })
        },
    })
}

export const useGateStatus = (id: string, enabled = true) => {
    return useQuery({
        queryKey: ['gate-status', id],
        queryFn: () => maintApi.getGateStatus(id),
        enabled: !!id && enabled,
    })
}

export const useMaintTimeline = (id: string, enabled = true) => {
    return useQuery({
        queryKey: ['maint-timeline', id],
        queryFn: () => maintApi.getTimeline(id),
        enabled: !!id && enabled,
    })
}

// Execution and Reception

export const useStartExecution = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => maintApi.startExecution(id),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: ['maint-requests', id] })
            queryClient.invalidateQueries({ queryKey: ['maint-timeline', id] })
            queryClient.invalidateQueries({ queryKey: ['equipment'] })
        },
    })
}

export const useConfirmWorkshopArrival = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => maintApi.confirmWorkshopArrival(id),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: ['maint-requests', id] })
            queryClient.invalidateQueries({ queryKey: ['maint-timeline', id] })
        },
    })
}

export const useCompleteExecution = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => maintApi.completeExecution(id),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: ['maint-requests', id] })
            queryClient.invalidateQueries({ queryKey: ['maint-timeline', id] })
        },
    })
}

export const useSubmitReception = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: ReceptionPayload }) => maintApi.receptionConforme(id, payload),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['maint-requests', id] })
            queryClient.invalidateQueries({ queryKey: ['maint-timeline', id] })
        },
    })
}

// Certificate & Close

export const useUploadCertificate = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, file }: { id: string; file: File }) => maintApi.uploadCertificate(id, file),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['maint-requests', id] })
            queryClient.invalidateQueries({ queryKey: ['maint-timeline', id] })
        },
    })
}

export const useConfirmFieldReturn = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => maintApi.confirmFieldReturn(id),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: ['maint-requests', id] })
            queryClient.invalidateQueries({ queryKey: ['maint-timeline', id] })
            queryClient.invalidateQueries({ queryKey: ['equipment'] })
        },
    })
}

export const useCloseMaintRequest = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: CloseInput }) => maintApi.closeMaintRequest(id, payload),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['maint-requests', id] })
            queryClient.invalidateQueries({ queryKey: ['maint-timeline', id] })
        },
    })
}

export const useMaintAnalytics = () => {
    return useQuery({
        queryKey: ['maint-analytics'],
        queryFn: () => maintApi.getAnalyticsSummary(),
    })
}

// Commercial flow hooks

export const useRegisterQuotation = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: { quotation_amount: number; notes?: string } }) =>
            maintApi.registerQuotation(id, payload),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['maint-requests', id] })
            queryClient.invalidateQueries({ queryKey: ['maint-timeline', id] })
        },
    })
}

export const useSignD5 = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: { notes?: string } }) =>
            maintApi.signD5(id, payload),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['maint-requests', id] })
            queryClient.invalidateQueries({ queryKey: ['maint-timeline', id] })
        },
    })
}

export const useRegisterInvoice = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: { invoice_number: string; invoice_amount: number } }) =>
            maintApi.registerInvoice(id, payload),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['maint-requests', id] })
            queryClient.invalidateQueries({ queryKey: ['maint-timeline', id] })
        },
    })
}

export const useConfirmPayment = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: { notes?: string } }) =>
            maintApi.confirmPayment(id, payload),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['maint-requests', id] })
            queryClient.invalidateQueries({ queryKey: ['maint-timeline', id] })
            queryClient.invalidateQueries({ queryKey: ['equipment'] })
        },
    })
}

// ── SLA Alerts ──

export const useMaintAlerts = (unreadOnly = true) => {
    return useQuery({
        queryKey: ['maint-alerts', unreadOnly],
        queryFn: () => maintApi.getAlerts(unreadOnly),
        refetchInterval: 5 * 60 * 1000,
    })
}

export const useMaintAlertCount = () => {
    return useQuery({
        queryKey: ['maint-alert-count'],
        queryFn: maintApi.getAlertCount,
        refetchInterval: 5 * 60 * 1000,
    })
}

export const useMarkAlertRead = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: maintApi.markAlertRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maint-alerts'] })
            queryClient.invalidateQueries({ queryKey: ['maint-alert-count'] })
        },
    })
}

export const useRunSlaChecks = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: maintApi.runSlaChecks,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maint-alerts'] })
            queryClient.invalidateQueries({ queryKey: ['maint-alert-count'] })
        },
    })
}

