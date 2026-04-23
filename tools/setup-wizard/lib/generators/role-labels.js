/**
 * role-labels — roles.levels[] → body for ROLE_LABELS marker block.
 */

function buildRoleLabelsBlock(roles) {
  const levels = (roles && roles.levels) || [];
  const l1 = levels[0]?.name || 'Employee';
  const l2 = levels[1]?.name || 'Manager';
  const l3 = levels[2]?.name || 'Admin';
  return [
    `  [UserRole.Employee]: '${l1.replace(/'/g, "\\'")}',`,
    `  [UserRole.Manager]: '${l2.replace(/'/g, "\\'")}',`,
    `  [UserRole.Admin]: '${l3.replace(/'/g, "\\'")}',`,
  ].join('\n');
}

module.exports = { buildRoleLabelsBlock };
