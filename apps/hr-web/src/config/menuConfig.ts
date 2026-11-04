import {
  Calculator,
  CalendarCheck,
  CalendarOff,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList as LeaveTypeIcon,
  Clock,
  Coins,
  FileBarChart,
  FileText,
  LayoutDashboard,
  Lock,
  Receipt,
  ScanLine,
  Tablet,
  UserCheck,
  Users,
  BriefcaseBusiness,
  IdCard,
  Wallet,
} from '@lucide/vue'

export type {
  SubMenuItem,
  MenuItem,
  MenuSection,
} from '@mts241alikhlash/web-shared/types/menu.types'
import type { MenuSection } from '@mts241alikhlash/web-shared/types/menu.types'

export const menuSections: MenuSection[] = [
  {
    key: 'main',
    label: 'menu.section.main',
    items: [
      {
        title: 'menu.dashboard',
        url: '/dashboard',
        icon: LayoutDashboard,
      },
    ],
  },

  {
    key: 'employee',
    label: 'menu.section.staff',
    requiredPermission: 'employees.read',
    items: [
      {
        title: 'menu.employeeList',
        url: '/staff',
        icon: Users,
        requiredPermission: 'employees.read',
      },
      {
        title: 'menu.employeeAccounts',
        url: '/staff/accounts',
        icon: IdCard,
        requiredPermission: 'users.read',
      },
      {
        key: 'employee-reference',
        title: 'menu.reference',
        url: '#',
        icon: BriefcaseBusiness,
        items: [
          { title: 'menu.position', url: '/job-positions' },
          {
            title: 'menu.positionCategory',
            url: '/job-categories',
          },
          { title: 'menu.employmentType', url: '/contract-types' },
        ],
      },
    ],
  },

  {
    key: 'presence',
    label: 'menu.section.presence',
    requiredPermission: 'presence-credentials.read',
    items: [
      {
        title: 'menu.staffAttendance',
        url: '/attendance/employee-attendance',
        icon: ClipboardCheck,
        requiredPermission: 'presence-records.read',
      },
      {
        title: 'menu.monthlyRecap',
        url: '/attendance/summary',
        icon: FileBarChart,
        requiredPermission: 'presence-records.read',
      },
      {
        title: 'menu.myAttendance',
        url: '/attendance/my-attendance',
        icon: CalendarCheck,
        requiredPermission: 'presence-records.read-own',
      },
      {
        title: 'menu.myLeave',
        url: '/attendance/my-leave',
        icon: FileText,
        requiredPermission: 'leave-requests.read-own',
      },
      {
        title: 'menu.leaveApproval',
        url: '/attendance/leave-approvals',
        icon: CheckCircle2,
        requiredPermission: 'leave-requests.approve',
      },
      {
        title: 'menu.leaveType',
        url: '/attendance/leave-types',
        icon: LeaveTypeIcon,
        requiredPermission: 'leave-types.read',
      },
      {
        title: 'menu.shiftAssignment',
        url: '/attendance/shift-assignments',
        icon: Clock,
        requiredPermission: 'work-patterns.read',
      },
      {
        title: 'menu.workPattern',
        url: '/attendance/shifts',
        icon: Clock,
        requiredPermission: 'work-patterns.read',
      },
      {
        title: 'menu.holiday',
        url: '/attendance/holidays',
        icon: CalendarOff,
        requiredPermission: 'non-working-days.read',
      },
      {
        title: 'menu.attendancePeriod',
        url: '/attendance/periods',
        icon: Lock,
        requiredPermission: 'presence-records.read',
      },
      {
        title: 'menu.presenceCard',
        url: '/attendance/cards',
        icon: UserCheck,
        requiredPermission: 'presence-credentials.read',
      },
      {
        title: 'menu.gateDevice',
        url: '/attendance/devices',
        icon: Tablet,
        requiredPermission: 'presence-devices.read',
      },
      {
        title: 'menu.openKiosk',
        url: '/attendance/kiosk',
        icon: ScanLine,
        requiredPermission: 'presence-devices.read',
      },
    ],
  },

  {
    key: 'payroll',
    label: 'menu.section.payroll',
    requiredPermission: 'payroll-payslips.read-own',
    items: [
      {
        title: 'menu.myPayslip',
        url: '/payroll/my-payslip',
        icon: Receipt,
        requiredPermission: 'payroll-payslips.read-own',
      },
      {
        title: 'menu.payrollRun',
        url: '/payroll/runs',
        icon: Calculator,
        requiredPermission: 'payroll-runs.read',
      },
      {
        title: 'menu.employeeSalary',
        url: '/payroll/employee-salaries',
        icon: Wallet,
        requiredPermission: 'payroll-salaries.read',
      },
      {
        title: 'menu.salaryComponent',
        url: '/payroll/components',
        icon: Coins,
        requiredPermission: 'payroll-components.read',
      },
    ],
  },
]
