const db = require('../config/database');

class VirtualMachine {
  constructor(vm) {
    this.id = vm.id;
    this.name = vm.name;
    this.ip_address = vm.ip_address;
    this.status = vm.status;
    this.os = vm.os;
    this.cpu_cores = vm.cpu_cores;
    this.ram_gb = vm.ram_gb;
    this.storage_gb = vm.storage_gb;
    this.assigned_user_id = vm.assigned_user_id;
    this.assigned_user_name = vm.assigned_user_name;
    this.assigned_user_email = vm.assigned_user_email;
    this.created_at = vm.created_at;
    this.updated_at = vm.updated_at;
  }

  static async findAll({ limit, offset, sortBy, sortOrder, status, assigned }) {
    const query = `
      SELECT * FROM virtual_machines
      WHERE ($1::text IS NULL OR status = $1)
      AND (
        CASE
          WHEN $2::boolean IS TRUE THEN assigned_user_id IS NOT NULL
          WHEN $2::boolean IS FALSE THEN assigned_user_id IS NULL
          ELSE TRUE
        END
      )
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT $3 OFFSET $4
    `;
    const { rows } = await db.query(query, [status, assigned, limit, offset]);
    return rows.map(vm => new VirtualMachine(vm));
  }

  static async findById(id) {
    const query = 'SELECT * FROM virtual_machines WHERE id = $1';
    const { rows } = await db.query(query, [id]);
    return rows.length ? new VirtualMachine(rows[0]) : null;
  }

  async save() {
    if (this.id) {
      // Update
      const query = `
        UPDATE virtual_machines
        SET name = $1, ip_address = $2, status = $3, os = $4, cpu_cores = $5, ram_gb = $6, storage_gb = $7, assigned_user_id = $8, assigned_user_name = $9, assigned_user_email = $10, updated_at = NOW()
        WHERE id = $11
        RETURNING *
      `;
      const values = [this.name, this.ip_address, this.status, this.os, this.cpu_cores, this.ram_gb, this.storage_gb, this.assigned_user_id, this.assigned_user_name, this.assigned_user_email, this.id];
      const { rows } = await db.query(query, values);
      return new VirtualMachine(rows[0]);
    } else {
      // Create
      const query = `
        INSERT INTO virtual_machines (name, ip_address, status, os, cpu_cores, ram_gb, storage_gb, assigned_user_id, assigned_user_name, assigned_user_email)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      const values = [this.name, this.ip_address, this.status, this.os, this.cpu_cores, this.ram_gb, this.storage_gb, this.assigned_user_id, this.assigned_user_name, this.assigned_user_email];
      const { rows } = await db.query(query, values);
      return new VirtualMachine(rows[0]);
    }
  }

  static async delete(id) {
    const query = 'DELETE FROM virtual_machines WHERE id = $1';
    await db.query(query, [id]);
  }

  async assignTo(user) {
    this.assigned_user_id = user.id;
    this.assigned_user_name = user.name;
    this.assigned_user_email = user.email;
    return this.save();
  }

  async unassign() {
    this.assigned_user_id = null;
    this.assigned_user_name = null;
    this.assigned_user_email = null;
    return this.save();
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      ip_address: this.ip_address,
      status: this.status,
      os: this.os,
      cpu_cores: this.cpu_cores,
      ram_gb: this.ram_gb,
      storage_gb: this.storage_gb,
      assigned_to: this.assigned_user_id ? {
        id: this.assigned_user_id,
        name: this.assigned_user_name,
        email: this.assigned_user_email,
      } : null,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }
}

module.exports = VirtualMachine;
