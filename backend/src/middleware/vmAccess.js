const VirtualMachine = require('../models/VirtualMachine')
const logger = require('../utils/logger')
const { getClientIP } = require('../utils/helpers')

// Check if user can access specific VM
const checkVMAccess = async (req, res, next) => {
  try {
    const { id } = req.params
    const user = req.user

    // Admin can access all VMs
    if (user.role === 'admin') {
      return next()
    }

    // Employee can only access assigned VMs
    const vm = await VirtualMachine.findById(id)
    if (!vm) {
      return res.status(404).json({
        error: 'VM not found',
        code: 'VM_NOT_FOUND'
      })
    }

    if (!vm.canUserAccess(user.id)) {
      logger.audit('VM_ACCESS_DENIED', {
        userId: user.id,
        vmId: id,
        reason: 'VM not assigned to user',
        ip: getClientIP(req)
      })

      return res.status(403).json({
        error: 'Access denied - VM not assigned to you',
        code: 'VM_ACCESS_DENIED'
      })
    }

    // Attach VM to request for use in controller
    req.vm = vm
    next()
  } catch (error) {
    logger.error('VM access check failed:', error)
    res.status(500).json({
      error: 'Failed to check VM access',
      code: 'VM_ACCESS_CHECK_FAILED'
    })
  }
}

// Check if VM is available for connection
const checkVMAvailability = async (req, res, next) => {
  try {
    const vm = req.vm || await VirtualMachine.findById(req.params.id)
    
    if (!vm) {
      return res.status(404).json({
        error: 'VM not found',
        code: 'VM_NOT_FOUND'
      })
    }

    if (!vm.isAvailable()) {
      return res.status(400).json({
        error: `VM is not available for connection. Current status: ${vm.status}`,
        code: 'VM_NOT_AVAILABLE',
        status: vm.status
      })
    }

    req.vm = vm
    next()
  } catch (error) {
    logger.error('VM availability check failed:', error)
    res.status(500).json({
      error: 'Failed to check VM availability',
      code: 'VM_AVAILABILITY_CHECK_FAILED'
    })
  }
}

module.exports = {
  checkVMAccess,
  checkVMAvailability
}
