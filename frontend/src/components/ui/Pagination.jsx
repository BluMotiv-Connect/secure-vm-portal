import React from 'react'
import { cn } from '@utils/helpers'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Button from './Button'

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  showInfo = true,
  showPageNumbers = true,
  maxPageNumbers = 5,
  className
}) => {
  if (totalPages <= 1) return null

  const getPageNumbers = () => {
    const pages = []
    const half = Math.floor(maxPageNumbers / 2)
    
    let start = Math.max(1, currentPage - half)
    let end = Math.min(totalPages, start + maxPageNumbers - 1)
    
    if (end - start + 1 < maxPageNumbers) {
      start = Math.max(1, end - maxPageNumbers + 1)
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    
    return pages
  }

  const pageNumbers = getPageNumbers()

  return (
    <div className={cn('flex items-center justify-between', className)}>
      {showInfo && (
        <div className="text-sm text-gray-700">
          Page {currentPage} of {totalPages}
        </div>
      )}
      
      <div className="flex items-center space-x-1">
        {/* Previous button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-2"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        {showPageNumbers && (
          <>
            {/* First page */}
            {pageNumbers[0] > 1 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(1)}
                  className="px-3"
                >
                  1
                </Button>
                {pageNumbers[0] > 2 && (
                  <span className="px-2 text-gray-500">...</span>
                )}
              </>
            )}
            
            {/* Page numbers */}
            {pageNumbers.map((page) => (
              <Button
                key={page}
                variant={page === currentPage ? 'primary' : 'outline'}
                size="sm"
                onClick={() => onPageChange(page)}
                className="px-3"
              >
                {page}
              </Button>
            ))}
            
            {/* Last page */}
            {pageNumbers[pageNumbers.length - 1] < totalPages && (
              <>
                {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                  <span className="px-2 text-gray-500">...</span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(totalPages)}
                  className="px-3"
                >
                  {totalPages}
                </Button>
              </>
            )}
          </>
        )}
        
        {/* Next button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-2"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export default Pagination
