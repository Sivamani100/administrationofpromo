'use server'

import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

// We create a dedicated service role client here since these are admin super powers.
// We must ensure only admins can trigger these.
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// 1. Create a secure session validator
async function verifyAdminSession() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  )
  
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("Unauthorized: No active session")
  
  // Verify role in JWT or profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()
    
  if (profile?.role !== 'admin') throw new Error("Forbidden: Admin privileges required")
  return session.user
}

// Helper to log audit actions
async function logAction(sb: any, action: string, metadata: any) {
  await sb.from('audit_logs').insert({ action, metadata })
}

export async function banUser(userId: string) {
  await verifyAdminSession()
  const sb = getAdminClient()
  await sb.from('profiles').update({ account_status: 'suspended' }).eq('id', userId)
  // Also ban in auth.users
  await sb.auth.admin.updateUserById(userId, { ban_duration: '876000h' }) // ~100 years
  await logAction(sb, 'admin_ban_user', { user_id: userId })
}

export async function unbanUser(userId: string) {
  await verifyAdminSession()
  const sb = getAdminClient()
  await sb.from('profiles').update({ account_status: 'active' }).eq('id', userId)
  // Unban in auth.users
  await sb.auth.admin.updateUserById(userId, { ban_duration: 'none' })
  await logAction(sb, 'admin_unban_user', { user_id: userId })
}

export async function warnUser(userId: string, reason: string) {
  const admin = await verifyAdminSession()
  const sb = getAdminClient()
  await sb.from('user_warnings').insert({ user_id: userId, reason, status: 'active', issued_by: admin.id })
  await logAction(sb, 'admin_warn_user', { user_id: userId, reason })
}

export async function verifyUser(userId: string) {
  await verifyAdminSession()
  const sb = getAdminClient()
  await sb.from('profiles').update({ is_verified: true }).eq('id', userId)
  await logAction(sb, 'admin_verify_user', { user_id: userId })
}

export async function approveVerification(requestId: string, userId: string, note?: string) {
  await verifyAdminSession()
  const sb = getAdminClient()
  await sb.from('verification_requests').update({ status: 'approved' }).eq('id', requestId)
  await sb.from('profiles').update({ is_verified: true }).eq('id', userId)
  await logAction(sb, 'admin_approve_verification', { request_id: requestId, user_id: userId, note })
}

export async function rejectVerification(requestId: string, userId: string, note?: string) {
  await verifyAdminSession()
  const sb = getAdminClient()
  await sb.from('verification_requests').update({ status: 'rejected' }).eq('id', requestId)
  await logAction(sb, 'admin_reject_verification', { request_id: requestId, user_id: userId, note })
}

export async function resolveDispute(disputeId: string) {
  await verifyAdminSession()
  const sb = getAdminClient()
  await sb.from('disputes').update({ status: 'resolved' }).eq('id', disputeId)
  await logAction(sb, 'admin_resolve_dispute', { dispute_id: disputeId })
}

export async function closeDispute(disputeId: string) {
  await verifyAdminSession()
  const sb = getAdminClient()
  await sb.from('disputes').update({ status: 'closed' }).eq('id', disputeId)
  await logAction(sb, 'admin_close_dispute', { dispute_id: disputeId })
}

export async function resolveReport(reportId: string) {
  await verifyAdminSession()
  const sb = getAdminClient()
  await sb.from('reports').update({ status: 'resolved' }).eq('id', reportId)
  await logAction(sb, 'admin_resolve_report', { report_id: reportId })
}

export async function dismissReport(reportId: string) {
  await verifyAdminSession()
  const sb = getAdminClient()
  await sb.from('reports').update({ status: 'dismissed' }).eq('id', reportId)
  await logAction(sb, 'admin_dismiss_report', { report_id: reportId })
}

export async function broadcastEmail(subject: string, body: string, target: string) {
  await verifyAdminSession()
  const sb = getAdminClient()
  // Here we would typically invoke an Edge Function to process the actual sending
  // For now we just log it as completed
  await logAction(sb, 'admin_broadcast_email', { subject, target, preview: body.slice(0, 100) })
  return { success: true }
}

export async function getUserEmails(filter: string, search: string, page: number, pageSize: number) {
  await verifyAdminSession()
  const sb = getAdminClient()
  
  let q = sb.from('admin_user_emails').select('*', { count: 'exact' })
  
  if (filter === 'brand') q = q.eq('role', 'brand')
  if (filter === 'influencer') q = q.eq('role', 'influencer')
  if (filter === 'verified') q = q.eq('is_verified', true)
  
  if (search) {
    q = q.or(`email.ilike.%${search}%,display_name.ilike.%${search}%`)
  }
  
  const { data, count } = await q.range((page - 1) * pageSize, page * pageSize - 1)
  
  return { users: data, total: count ?? 0 }
}

export async function adminDeleteMessage(messageId: string, roomId: string) {
  await verifyAdminSession()
  const sb = getAdminClient()
  
  // Fetch current payload first to preserve it
  const { data: msg } = await sb.from('messages').select('payload').eq('id', messageId).single()
  const currentPayload = msg?.payload || {}
  
  await sb.from('messages').update({ 
    content: 'Deleted by the admin as it violates the rules of the application',
    attachment_url: null,
    payload: { ...currentPayload, deleted_everyone: true }
  }).eq('id', messageId)
  
  await logAction(sb, 'admin_deleted_message', { message_id: messageId, room_id: roomId })
}

export async function getAiConfig() {
  await verifyAdminSession()
  const sb = getAdminClient()
  const { data } = await sb.from('platform_settings').select('value').eq('key', 'ai_config').single()
  return data?.value || { provider: 'gemini', model: 'gemini-1.5-pro', api_key: '' }
}

export async function updateAiConfig(config: { provider: string, model: string, api_key: string }) {
  const admin = await verifyAdminSession()
  const sb = getAdminClient()
  
  await sb.from('platform_settings').upsert({
    key: 'ai_config',
    value: config,
    description: 'AI chat configuration including API key and model',
    updated_at: new Date().toISOString(),
    updated_by: admin.id
  })
  
  await logAction(sb, 'admin_updated_ai_config', { provider: config.provider, model: config.model })
  return { success: true }
}
