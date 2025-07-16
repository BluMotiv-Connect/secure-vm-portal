const VirtualMachine = require('../models/VirtualMachine');
const User = require('../models/User');

exports.getAllVMs = async (req, res, next) => {
  try {
    const { limit = 10, offset = 0, sortBy = 'created_at', sortOrder = 'DESC', status, assigned } = req.query;
    const vms = await VirtualMachine.findAll({ limit, offset, sortBy, sortOrder, status, assigned });
    res.json(vms.map(vm => vm.toJSON()));
  } catch (error) {
    next(error);
  }
};

exports.getVMById = async (req, res, next) => {
  try {
    const vm = await VirtualMachine.findById(req.params.id);
    if (vm) {
      res.json(vm.toJSON());
    } else {
      res.status(404).json({ message: 'VM not found' });
    }
  } catch (error) {
    next(error);
  }
};

exports.createVM = async (req, res, next) => {
  try {
    const newVM = new VirtualMachine(req.body);
    const savedVM = await newVM.save();
    res.status(201).json(savedVM.toJSON());
  } catch (error) {
    next(error);
  }
};

exports.updateVM = async (req, res, next) => {
  try {
    const vm = await VirtualMachine.findById(req.params.id);
    if (vm) {
      Object.assign(vm, req.body);
      const updatedVM = await vm.save();
      res.json(updatedVM.toJSON());
    } else {
      res.status(404).json({ message: 'VM not found' });
    }
  } catch (error) {
    next(error);
  }
};

exports.deleteVM = async (req, res, next) => {
  try {
    await VirtualMachine.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

exports.assignVM = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const vm = await VirtualMachine.findById(req.params.id);
    if (!vm) {
      return res.status(404).json({ message: 'VM not found' });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const assignedVM = await vm.assignTo(user);
    res.json(assignedVM.toJSON());
  } catch (error) {
    next(error);
  }
};

exports.unassignVM = async (req, res, next) => {
  try {
    const vm = await VirtualMachine.findById(req.params.id);
    if (!vm) {
      return res.status(404).json({ message: 'VM not found' });
    }
    const unassignedVM = await vm.unassign();
    res.json(unassignedVM.toJSON());
  } catch (error) {
    next(error);
  }
};
