import { useQuery, useMutation, useQueryClient } from 'react-query'
import { reportService } from '@services/reportService'
import { useNotifications } from '@contexts/NotificationContext'

export const useReports = () => {
  const queryClient = useQueryClient()
  const { success, error } = useNotifications()

  // Generate time report
  const useTimeReport = (params) => {
    return useQuery(
      ['timeReport', params],
      () => reportService.generateTimeReport(params),
      {
        enabled: !!(params.startDate && params.endDate),
        staleTime: 300000, // 5 minutes
        keepPreviousData: true
      }
    )
  }

  // Generate user productivity report
  const useUserProductivityReport = (params) => {
    return useQuery(
      ['userProductivityReport', params],
      () => reportService.generateUserProductivityReport(params),
      {
        enabled: !!(params.startDate && params.endDate),
        staleTime: 300000, // 5 minutes
        keepPreviousData: true
      }
    )
  }

  // Generate VM usage report
  const useVMUsageReport = (params) => {
    return useQuery(
      ['vmUsageReport', params],
      () => reportService.generateVMUsageReport(params),
      {
        enabled: !!(params.startDate && params.endDate),
        staleTime: 300000, // 5 minutes
        keepPreviousData: true
      }
    )
  }

  // Generate summary report
  const useSummaryReport = (params) => {
    return useQuery(
      ['summaryReport', params],
      () => reportService.generateSummaryReport(params),
      {
        enabled: !!(params.startDate && params.endDate),
        staleTime: 300000, // 5 minutes
        keepPreviousData: true
      }
    )
  }

  // Get report templates
  const reportTemplatesQuery = useQuery(
    ['reportTemplates'],
    () => reportService.getReportTemplates(),
    {
      staleTime: 600000, // 10 minutes
    }
  )

  // Download Excel report mutation
  const downloadExcelMutation = useMutation(
    ({ reportType, params, filename }) => reportService.downloadExcelReport(reportType, params),
    {
      onSuccess: (data, variables) => {
        // Create download link
        const url = window.URL.createObjectURL(new Blob([data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', variables.filename || `${variables.reportType}-report.xlsx`)
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
        
        success('Report downloaded successfully')
      },
      onError: (err) => {
        error(err.response?.data?.error || 'Failed to download report')
      }
    }
  )

  // Create report template mutation
  const createTemplateMutation = useMutation(
    (templateData) => reportService.createReportTemplate(templateData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['reportTemplates'])
        success('Report template created successfully')
      },
      onError: (err) => {
        error(err.response?.data?.error || 'Failed to create report template')
      }
    }
  )

  // Update report template mutation
  const updateTemplateMutation = useMutation(
    ({ id, templateData }) => reportService.updateReportTemplate(id, templateData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['reportTemplates'])
        success('Report template updated successfully')
      },
      onError: (err) => {
        error(err.response?.data?.error || 'Failed to update report template')
      }
    }
  )

  // Delete report template mutation
  const deleteTemplateMutation = useMutation(
    (id) => reportService.deleteReportTemplate(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['reportTemplates'])
        success('Report template deleted successfully')
      },
      onError: (err) => {
        error(err.response?.data?.error || 'Failed to delete report template')
      }
    }
  )

  return {
    // Report queries
    useTimeReport,
    useUserProductivityReport,
    useVMUsageReport,
    useSummaryReport,

    // Report templates
    reportTemplates: reportTemplatesQuery.data?.reports || [],
    templatesLoading: reportTemplatesQuery.isLoading,

    // Mutations
    downloadExcel: downloadExcelMutation.mutate,
    createTemplate: createTemplateMutation.mutate,
    updateTemplate: updateTemplateMutation.mutate,
    deleteTemplate: deleteTemplateMutation.mutate,

    // Mutation states
    isDownloading: downloadExcelMutation.isLoading,
    isCreatingTemplate: createTemplateMutation.isLoading,
    isUpdatingTemplate: updateTemplateMutation.isLoading,
    isDeletingTemplate: deleteTemplateMutation.isLoading
  }
}
