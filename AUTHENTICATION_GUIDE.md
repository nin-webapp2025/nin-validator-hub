# Industry Standard Authentication & Role Management

## Overview
This application implements **industry-standard role-based access control (RBAC)** with a single authentication flow for all users.

---

## 🔐 Authentication Flow (Industry Standard)

### **Single Sign-In/Sign-Up for All Roles**
✅ **Correct Approach (What We Implemented):**
- One `/auth` page for everyone
- All users sign up/sign in the same way
- Role assignment happens **after** authentication
- Post-login redirection based on role

❌ **Wrong Approach (Anti-pattern):**
- Separate login pages per role (e.g., `/admin-login`, `/staff-login`)
- Role selection during signup
- Hard-coded role in registration form

---

## 🎯 How It Works

### **1. User Signs Up**
```
User fills form → Supabase Auth creates account → Database trigger fires
  ↓
handle_new_user() function automatically:
  1. Creates profile entry
  2. Assigns default 'user' role
```

**Migration:** `20260129_add_auto_role_assignment.sql`

### **2. User Signs In**
```
User logs in → Auth succeeds → App.tsx checks role → Redirects to appropriate dashboard
```

**Flow:**
- Login at `/auth`
- `useAuth()` hook verifies authentication
- `useRole()` hook fetches user role from `user_roles` table
- `ProtectedRoute` component enforces access control
- Redirect to role-specific dashboard

### **3. Route Protection**
```tsx
<ProtectedRoute allowedRoles={['admin']}>
  <AdminDashboard />
</ProtectedRoute>
```

**What happens:**
- Checks if user is authenticated
- Checks if user has required role
- If unauthorized, redirects to their correct dashboard
- Shows loading state during verification

---

## 👥 User Roles

| Role | Access Level | Dashboard Route |
|------|-------------|-----------------|
| **User** (default) | Basic - Personal history only | `/dashboard/user` |
| **VIP** | Premium - Can submit NIN modifications | `/dashboard/vip` |
| **Staff** | Service - All NIN/BVN services + assigned tasks | `/dashboard/staff` |
| **Admin** | Full - API stats, role management, approve requests | `/dashboard/admin` |

---

## 🛠️ Role Management (Admin Only)

### **Upgrading Users**
Admins can change any user's role via the **User Role Management** tab:

1. Go to Admin Dashboard
2. Click "User Roles" tab
3. Search for user by email
4. Select new role from dropdown
5. Role updates instantly

**Component:** `UserRoleManagement.tsx`

### **Database Schema**
```sql
-- user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);

-- app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'staff', 'vip');
```

---

## 🔒 Security Features

### **Row Level Security (RLS)**
All tables have RLS policies:
- Users can only view/edit their own data
- Admins have special permissions via `has_role()` function
- Staff can only see assigned tasks

### **Route Protection**
- `ProtectedRoute` component wraps all dashboards
- Prevents URL manipulation attacks
- Automatic redirection for unauthorized access

### **Auth State Management**
- `useAuth()` hook manages authentication
- `useRole()` hook manages role state
- Both hooks handle loading states properly

---

## 📋 Implementation Checklist

✅ **Completed:**
- [x] Single authentication endpoint for all users
- [x] Automatic role assignment on signup (default: 'user')
- [x] Role-based routing system
- [x] Route protection with `ProtectedRoute` component
- [x] Admin user role management UI
- [x] Database triggers for auto-role assignment
- [x] RLS policies for data security
- [x] Loading states during auth/role checks
- [x] Unauthorized access redirection

---

## 🚀 Usage Examples

### **For Developers: Adding New Protected Route**
```tsx
// In App.tsx
<Route 
  path="/dashboard/custom" 
  element={
    <ProtectedRoute allowedRoles={['admin', 'staff']}>
      <CustomDashboard />
    </ProtectedRoute>
  } 
/>
```

### **For Developers: Checking Role in Component**
```tsx
import { useRole } from '@/hooks/useRole';

function MyComponent() {
  const { role, isAdmin, isStaff, isVip } = useRole();

  if (isAdmin) {
    return <AdminView />;
  }
  return <RegularView />;
}
```

### **For Admins: Upgrading User to VIP**
1. Login as admin
2. Navigate to Admin Dashboard
3. Click "User Roles" tab
4. Search for user email
5. Change dropdown to "VIP"
6. User gets VIP access immediately (on next login/refresh)

---

## 🎨 User Experience Flow

### **New User Journey:**
1. Visit `/auth` → Sign up
2. Email verification (if enabled)
3. Auto-assigned 'user' role
4. Redirected to `/dashboard/user`
5. Can view personal history only

### **VIP Upgrade Journey:**
1. Admin changes role to 'vip'
2. User logs out & back in (or refreshes)
3. Auto-redirected to `/dashboard/vip`
4. Premium UI with modification request form
5. Can submit NIN change requests

### **Staff Assignment Journey:**
1. Admin changes role to 'staff'
2. Staff logs in
3. Sees all NIN/BVN services
4. "My Tasks" tab shows assigned modification requests
5. Can process VIP requests

---

## 🔧 Database Migrations

**Run this migration to enable auto-role assignment:**
```bash
# In Supabase SQL Editor, run:
supabase/migrations/20260129_add_auto_role_assignment.sql
```

**What it does:**
- Creates `handle_new_user()` trigger function
- Automatically creates profile + assigns 'user' role on signup
- Runs for every new user registration

---

## 📊 Architecture Diagram

```
┌─────────────┐
│   Sign Up   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│  Supabase Auth Creates  │
│      User Account       │
└──────────┬──────────────┘
           │
           ▼
    ┌──────────────────┐
    │  Trigger Fires   │
    │ handle_new_user()│
    └────────┬─────────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌─────────┐    ┌────────────┐
│ Profile │    │ user_roles │
│ Created │    │ role='user'│
└─────────┘    └────────────┘
                      │
                      ▼
              ┌──────────────┐
              │ User Logs In │
              └──────┬───────┘
                     │
                     ▼
            ┌────────────────┐
            │ useRole() hook │
            │ fetches role   │
            └────────┬───────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌──────────────────┐
│ ProtectedRoute  │    │  RoleBasedRouter │
│ checks access   │    │  redirects user  │
└────────┬────────┘    └────────┬─────────┘
         │                      │
         └──────────┬───────────┘
                    ▼
        ┌──────────────────────┐
        │  Appropriate Dash    │
        │  Based on Role       │
        └──────────────────────┘
```

---

## 🏆 Best Practices Followed

✅ **Single Authentication Flow** - One login for everyone  
✅ **Database-Driven Roles** - Roles stored in DB, not hardcoded  
✅ **Default Role Assignment** - Every user gets 'user' role automatically  
✅ **Admin Role Management** - Only admins can change roles  
✅ **Route Protection** - Client-side guards prevent unauthorized access  
✅ **Row Level Security** - Database policies enforce data isolation  
✅ **Loading States** - Proper UX during auth/role verification  
✅ **Automatic Redirection** - Users always land on correct dashboard  

---

## 📝 Notes for Production

- **Email Verification**: Enable in Supabase Auth settings for security
- **Password Policy**: Configure strong password requirements
- **Rate Limiting**: Enable Supabase rate limiting on auth endpoints
- **Audit Logs**: Consider logging role changes for compliance
- **MFA**: Enable multi-factor authentication for admin accounts
- **Session Management**: Configure appropriate session timeout values

---

**Last Updated:** January 29, 2026  
**Implementation Status:** ✅ Complete & Production Ready
